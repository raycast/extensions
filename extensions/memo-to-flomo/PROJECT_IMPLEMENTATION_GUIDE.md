# MEMO to flomo 项目实现指南

这份文档用于把当前项目完整迁移到一个新项目中。新的 AI 或开发者只要按照本文执行，就能快速做出同等功能的 Raycast 扩展。

## 1. 项目定位

MEMO to flomo 是一个 Raycast extension，用于把用户在 Raycast 表单中输入的闪念发送到 flomo 的 incoming webhook API。

核心目标：

- 打开 Raycast 命令后直接写 MEMO。
- 支持 Markdown 输入，尤其是加粗、无序列表、有序列表。
- 支持输入一个或多个标签，并自动规范成 flomo 可识别的 `#tag` 格式。
- 支持保存最近使用过的标签，用户可以从标签历史中快速选择。
- 支持首次使用时保存 flomo MEMO API URL。
- 不在设置 API URL 时发送测试 MEMO，避免产生无意义内容。
- 明确不是剪藏或网页裁剪工具，剪切、摘录、整理内容的动作和发送动作保持分离。

适用场景：

- 用户想用 Raycast 快速记录想法到 flomo。
- 用户希望保留 flomo 标签工作流。
- 用户需要比浏览器或 flomo 客户端更轻量的输入入口。

## 2. 技术栈和项目类型

项目类型：Raycast extension。

运行环境：

- Raycast extension runtime。
- React 组件模型。
- TypeScript 严格模式。

主要依赖：

- `@raycast/api`：Raycast UI、LocalStorage、Toast、Preferences。
- `@raycast/utils`：当前项目已安装，但核心代码暂未使用。
- `typescript`：类型检查。
- `eslint` 和 `@raycast/eslint-config`：代码规范。
- `prettier`：格式化。

推荐脚本：

```json
{
  "build": "ray build",
  "dev": "ray develop",
  "lint": "ray lint",
  "fix-lint": "ray lint --fix",
  "publish": "npx @raycast/api@latest publish"
}
```

TypeScript 配置要点：

- `strict: true`
- `isolatedModules: true`
- `jsx: react-jsx`
- `module: commonjs`
- `target: ES2023`
- `lib: ES2023`

## 3. Raycast manifest 规格

`package.json` 需要包含 Raycast manifest 字段。

推荐配置：

```json
{
  "name": "memo-to-flomo",
  "title": "MEMO to flomo",
  "description": "快捷发送 Markdown 闪念到 Flomo，支持历史标签",
  "icon": "extension-icon.png",
  "author": "your_name",
  "platforms": ["macOS", "Windows"],
  "categories": ["Applications"],
  "commands": [
    {
      "name": "send-memo",
      "title": "Send Memo",
      "subtitle": "Flomo",
      "description": "向 Flomo 发送 Markdown 闪念",
      "mode": "view"
    }
  ],
  "preferences": [
    {
      "name": "api",
      "title": "MEMO API URL",
      "description": "在 flomo 设置页面获取 API URL",
      "type": "textfield",
      "required": true
    }
  ]
}
```

注意：

- 命令文件名要和 command name 对应，当前实现为 `src/send-memo.tsx`。
- icon 放在 `assets/extension-icon.png`。
- `preferences.api` 是首选 API URL 来源，但代码也支持 LocalStorage 保存的 API URL，作为首次使用表单的兼容路径。

## 4. 文件结构

建议保持以下结构：

```text
.
├── assets/
│   └── extension-icon.png
├── src/
│   └── send-memo.tsx
├── CHANGELOG.md
├── README.md
├── eslint.config.js
├── package.json
├── package-lock.json
└── tsconfig.json
```

每个文件的职责：

- `src/send-memo.tsx`：唯一业务入口，包含表单 UI、API URL 处理、标签处理、flomo 发送逻辑、列表续写逻辑。
- `README.md`：面向用户，说明安装、配置和使用方式。
- `CHANGELOG.md`：记录用户可感知的功能变化。
- `package.json`：Raycast manifest、依赖、脚本。
- `tsconfig.json`：TypeScript 编译配置。
- `eslint.config.js`：Raycast ESLint 配置。

## 5. 功能规格

### 5.1 首次使用和 API URL

扩展启动后读取两个 API URL 来源：

1. Raycast Preferences 中的 `api`。
2. Raycast LocalStorage 中的 `flomoApiUrl`。

优先级：

```text
preferences.api > LocalStorage.flomoApiUrl
```

当不存在可用 API URL 时，显示 API URL 保存表单。

保存时要求：

- 去除首尾空格。
- 必须是合法 URL。
- 协议必须是 `https:` 或 `http:`。
- 保存到 LocalStorage key `flomoApiUrl`。
- 保存成功后显示成功 Toast。

API URL 保存表单字段：

- `api`：TextField，标题为 `MEMO API URL`，placeholder 为 `https://flomoapp.com/iwh/...`。

Action Panel：

- `Save API URL`
- `Open Extension Preferences`

### 5.2 MEMO 发送表单

当存在可用 API URL 时，显示 MEMO 表单。

字段：

- `content`：TextArea，标题为 `MEMO`，开启 `enableMarkdown`。
- `tag`：TextField，标题为 `Tag`，用户用空格分隔标签。
- `tagHistory`：TagPicker，仅当存在历史标签时显示。

辅助说明：

- MEMO 字段下方说明：`支持加粗、无序列表、有序列表的 Markdown 语法。`
- Tag 字段下方说明：`空格分隔标签，在标签历史中可快捷输入。`

Action Panel：

- `Send Memo`
- `Clear Tag History`
- `Open Extension Preferences`

发送快捷键使用 Raycast 默认 submit 行为，README 中说明为 `Command + Enter`。

### 5.3 Markdown 内容

发送给 flomo 的内容是 Markdown。

发送 body：

```json
{
  "content": "用户输入内容\n#tag1 #tag2",
  "content_type": "markdown"
}
```

内容拼接规则：

- `content` 先 trim。
- 标签规范化后拼成一行。
- 如果存在标签，则最终内容为：

```text
trimmed content
#tag1 #tag2
```

- 如果不存在标签，则最终内容只包含 `trimmed content`。

### 5.4 标签解析和规范化

用户可以输入：

```text
raycast flomo
#raycast #flomo
raycast #flomo
```

都应规范成：

```text
#raycast #flomo
```

解析规则：

- 按任意空白字符切分。
- 每个标签 trim。
- 移除开头所有 `#`。
- 过滤空字符串。
- 使用 `Set` 去重。
- 标签顺序保留第一次出现的顺序。

不要处理逗号分隔，不要支持带空格标签。当前项目的标签模型就是空格分隔的简单标签。

### 5.5 标签历史

标签历史保存在 Raycast LocalStorage。

Storage key：

```text
flomoTagHistory
```

存储格式：

```json
["raycast", "flomo", "markdown"]
```

读取规则：

- 如果没有值，返回空数组。
- 如果 JSON 解析失败，返回空数组。
- 如果解析结果不是数组，返回空数组。
- 每个元素转成字符串，再经过标签规范化。
- 去重并过滤空字符串。

更新规则：

- 发送成功后才更新标签历史。
- 新发送的标签放在历史前面。
- 历史中已有标签去重。
- 最近使用的标签排在最前。
- 标签历史保存数量不设上限。

显示规则：

- `Quick Tags` 显示全部历史标签。
- 使用 `Form.TagPicker` 展示。
- 每个 item 的 value 是无 `#` 标签名，title 是 `#标签名`。

清空规则：

- Action Panel 中提供 `Clear Tag History`。
- 执行后 remove LocalStorage key `flomoTagHistory`。
- 清空内存里的 `tagHistory` 和 `selectedHistoryTags`。
- 显示成功 Toast。

### 5.6 标签输入和历史选择联动

需要维护两个状态：

- `tag`：TextField 中的原始标签输入字符串。
- `selectedHistoryTags`：TagPicker 中选中的历史标签数组。

当用户直接改 `tag` 输入框时：

- 更新 `tag`。
- 重新解析 `tag`。
- 如果某个标签存在于当前可见历史标签中，则把它同步为 `selectedHistoryTags`。

当用户从 TagPicker 选择历史标签时：

- 当前 `tag` 中不属于可见历史的标签视为手动输入标签，需要保留。
- 把手动输入标签和选中的历史标签合并。
- 用空格拼回 `tag` 字符串。

这样可以避免用户手动输入的标签被 TagPicker 覆盖。

### 5.7 列表自动续写

MEMO TextArea 支持一个轻量的列表续写体验。

当用户在 TextArea 末尾按回车时：

- 如果上一行是无序列表，如 `- item`、`* item`、`+ item`，下一行自动补 `- `。
- 如果上一行是有序列表，如 `1. item`，下一行自动补 `2. `。
- 保留缩进。
- 如果上一行本身只是空列表标记，如 `- ` 或 `1. `，再次回车时删除空标记，退出列表。

关键函数：

- `getNextOrderedListMarker(line)`
- `getUnorderedListMarker(line)`
- `trimEmptyListMarker(content)`
- `continueListAfterTrailingNewline(previousContent, nextContent)`

判断只在以下条件成立时触发：

```text
nextContent endsWith "\n"
nextContent === previousContent + "\n"
```

这样可以避免粘贴、多字符编辑、非尾部编辑时错误插入列表符号。

## 6. flomo API 约定

发送方式：

```text
POST <MEMO_API_URL>
Content-Type: application/json
```

请求体：

```json
{
  "content": "markdown content",
  "content_type": "markdown"
}
```

响应处理：

- 如果 HTTP status 不是 2xx，抛出 `Flomo responded with HTTP <status>`。
- 尝试解析 JSON。
- 如果 JSON 中的 `code` 不等于 `0`，抛出 `message`，没有 message 时使用 `Flomo returned an unexpected response`。
- 成功后清空内容和标签输入，清空已选历史标签。

Toast 文案：

- 发送中：`Sending memo to Flomo...`
- 成功：`Memo sent to Flomo`
- 失败标题：`Failed to send memo`
- 空内容：`Write a memo before sending`
- API URL 无效：`Invalid API URL`

## 7. 状态设计

React state：

```ts
const [storedApi, setStoredApi] = useState("");
const [content, setContent] = useState("");
const [tag, setTag] = useState("");
const [selectedHistoryTags, setSelectedHistoryTags] = useState<string[]>([]);
const [tagHistory, setTagHistory] = useState<string[]>([]);
const [isLoading, setIsLoading] = useState(false);
const [isInitializing, setIsInitializing] = useState(true);
```

启动时执行：

```text
load LocalStorage.flomoApiUrl
load LocalStorage.flomoTagHistory
normalize both
set isInitializing false
```

表单 loading：

- 发送表单使用 `isLoading`。
- API URL 保存表单使用 `isInitializing`。

重复提交保护：

- `handleSubmit` 开头检查 `isLoading`。
- 发送期间设置 `isLoading = true`。
- finally 中恢复 `isLoading = false`。

## 8. 从零实现步骤

### Step 1: 创建 Raycast extension

使用 Raycast 官方方式创建 extension，选择 TypeScript 和 view command。

安装依赖后确保 `package.json` 包含：

- `@raycast/api`
- `@raycast/utils`
- TypeScript、ESLint、Prettier 相关 dev dependencies。

### Step 2: 配置 manifest

把 command name 设为：

```text
send-memo
```

创建入口文件：

```text
src/send-memo.tsx
```

添加 Preferences：

```text
api: MEMO API URL
```

### Step 3: 实现工具函数

先实现纯函数：

- `normalizeApiUrl`
- `isValidApiUrl`
- `normalizeTagValue`
- `parseTags`
- `buildTagLine`
- `buildContent`
- `updateTagHistory`
- `parseTagHistory`
- `getNextOrderedListMarker`
- `getUnorderedListMarker`
- `trimEmptyListMarker`
- `continueListAfterTrailingNewline`

这些函数不依赖 UI，方便后续测试和维护。

### Step 4: 实现 flomo 发送

实现 `sendMemo(api, content)`：

- POST JSON。
- 设置 `Content-Type: application/json`。
- body 包含 `content` 和 `content_type: "markdown"`。
- 处理 HTTP 错误和 flomo 业务错误。

### Step 5: 实现启动加载

在 `useEffect` 中读取：

- `LocalStorage.getItem<string>("flomoApiUrl")`
- `LocalStorage.getItem<string>("flomoTagHistory")`

设置：

- `storedApi`
- `tagHistory`
- `isInitializing = false`

最终 API URL：

```ts
const api = preferenceApi || storedApi;
```

### Step 6: 实现 API URL 表单

当没有 API URL 时渲染 API URL 保存表单。

提交时：

- 校验 URL。
- 保存到 LocalStorage。
- 更新 state。
- toast 成功或失败。

### Step 7: 实现 MEMO 表单

当有 API URL 时渲染 MEMO 表单。

必须包含：

- Markdown TextArea。
- 标签 TextField。
- 条件渲染的 TagPicker。
- Action Panel 中的发送、清空标签历史、打开设置。

提交时：

- 校验 API URL。
- 生成最终内容。
- 阻止空内容。
- 发送到 flomo。
- 成功后更新标签历史并清空输入。
- 失败时保留用户输入，方便修改后重试。

### Step 8: 实现标签历史联动

实现 `handleTagChange` 和 `handleHistoryTagsChange`。

关键原则：

- 手动输入的标签不能因为选择历史标签而丢失。
- TagPicker 只控制当前可见历史标签。
- 内部存储和 TagPicker value 都使用无 `#` 标签名。

### Step 9: 实现列表续写

TextArea 的 `onChange` 不直接 `setContent(nextContent)`，而是：

```ts
setContent(continueListAfterTrailingNewline(content, nextContent));
```

确保只在用户在末尾输入单个换行时续写。

### Step 10: 补充 README 和 CHANGELOG

README 至少包含：

- 项目作用。
- Setup。
- Usage。
- 标签规范化说明。
- 标签历史说明。
- API URL 和标签历史管理说明。

CHANGELOG 至少包含：

- 初始版本。
- 标签历史。
- 多标签。
- Markdown 编辑。
- 自动列表续写。

## 9. 验收标准

基础验收：

- `npm run lint` 通过。
- `npm run build` 通过。
- Raycast 中可以打开 `Send Memo` 命令。
- Preferences 中配置 API URL 后直接进入发送表单。
- 如果没有 Preferences API URL，可以在首次使用表单中保存 API URL。

发送验收：

- 空 MEMO 不能发送，并显示失败 Toast。
- API URL 非法时不能发送，并显示失败 Toast。
- flomo API 返回非 2xx 时显示失败 Toast。
- flomo API 返回 `{ "code": 0 }` 时显示成功 Toast。
- 成功后清空 MEMO、Tag、TagPicker 选择。
- 失败后保留 MEMO 和 Tag，方便用户重试。

标签验收：

- 输入 `raycast flomo` 时发送 `#raycast #flomo`。
- 输入 `#raycast #flomo` 时不重复添加 `#`。
- 重复标签会去重。
- 发送成功后标签进入历史。
- 最近使用标签排在前面。
- 标签历史保存数量不设上限。
- `Quick Tags` 显示全部历史标签。
- 清空标签历史后 TagPicker 消失。

列表验收：

- 输入 `- item` 后回车，下一行自动出现 `- `。
- 输入 `* item` 后回车，下一行自动出现 `- `。
- 输入 `+ item` 后回车，下一行自动出现 `- `。
- 输入 `1. item` 后回车，下一行自动出现 `2. `。
- 输入带缩进的列表时保留缩进。
- 在空列表项后再回车时退出列表。

## 10. 关键边界和取舍

当前项目刻意保持简单：

- 不提供 flomo API URL 自动发现。
- 不发送测试 MEMO。
- 不支持复杂标签语法。
- 不支持附件、图片、网页剪藏。
- 不做本地 memo 草稿持久化。
- 不做远程标签同步。

这些取舍能让扩展保持轻量，核心交互集中在快速记录上。

如果后续要扩展，优先考虑：

- 给纯函数补单元测试。
- 增加草稿自动保存。
- 增加最近 MEMO 模板。
- 增加从剪贴板读取内容的 Action。
- 增加选中文本发送到 flomo 的 command。

## 11. 可直接复用的实现骨架

新的项目可以把核心实现收敛到一个文件中：

```text
src/send-memo.tsx
```

文件结构建议：

```text
imports
types
constants
list continuation helpers
tag helpers
content builder
api url helpers
sendMemo
Command component
  preferences
  state
  useEffect loadSavedState
  handleSaveApi
  handleSubmit
  handleContentChange
  handleTagChange
  handleHistoryTagsChange
  handleClearTagHistory
  render send form or api setup form
```

核心常量：

```ts
const API_STORAGE_KEY = "flomoApiUrl";
const TAG_HISTORY_STORAGE_KEY = "flomoTagHistory";
const UNORDERED_LIST_MARKER = "- ";
```

核心类型：

```ts
type FormValues = {
  content: string;
  tag?: string;
};

type Preferences = {
  api?: string;
};

type ApiFormValues = {
  api: string;
};
```

## 12. 新项目提示词

如果要把这份项目交给另一个 AI 从零实现，可以直接使用下面的提示词：

```text
请用 TypeScript 实现一个 Raycast extension，名字叫 MEMO to flomo。

目标：用户在 Raycast 中输入 Markdown MEMO，选择或输入标签，然后通过 flomo incoming webhook API 发送到 flomo。

要求：
1. 使用 @raycast/api 的 Form、ActionPanel、Action、LocalStorage、showToast、Toast、getPreferenceValues、openExtensionPreferences。
2. command name 为 send-memo，command title 为 Send Memo，入口文件为 src/send-memo.tsx。
3. package.json 中配置一个 required textfield preference：api，标题为 MEMO API URL。
4. API URL 优先从 Preferences 读取，其次从 LocalStorage key flomoApiUrl 读取。
5. 如果没有 API URL，显示保存 API URL 的表单，保存时校验必须是 http 或 https URL。
6. 如果有 API URL，显示 MEMO 发送表单：Markdown TextArea、Tag TextField、可选 Tag History TagPicker。
7. 标签用空格分隔，允许用户输入有 # 或无 # 的标签，发送前统一规范成 #tag 形式，并去重。
8. 发送内容格式为：trim 后的 MEMO，加换行，再加标签行。没有标签时只发送 MEMO。
9. 请求 flomo API：POST API URL，Content-Type application/json，body 为 { content, content_type: "markdown" }。
10. HTTP 非 2xx 或响应 JSON code 不等于 0 时显示失败 Toast。
11. 发送成功后清空 MEMO、Tag、TagPicker 选择，并把本次标签保存到 LocalStorage key flomoTagHistory。
12. 标签历史按最近使用排序、去重，保存和显示数量不设上限。
13. Action Panel 提供 Clear Tag History 和 Open Extension Preferences。
14. TextArea 支持列表自动续写：无序列表统一续写 "- "，有序列表数字递增，保留缩进，空列表项后回车退出列表。
15. 提供 README 和 CHANGELOG，说明设置、使用、标签历史、Markdown 和列表续写。
16. 运行 npm run lint 和 npm run build，确保通过。

保持实现简单，不要加入附件、网页剪藏、远程标签同步或草稿持久化。
```
