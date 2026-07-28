## 1. 依赖与脚手架

- [x] 1.1 安装运行时依赖 `curlconverter`
- [x] 1.2 创建 `src/{commands,components,history,storage,services,models,utils}` 目录结构

## 2. 数据模型层

- [x] 2.1 新建 `src/models/types.ts`：定义 `HttpMethod`、`BodyType`、`HeaderEntry`、`QueryEntry`
- [x] 2.2 新建 `src/models/request.ts`：定义 `RequestModel` 及默认值工厂
- [x] 2.3 新建 `src/models/response.ts`：定义 `ResponseModel`、`HistoryModel`、`FavoriteModel`

## 3. 工具函数层

- [x] 3.1 新建 `src/utils/url.ts`：`parseUrl`、`setQueryString`、`formatBytes` 等纯函数
- [x] 3.2 新建 `src/utils/query.ts`：`parseQueryString`、`buildQueryString`、Query 与 URL 双向转换
- [x] 3.3 新建 `src/utils/json.ts`：`tryParseJson`、`prettyJson`、`isJsonContentType`

## 4. 服务层

- [x] 4.1 新建 `src/services/curlParser.ts`：用 `curlconverter` 把 curl 字符串适配为 `RequestModel`，返回结构化结果
- [x] 4.2 新建 `src/services/curlExporter.ts`：把 `RequestModel` 反向生成 curl 命令，并生成 fetch/axios 代码片段
- [x] 4.3 新建 `src/services/http.ts`：用 `fetch` + `AbortController` 发送请求，归一化 `ResponseModel` 与错误

## 5. 存储层

- [x] 5.1 新建 `src/storage/historyStorage.ts`：FIFO 最多 20 条，封装 `LocalStorage` 读写与容错
- [x] 5.2 新建 `src/storage/favoriteStorage.ts`：不限数量，封装 `LocalStorage` 读写与容错

## 6. UI 组件层

- [x] 6.1 新建 `src/components/HeaderEditor.tsx`：Headers 键值编辑器（新增/删除/编辑/启停）
- [x] 6.2 新建 `src/components/QueryEditor.tsx`：Query 键值编辑器，与 URL 双向同步
- [x] 6.3 新建 `src/components/BodyEditor.tsx`：按 BodyType 切换 None/JSON/FormData/urlencoded/Raw
- [x] 6.4 新建 `src/components/RequestForm.tsx`：组合 Method/URL/Headers/Query/Body/Timeout/Redirect 的请求表单
- [x] 6.5 新建 `src/components/ResponseView.tsx`：响应页，展示 Status/Duration/Size/ContentType 与 Body/Headers/Cookies/Raw
- [x] 6.6 新建 `src/components/JsonViewer.tsx`：复用 `JsonNodePage` 包装 JSON 响应浏览入口

## 7. 历史列表与命令入口

- [x] 7.1 新建 `src/history/HistoryList.tsx`：历史列表 UI，支持 Send Again/Copy curl/Delete/Clear History
- [x] 7.2 新建 `src/commands/http-client.tsx`：主命令，读剪贴板 -> curl 解析 -> RequestForm -> ResponseView
- [x] 7.3 新建 `src/commands/history.tsx`：历史子命令入口
- [x] 7.4 新建 `src/commands/favorites.tsx`：收藏子命令入口

## 8. 注册与文档

- [x] 8.1 在 `package.json` 的 `commands` 数组追加 `http-client`、`history`、`favorites` 三个命令
- [x] 8.2 在 `src/tools.ts` 追加 `http-client` 工具条目（含 keywords）
- [x] 8.3 在 `CHANGELOG.md` 的 `[Unreleased]` 段记录本次变更

## 9. 校验与收尾

- [x] 9.1 运行 `npx tsc --noEmit`，确认无类型错误
- [x] 9.2 运行 `npm run lint`，确认无 ESLint 错误
- [x] 9.3 运行 `npx prettier --check src/`，确认格式合规
- [x] 9.4 运行 `openspec validate add-http-client`，确认 delta spec 合法
- [x] 9.5 运行 `openspec archive add-http-client --yes`，把 delta spec 合并到主规格
