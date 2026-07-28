# HTTP Client 技术设计

## Context

ToyBox 现有三个能力：`toybox-hub`（中央入口）、`json-viewer`（JSON 树形浏览）、`mybatis-sql-formatter`（MyBatis 日志转 SQL）。本次新增 `http-client`，目标是在 Raycast 内提供一个「即用即走」的 HTTP 请求工具。

约束：
- 运行环境为 Raycast 内嵌 Node.js，支持原生 `fetch`、`AbortController`、`URL` 等全局 API。
- 只允许使用 Raycast 原生组件（`Form` / `List` / `Detail` / `ActionPanel` / `Action`），禁止 WebView / iframe / HTML / 第三方 UI 框架。
- 现有 `JsonNodePage` / `JsonValuePage` / `JsonTree` 可直接复用于 JSON 响应浏览。
- 存储 API 为 `LocalStorage`（异步键值存储，按扩展隔离）。

## Goals / Non-Goals

**Goals:**

- 打开命令即读剪贴板、自动解析 curl、一页完成请求与响应查看，秒级完成一次 API 验证。
- 业务逻辑（解析、网络、存储、导出）与 UI 完全分离，便于测试与维护。
- 复用现有 JSON Viewer 处理 `application/json` 响应。
- 历史记录 FIFO 最多 20 条；收藏不限数量；均落 `LocalStorage`，启动自动加载。
- 全部错误（非法 URL、JSON 解析失败、curl 解析失败、超时、DNS/TLS/网络错误、取消）统一在 `Detail` 视图展示，不抛未捕获异常。

**Non-Goals:**

- 不实现 Postman 式 Workspace / Environment / Script / Mock Server / 请求集合 / 批量测试。
- 不实现请求 diff、变量插值、自动化测试。
- 不引入 `axios`；HTTP 仅用原生 `fetch`。

## Decisions

### Decision 1: curl 解析采用自实现纯 JS 解析器

需求首选 `curlconverter`，但它依赖原生模块 `tree-sitter-bash`（.node 文件），Raycast 的 esbuild 打包环境无法内联原生模块，运行时也无 `node_modules` 可加载 `external` 包（经 `ray build` 验证报错），因此不可用。备选 `parse-curl` 能力较弱（不支持 multipart / Basic Auth / Bearer），无法满足需求。

故改为自实现一个纯 JS 的 shell tokenizer + curl 选项解析器（`services/curlParser.ts`）：tokenizer 处理单引号 / 双引号 / 反斜杠转义 / 行尾续行，能正确拆分大多数真实 curl 命令；选项解析覆盖 `-X` / `-H` / `-d` / `-F` / `-u` / `-b` / `-G` / `--url` 等，支持 JSON / FormData / urlencoded / Raw body 推断、Basic Auth 转 Authorization header、Query 与 URL 同步。命令替换（`$(...)`）等动态语法按字面量处理，是已知限制。

这是 Raycast 环境约束下的务实选择：不引入原生模块依赖，保证 `ray build` 可打包、运行时可加载。

### Decision 2: HTTP 请求使用原生 `fetch` + `AbortController`

Raycast Node 环境原生支持 `fetch`，无需额外依赖。超时通过 `AbortController` + `setTimeout` 实现：到时调用 `controller.abort()`，捕获 `AbortError` 归类为「超时/取消」。重定向由 `fetch` 的 `redirect` 选项控制（`follow` / `manual`），对应表单的 Follow Redirect 开关。不引入 `axios`，减少体积与依赖维护成本。

### Decision 3: 分层目录结构，业务逻辑与 UI 分离

遵循需求第 16 条的目录划分：

```
src/
  commands/        命令入口（薄壳，只做导航串联）
    http-client.tsx
    history.tsx
    favorites.tsx
  components/      UI 组件（只管渲染与交互，不直接访问网络/存储）
    RequestForm.tsx
    HeaderEditor.tsx
    QueryEditor.tsx
    BodyEditor.tsx
    ResponseView.tsx
    JsonViewer.tsx
  history/         历史列表 UI
    HistoryList.tsx
  storage/         持久化（LocalStorage 封装）
    historyStorage.ts
    favoriteStorage.ts
  services/        纯业务逻辑（无 React 依赖）
    http.ts
    curlParser.ts
    curlExporter.ts
  models/          领域类型
    request.ts
    response.ts
    types.ts
  utils/           纯函数工具
    json.ts
    query.ts
    url.ts
```

命令入口只做「读剪贴板 → 渲染表单 → push 响应页」的导航串联；网络请求、curl 解析/导出、存储读写全部在 `services/` 与 `storage/`，可被任意 UI 复用。

### Decision 4: 数据模型设计

- `RequestModel`：`method` / `url` / `headers: HeaderEntry[]` / `query: QueryEntry[]` / `bodyType` / `body` / `timeout` / `followRedirect`。Headers 与 Query 用 `{ key, value, enabled }` 三元组数组，支持单条启停。
- `ResponseModel`：`status` / `statusText` / `headers` / `cookies` / `body` / `contentType` / `duration` / `size`。
- `HistoryModel`：`id` / `request: RequestModel` / `responseSummary` / `createdAt`，FIFO 上限 20。
- `FavoriteModel`：`id` / `request: RequestModel` / `title` / `createdAt`，不限数量。

Headers/Query 用数组而非 Record，是因为需要保留顺序、支持重复 key、支持单条启停——Record 无法表达这些。

### Decision 5: Query 与 URL 双向同步

- 编辑 Query → 用 `utils/query.ts` 的 `buildQueryString` 拼接到 URL 的 search 部分。
- 编辑 URL → 用 `utils/url.ts` 的 `parseUrl` 拆出 search，再用 `query.ts` 的 `parseQueryString` 回填到 Query 数组。
- 同步在表单的 `onChange` 中即时完成，保证两个输入源始终一致。URL 的 pathname/port 等部分保持不变，仅替换 search。

### Decision 6: JSON 响应复用现有 JSON Viewer

响应 `Content-Type` 为 `application/json` 时，把响应体文本经现有 `parseJson` + `buildNode` 构建为 `JsonNode` 根节点，`navigation.push(<JsonNodePage node={root} root={root} />)` 复用树形浏览与复制能力。`ResponseView` 提供一个「在 JSON Viewer 中打开」Action 进入该页面。

### Decision 7: 存储策略

- 历史：`LocalStorage` 单 key（`http-history`）存 `HistoryModel[]`，`pushHistory` 时 unshift 新条目并 `slice(0, 20)` 截断，FIFO 淘汰最旧。
- 收藏：`LocalStorage` 单 key（`http-favorites`）存 `FavoriteModel[]`，不限数量。
- `storage/` 层封装读写与容错（`getItem` 返回 `undefined` 时回退空数组），UI 层不直接调用 `LocalStorage`。

### Decision 8: 错误处理统一 Detail

所有错误（URL 非法、JSON 解析失败、curl 解析失败、超时、DNS/TLS/网络错误、用户取消）在 `services/http.ts` 与 `curlParser.ts` 中归一为结构化 `{ ok: false, error }` 结果，UI 层据此 `navigation.push` 一个错误 `Detail` 视图，展示原因与「返回编辑」Action，不抛异常、不崩溃。

## Risks / Trade-offs

- **[Risk] `curlconverter` 输出与内部模型字段不完全一致** -> 在 `curlParser.ts` 做适配层，把库输出的 `headers`（对象）、`data`（字符串/对象）等映射到 `HeaderEntry[]` 与 body，屏蔽差异。
- **[Risk] 大响应体一次性渲染卡顿** -> 文本响应在 `Detail` 中截断展示并提供复制完整内容；JSON 响应走懒构建树（现有 `JsonNodePage` 已支持 100k+ 节点）。
- **[Risk] `LocalStorage` 单值体积上限** -> 历史只存 `RequestModel` + `responseSummary`（status/duration/size），不存完整响应体，避免 20 条历史撑爆单值。
- **[Trade-off] 不引入 axios** -> 失去拦截器、自动 JSON 转换等能力，但换得更小体积与零额外依赖；`fetch` 足以覆盖需求。
- **[Trade-off] Headers/Query 用数组而非 Record** -> 序列化体积略大，但换来顺序保留、重复 key、单条启停能力，符合 HTTP 语义。
