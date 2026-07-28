# 新增原生 HTTP Client（即用即走）

## Why

开发者在日常工作中频繁需要快速验证一个 API 请求：把浏览器里复制的 `curl` 命令转成可编辑的请求、补一个 Header、看一眼返回体。Postman / Insomnia 这类工具启动慢、操作链路长、需要维护 Workspace。ToyBox 已经聚合了 JSON 查看器、MyBatis 格式化器等「即用即走」小工具，缺少一个同样轻量的 HTTP 请求工具。本次新增一个原生 Raycast HTTP Client：打开即读剪贴板、自动解析 curl、一页完成请求、自动落历史，让一次 API 验证在秒级完成。

## What Changes

- 新增 `http-client` 命令（`mode: view`）：打开时自动读取剪贴板，若内容以 `curl` 开头则用 `curlconverter` 解析为结构化请求并填充表单，顶部提示「已从剪贴板导入 curl」，支持「重新解析 / 忽略」。
- 新增请求表单页（`Form`）：Method（GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS）、URL、Headers 键值编辑器、Query 键值编辑器（与 URL 双向同步）、Body 编辑器（None / JSON / FormData / x-www-form-urlencoded / Raw Text）、Timeout、Follow Redirect，底部 Send。
- 新增 Body 编辑能力：JSON 支持格式化校验；FormData / x-www-form-urlencoded 用键值编辑器；Raw 为纯文本。
- 新增 HTTP 服务层：基于原生 `fetch` + `AbortController` 实现超时与取消，支持 HTTPS/HTTP、重定向跟随、Header/Query/Body 注入。
- 新增响应页：顶部展示 Status / Duration / Size / Content-Type，下方提供 Body / Headers / Cookies / Raw 四个视图；`application/json` 可进入现有 JSON Viewer 树形浏览；`image/*` 展示图片信息；`application/pdf` 支持保存。
- 新增历史记录（FIFO，最多 20 条）与收藏（不限数量），均使用 `LocalStorage` 持久化，启动时自动加载。
- 新增 Copy 能力：响应页支持 Copy Body / Copy Headers / Copy curl / Copy fetch / Copy axios。
- 新增导出 curl：根据当前 Request 重新生成 curl 命令。
- 新增 `history` 与 `favorites` 两个子命令入口。
- 新增依赖 `curlconverter`。
- 同步更新 `src/tools.ts` 注册表与 `package.json` 命令清单，并在 `CHANGELOG.md` 记录。

## Capabilities

### New Capabilities

- `http-client`: 即用即走的原生 Raycast HTTP Client，覆盖剪贴板 curl 自动解析、请求表单编辑、发送、响应查看、JSON Viewer 复用、历史记录、收藏、复制与导出全链路。

### Modified Capabilities

_（无）_

## Impact

- 影响代码：新增 `src/commands/`、`src/components/`（HTTP 相关）、`src/history/`、`src/storage/`、`src/services/`、`src/models/`、`src/utils/` 等目录与文件（详见 design.md 目录结构）；不改动现有 `json`、`mybatis`、`toybox` 命令的实现逻辑。
- 影响命令面板：`package.json` 新增 `http-client`、`history`、`favorites` 三个命令。
- 影响中央入口：`src/tools.ts` 追加 `http-client` 工具条目，使其出现在 ToyBox 主入口列表。
- 影响依赖：新增运行时依赖 `curlconverter`；HTTP 请求使用 Node 原生 `fetch`，不引入 axios。
- 影响规格：新增 `openspec/specs/http-client/spec.md`（通过本变更归档后落盘）。
