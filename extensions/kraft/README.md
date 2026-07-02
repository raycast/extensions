# Kraft

Kraft 是一个 Raycast AI 工具集合。它不绑定具体厂商，核心模型是：

```text
Input -> Workflow -> Output -> Renderer -> Conversation
```

默认入口是 `Kraft`。打开后先看到工具菜单，而不是某个翻译或厂商设置页。

Raycast 原生 Preferences 只保留一个位置提示。真实设置都在 Kraft 菜单内部完成，避免绕过校验流程。

## 安装

```shell
git clone git@github.com:kilingzhang/raycast-kraft.git
cd raycast-kraft
npm install
npm run dev
```

## API Settings

在 Kraft 菜单里打开 `API Settings`，配置 API 连接信息：

- `API Base`
- `API Key`
- `API Compatible`

当前支持两种兼容类型：

- `OpenAI`：模型列表 `/models`，聊天 `/chat/completions`
- `Anthropic`：模型列表 `/models`，聊天 `/messages`

保存配置前，Kraft 会先校验真实可用性：

1. 请求模型列表。
2. 取第一个模型。
3. 发送一次 `hi` chat。
4. 通过后才保存配置并返回下一步。

## App Settings

在 Kraft 菜单里打开 `App Settings`，配置应用级行为：

- 默认输出语言。
- 选中文本、剪贴板自动加载。
- 输入加载后自动运行工具。
- 结果自动复制、元数据默认展示、历史数量。
- SOCKS5 代理。
- OCR 语言、识别级别、自定义词。

## 工具设置

每个工具都有自己的 `Tool Settings`：

- `Model`：从模型列表选择。
- `Custom Model`：模型列表不可用或需要手动指定时使用。
- `Prompt`：该工具自己的提示词，支持变量。
- `Renderer`：Markdown 或纯文本。
- `Conversation`：是否开启多轮追问。
- `Workflow`：当前工具的处理步骤预览。

保存工具设置时，也会对当前选择的模型发送一次 `hi` chat。校验失败时不会保存。

可用变量：

```text
{{input}}, {{source}}, {{sourceLang}}, {{targetLang}}, {{toolName}},
{{isoTime}}, {{localeTime}}, {{timezone}}, {{conversation}}
```

## 默认工具

- Translate
- Polish Writing
- Summarize
- Explain
- Ask Selected Text
- Ask Clipboard
- Ask Screenshot

## 开发

```shell
npm test
npm run lint
npm run build
```
