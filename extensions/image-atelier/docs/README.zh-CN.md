# Image Atelier

一个自用的 Raycast AI Extension：通过自己的 OpenAI 兼容图片 API 生成、编辑图片。提供聊天中的 `@image-atelier` 工具入口和独立的 **Generate or Edit Image** 表单。

基于 Raycast 官方 AI Extension 协议独立实现，未复制官方内置 `@gpt_image` 源码，也不关联 Raycast 官方。当前仅用于本地开发，尚未发布。

## 本地安装

需要已安装的 Raycast、Node.js 22.14 或更新版本，以及支持 Images API 的服务。

```sh
npm install
npm run dev
```

在 Raycast 中搜索 **Generate or Edit Image**，首次运行时填写扩展设置：

| 设置           | 填写方式                                                          |
| -------------- | ----------------------------------------------------------------- |
| API Base URL   | 例如 `https://your-provider.example/v1`，保留服务商要求的版本路径 |
| API Key        | 在 Raycast 密码设置中填写，不写入源码                             |
| Save Images To | 可选保存目录；默认 `~/Pictures/Image Atelier/`                    |

然后在 **Generate or Edit Image** 中按 `⌘K`，选择 **Choose Default Model**：自动获取模型列表，选择默认图片模型并保存。聊天工具和生成表单使用同一个默认模型；也可从生成表单的 **Choose Default Model** 动作进入配置。

模型优先展示带有图片输出元数据的项目（Image output）和按名称识别的候选项（Suggested）。候选识别不证明接口兼容性；可启用 **Show all models** 或输入模型 ID。发现失败或服务不支持 `/models` 时仍可手动保存模型。刷新列表仅发起 GET 请求，不生成测试图片。

默认模型按 API 地址和密钥组合分别保存；更换服务商或密钥后需要重新选择。密钥本身不写入模型存储。修改地址、密钥或保存位置请使用 **Edit API and Save Location**，更换服务商后重新打开配置命令。

Base URL 会追加 `/images/generations` 或 `/images/edits`；也能接受以其中一个完整路径结尾的 URL。支持 HTTPS，以及供本地服务使用的 localhost HTTP。

运行 `npm run dev` 后，在 AI Chat 的 `@` 菜单选择 **Image Atelier**，或搜索 **Ask Image Atelier**。聊天入口依赖你当前账户的 Raycast AI 工具调用能力；独立表单直接调用你配置的 API。

示例：

- `@image-atelier 生成一张雨夜东京街头的电影感图片`
- `把刚才生成的图片改成白天，保留构图`（在相同对话中继续）

## 生成和编辑

在表单中填写提示词后提交，即可生成图片。添加一张本地 PNG、JPEG 或 WebP 作为参考图后，会自动改用编辑接口。结果页支持打开、复制图片、在 Finder 中显示、另存为、复制路径和继续编辑。**Save As…** 可以选择文件夹和文件名，保留原图；同名文件不会被覆盖，另存为不转换图片格式。

AI 编辑工具接收绝对本地路径，可以使用之前工具返回的路径。Raycast 聊天附件不保证暴露本地路径：如果无法读取附件，请保存到本地后提供路径，或通过表单选择文件。当前支持单张参考图，未实现遮罩、多图输入、流式预览或 Responses/Chat Completions 图片协议。

尺寸和质量默认不发送，让服务商自行选择。可选尺寸和质量需模型支持；遇到 400 等错误时先恢复 Provider Default 并检查模型 ID。

API 密钥仅用于配置的图片 API 请求；下载服务商返回的图片 URL 时不携带密钥。提示词和编辑参考图会发送到你配置的服务商。输出保存到本地，不会自动删除；默认目录为 `~/Pictures/Image Atelier/`。

## API 兼容范围

- 生成：`POST /images/generations`，JSON，包含 `model`、`prompt`、`n: 1`，可选 `size` 和 `quality`。
- 编辑：`POST /images/edits`，multipart/form-data，包含以上字段以及 `image` 文件。
- 鉴权：`Authorization: Bearer <API Key>`。
- 返回：`data[0].b64_json` 或 `data[0].url`（HTTPS 直链，无重定向），支持 PNG、JPEG、WebP。
- 超时：生成请求 5 分钟，下载 1 分钟。不自动重试，避免重复调用计费。

不兼容的网关协议需要添加适配；这不是任意服务商的通用图片客户端。工具返回的本地 Markdown 图片能否在 AI Chat 内直接显示取决于 Raycast 的渲染支持，绝对路径始终会返回；独立表单提供预览和打开动作。

## 验证

```sh
npm run build
npm run typecheck
npm test
npm run lint
```

测试使用本地模拟服务，覆盖生成请求、编辑上传、本地输出、错误处理和配置校验，不会产生付费图片调用。真实服务需要填入自己的地址、密钥与模型后验证。

`ray build` 会写入本机 Raycast 扩展目录。`ray lint` 会联网验证 manifest 与 author；`package.json` 的作者为 `mikeboly`。API 地址、密钥和模型默认留空，由每位用户自行配置。

参考：[创建 AI Extension](https://developers.raycast.com/ai/create-an-ai-extension)、[工具及 AI 指令](https://developers.raycast.com/ai/learn-core-concepts-of-ai-extensions)、[扩展配置](https://developers.raycast.com/information/manifest)。
