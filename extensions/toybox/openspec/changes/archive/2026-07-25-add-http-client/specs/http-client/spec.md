# http-client 规格说明

## ADDED Requirements

### Requirement: HTTP Client command is registered

扩展 MUST 在 `package.json` 中以 `mode: "view"` 注册 `http-client` 命令，使 Raycast 能将其识别为根命令，并出现在 ToyBox 中央入口。

#### Scenario: Command is discoverable

- **WHEN** 开发者打开 Raycast 并输入 "HTTP"
- **THEN** `http-client` 命令出现在结果列表中

#### Scenario: Command appears in ToyBox hub

- **WHEN** 用户打开 `toybox` 中央入口
- **THEN** 列表中展示 HTTP Client 工具条目，选中后通过 `launchCommand` 启动 `http-client` 命令

### Requirement: Clipboard curl auto-import

`http-client` 命令打开时 MUST 读取剪贴板；若内容以 `curl` 开头，MUST 自动解析并填充请求表单，并在顶部提示「已从剪贴板导入 curl」。MUST 提供「重新解析」与「忽略」操作。若剪贴板非 curl 或为空，MUST 直接进入空白请求表单。

#### Scenario: Clipboard contains a curl command

- **WHEN** 用户打开命令且剪贴板内容以 `curl` 开头
- **THEN** 表单被自动填充为解析后的 Method/URL/Headers/Body，顶部显示导入成功提示

#### Scenario: Clipboard is empty or not curl

- **WHEN** 用户打开命令且剪贴板为空或非 curl 内容
- **THEN** 直接渲染空白请求表单，不显示导入提示

### Requirement: Curl parsing via curlconverter

curl 解析 MUST 使用 `curlconverter` 库，MUST NOT 自行实现解析器。MUST 支持 GET/POST/PUT/DELETE/PATCH、Cookie、Header、Body（JSON/FormData/multipart）、Basic Auth、Bearer、Query。解析失败时 MUST 返回结构化错误，不得抛异常。

#### Scenario: Parse a POST curl with headers and body

- **WHEN** 输入 `curl 'https://api.example.com' -H 'Authorization: Bearer xxx' -H 'Content-Type: application/json' -d '{"name":"Tom"}'`
- **THEN** 解析得到 method=POST、url=https://api.example.com、两条 Header、JSON body `{name:Tom}`

#### Scenario: Parse fails gracefully

- **WHEN** 输入无法被 `curlconverter` 解析的文本
- **THEN** 返回结构化错误结果，UI 展示解析失败原因，不抛异常

### Requirement: Request form editing

请求表单 MUST 使用 Raycast `Form`，包含 Method（GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS）、URL、Headers 键值编辑器、Query 键值编辑器、Body 编辑器、Timeout、Follow Redirect 开关与 Send 提交。

#### Scenario: Edit method and url

- **WHEN** 用户选择 Method 为 POST 并填写 URL
- **THEN** 提交时请求模型记录 method=POST 与该 URL

#### Scenario: Configure timeout and redirect

- **WHEN** 用户设置 Timeout 为 5000 并关闭 Follow Redirect
- **THEN** 发送请求时使用 5000ms 超时且不自动跟随重定向

### Requirement: Query and URL two-way synchronization

Query 键值编辑器与 URL MUST 双向同步：编辑 Query 时自动更新 URL 的 query string；编辑 URL 时自动解析其 query string 回填到 Query 列表。

#### Scenario: Edit query syncs to URL

- **WHEN** 用户在 Query 编辑器新增 `a=1` 与 `b=2`
- **THEN** URL 自动包含 `?a=1&b=2`

#### Scenario: Edit URL syncs to query

- **WHEN** 用户把 URL 改为 `https://api.test.com?a=1&b=2`
- **THEN** Query 编辑器自动回填 `a=1` 与 `b=2`

### Requirement: Header key-value editor

Headers MUST 使用键值编辑器，MUST NOT 使用单个 TextArea。MUST 支持新增、删除、编辑 Header，并支持单条启停。

#### Scenario: Add and remove headers

- **WHEN** 用户新增一条 Header 后又删除它
- **THEN** 最终 Headers 列表不包含该条

### Requirement: Body editing by type

Body MUST 支持 None / JSON / FormData / x-www-form-urlencoded / Raw Text 五种类型。JSON MUST 使用 TextArea 并支持格式化校验；FormData 与 x-www-form-urlencoded MUST 使用键值编辑器；Raw MUST 为纯文本。

#### Scenario: Format valid JSON body

- **WHEN** 用户在 JSON body 输入合法 JSON 并触发格式化
- **THEN** body 被美化缩进展示

#### Scenario: Invalid JSON body reported

- **WHEN** 用户在 JSON body 输入非法 JSON
- **THEN** 提示 JSON 解析失败，不发送请求

### Requirement: Send request with timeout and redirect

发送请求 MUST 使用原生 `fetch` 配合 `AbortController` 实现超时与取消，MUST 支持 HTTP/HTTPS、重定向跟随、Header/Query/Body 注入。请求结果 MUST 归一为结构化成功或错误结果。

#### Scenario: Successful request

- **WHEN** 用户对一个有效 URL 点击 Send
- **THEN** 请求成功后进入响应页，展示状态码与响应体

#### Scenario: Request timeout

- **WHEN** 请求超过设定 Timeout
- **THEN** 请求被中止，UI 展示超时错误

### Requirement: Response view with metadata

响应页 MUST 在顶部展示 Status、Duration、Response Size、Content-Type，并在下方提供 Body / Headers / Cookies / Raw 视图。

#### Scenario: View response metadata

- **WHEN** 请求成功进入响应页
- **THEN** 顶部展示如「200 OK / 231 ms / 12 KB / application/json」的摘要信息

### Requirement: JSON response viewer reuse

响应 Content-Type 为 `application/json` 时 MUST 支持进入现有 JSON Viewer 树形浏览。MUST NOT 仅以纯文本展示 JSON。

#### Scenario: Open JSON response in viewer

- **WHEN** 响应 Content-Type 为 application/json
- **THEN** 提供 Action 进入 JSON Viewer 树形浏览页

### Requirement: History with FIFO limit

请求成功后 MUST 自动保存到历史记录，历史 MUST 采用 FIFO 且最多保留 20 条，启动时 MUST 自动加载。历史 MUST 保存 Method、URL、Headers、Body、Status、Duration、CreatedAt。

#### Scenario: Successful request saved to history

- **WHEN** 一个请求成功完成
- **THEN** 该请求被追加到历史记录最前

#### Scenario: History capped at 20

- **WHEN** 历史已达 20 条且新请求成功
- **THEN** 最旧的一条被淘汰，历史总数仍为 20

### Requirement: Favorites unlimited

用户 MUST 能收藏请求，收藏列表独立于历史且不限数量。收藏 MUST 支持 Send Again、Edit、Delete。

#### Scenario: Favorite a request

- **WHEN** 用户对当前请求执行收藏
- **THEN** 该请求出现在收藏列表

### Requirement: History actions

历史列表 MUST 支持 Send Again、Copy curl、Delete 与 Clear History。

#### Scenario: Resend from history

- **WHEN** 用户在历史列表选择一条记录并执行 Send Again
- **THEN** 以该记录的请求模型重新发送请求

#### Scenario: Clear history

- **WHEN** 用户执行 Clear History
- **THEN** 所有历史记录被清空

### Requirement: Copy actions

响应页 MUST 支持 Copy Body、Copy Headers、Copy curl、Copy fetch、Copy axios。

#### Scenario: Copy response body

- **WHEN** 用户在响应页执行 Copy Body
- **THEN** 响应体被写入剪贴板

### Requirement: Export curl

MUST 能根据当前 Request 重新生成 curl 命令，包含 method、headers、body。

#### Scenario: Export curl from request

- **WHEN** 用户对一个 POST 请求执行 Export Curl
- **THEN** 生成包含 `-X POST`、`-H`、`-d` 的 curl 命令

### Requirement: Error handling via Detail

所有错误（非法 URL、JSON 解析失败、curl 解析失败、超时、DNS/TLS/网络错误、取消请求）MUST 统一在 Detail 视图展示，MUST NOT 抛未捕获异常。

#### Scenario: Invalid URL shows error detail

- **WHEN** 用户提交一个非法 URL
- **THEN** 展示错误 Detail 视图说明原因，并提供返回编辑操作

### Requirement: Storage via LocalStorage

历史与收藏 MUST 使用 Raycast `LocalStorage` 持久化。UI 层 MUST NOT 直接调用 `LocalStorage`，MUST 通过 `storage/` 层封装访问。

#### Scenario: History persists across launches

- **WHEN** 用户发送请求后关闭并重新打开命令
- **THEN** 历史记录仍然存在

### Requirement: History and favorites accessible from HTTP Client

历史与收藏 MUST 从 HTTP Client 内部通过 Action.Push 进入，MUST NOT 作为独立命令暴露到 Raycast 命令面板或 ToyBox 中央入口。

#### Scenario: Open history from HTTP Client

- **WHEN** 用户在 HTTP Client 请求页执行「历史记录」Action
- **THEN** push 到历史请求列表

#### Scenario: Open favorites from HTTP Client

- **WHEN** 用户在 HTTP Client 请求页执行「收藏列表」Action
- **THEN** push 到收藏请求列表
