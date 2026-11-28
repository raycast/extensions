# case-converter Specification

## Purpose

定义命名格式转换命令的交互契约：任意格式输入（camelCase / PascalCase / snake_case / kebab-case / CONSTANT_CASE / dot.case 任一）实时输出六种格式全并排（无需选源格式，内部统一拆词），行级回车复制，拆词边界语义对齐 change-case v4 主流行为（连续大写归前词、数字贴前词、分隔符空段丢弃，双库 30 用例实测锚点背书），预填遵循 input-prefill 规范。

## Requirements

### Requirement: 全格式并排展示
命令 SHALL 提供单一搜索栏输入，并实时将输入转换为 6 种命名格式并排展示：camelCase、PascalCase、snake_case、kebab-case、CONSTANT_CASE、dot.case；转换 SHALL 无需选择源格式（内部统一拆词后按各格式拼装）；每行 SHALL 以 title 展示完整转换结果、subtitle 展示格式名。

#### Scenario: 输入即出全表
- **WHEN** 用户输入 `user_created_at`
- **THEN** 六行实时展示：`userCreatedAt` / `UserCreatedAt` / `user_created_at` / `user-created-at` / `USER_CREATED_AT` / `user.created.at`

#### Scenario: 任意格式输入等价
- **WHEN** 用户分别输入 `user_created_at`、`userCreatedAt`、`UserCreatedAt`
- **THEN** 三次输入的六行输出完全一致（拆词中间态相同）

#### Scenario: 打开命令空态
- **WHEN** 搜索栏为空且无预填
- **THEN** EmptyView 提示「输入或复制一个标识符，六种命名格式并排展示」

### Requirement: 行级复制动作
每个格式行 SHALL 提供复制动作（首选，回车触发）与粘贴到前台应用动作（项目惯例快捷键）；复制内容 SHALL 为该行显示的完整转换结果。

#### Scenario: 回车复制
- **WHEN** 用户在 kebab-case 行按回车
- **THEN** 剪贴板内容为 `user-created-at`（该行 title 全文）

### Requirement: 拆词与转换边界
拆词 SHALL 遵循以下规则（语义基准为 change-case v4 主流行为）：按 `_`、`-`、`.` 分隔且连续分隔符空段丢弃（`user__name` → `user`|`name`）；段内连续大写段归前词（`XMLHttpRequest` → `XML`|`Http`|`Request`）；数字与字母连续不切（`v2User` → `v2`|`User`）；拆不出词元的输入（如 `---`）SHALL 展示六行空 title 行（不切换到 EmptyView）。

#### Scenario: 连续大写归前词
- **WHEN** 用户输入 `XMLHttpRequest`
- **THEN** 拆词为 `XML`|`Http`|`Request`，camelCase 输出 `xmlHttpRequest`，snake_case 输出 `xml_http_request`

#### Scenario: 数字贴前词
- **WHEN** 用户输入 `user2Name`
- **THEN** 拆词为 `user2`|`name`，camelCase 输出 `user2Name`

#### Scenario: 连续分隔符
- **WHEN** 用户输入 `user__name`
- **THEN** 空段丢弃，输出等同 `user_name` 输入

#### Scenario: 无词元输入
- **WHEN** 用户输入 `---`（非空但拆不出词元）
- **THEN** 六行仍展示（title 为空串），不显示 EmptyView

### Requirement: 预填采纳
命令 SHALL 遵循 input-prefill 规范的 case-converter detector 采纳规则（形态为合法 case 的选中文本或剪贴板内容）。

#### Scenario: 复制预填
- **WHEN** 用户复制 `userCreatedAt` 后打开命令
- **THEN** 预填该文本并展示六格式结果

#### Scenario: 非法预填拒绝
- **WHEN** 剪贴板为 `hello world`（含空格）或 `123`（纯数字）
- **THEN** 不预填，命令以空态打开
