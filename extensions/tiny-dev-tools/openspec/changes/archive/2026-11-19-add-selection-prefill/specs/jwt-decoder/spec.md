## MODIFIED Requirements

### Requirement: 三段式解码与空态
命令 SHALL 接受搜索栏粘贴的三段式 JWT（`header.payload.signature`）并实时解码；输入为空时 SHALL 显示 EmptyView 提示「粘贴 JWT；可选 `|| 密钥` 进行 HS256 验签」；输入无法解析为 JWT（段数不为三、Base64URL 非法、解码后非 JSON）时 SHALL 显示单行错误提示，不展示部分解码结果；命令挂载时若选中文本或剪贴板文本匹配 input-prefill 规范的 jwt-decoder detector，SHALL 自动预填搜索栏并立即解码（预填遵循 selection-prefill 的 edited 锁存与密钥不预填原则）。

#### Scenario: 粘贴即解码
- **WHEN** 用户粘贴合法 JWT
- **THEN** Header 行、状态行、claims 逐行立即展示，无需确认动作

#### Scenario: 非 JWT 输入
- **WHEN** 输入两段式（`a.b`）或四段式串
- **THEN** 显示「无法解析为 JWT（需要三段式 xxx.yyy.zzz）」错误行

#### Scenario: 打开命令
- **WHEN** 搜索栏为空
- **THEN** EmptyView 展示粘贴提示与 `||` 验签语法说明

#### Scenario: 选中 JWT 自动预填
- **WHEN** 用户选中合法 JWT 后打开命令
- **THEN** 搜索栏预填该 token，解码结果立即展示；用户输入后预填失效（含清空后不复活）
