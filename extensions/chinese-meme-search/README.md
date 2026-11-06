# Meme Search

通过你配置的 JSON 图片接口搜索表情包，在 Raycast 中预览并按回车复制原图。支持静态图片和 GIF。

## 使用

首次使用前，在扩展设置的 **Custom Source JSON** 中配置获准使用的数据源，格式见下方。此扩展不内置图库，也不提供默认搜索接口。

1. 在 Raycast 中选择 **Meme Search**，输入关键词并按回车。
2. 方向键选图，按回车复制，到聊天窗口粘贴。
3. ⌘] 下一页、⌘[ 上一页；⌘K 菜单提供复制图片链接和查看原图。

若希望直接输入关键词后选择此命令，可在 Raycast 设置的 **Fallback Commands** 中添加 **Meme Search**。后备命令通常在主搜索没有匹配项时出现；命中其他应用或命令时，可选中 Meme Search 后填写关键词参数。也可以为命令设置 `meme` 别名。以上流程均不需要 Command+Enter。

结果页不提供本页过滤；按 Esc 返回主搜索后换词。复制时保留原始图片格式，目标软件可能将其作为图片或文件接收。已复制图片存放在扩展支持目录的 images 文件夹中。

## 数据源

使用你拥有或已获准接入的图片搜索服务。搜索词会发送至配置的接口，预览和复制时会请求接口返回的图片地址。请求失败会显示错误，不会自动重试。

本扩展不内置腾讯／搜狗未公开接口。自定义配置不会授予第三方接口或图片的使用许可；请遵循来源服务对调用、下载和图片使用的要求。

## 自定义源

在扩展设置的 **Custom Source JSON** 填入配置。支持无需认证的 GET JSON 接口，不支持 HTML 抓取、脚本或自定义认证头。不要在配置中填写密钥。清空配置后停止搜索，并提示重新配置。

以下为配置格式示例，`example.com` 不是实际可用的图库：

```json
{
  "url": "https://example.com/search?q={query}&page={page}",
  "results": "data.items",
  "image": "url",
  "title": "title",
  "hasMore": "data.hasMore"
}
```

- `{query}` 自动 URL 编码；`{page}` 从 1 开始。
- `results` 是结果数组的点分路径，`image` 和 `title` 是数组项中的字段路径。
- 数组在根节点时 `results` 填空字符串；数组项本身为图片 URL 时 `image` 填空字符串。
- `title` 和 `hasMore` 可省略。只有 `hasMore` 指向 `true` 或数字 `1`，且 URL 包含 `{page}` 时提供下一页。

上述配置可读取以下响应：

```json
{
  "data": {
    "items": [{ "url": "https://example.com/meme.gif", "title": "开心" }],
    "hasMore": false
  }
}
```
