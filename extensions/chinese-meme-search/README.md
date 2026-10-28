# 中文表情包搜索

从腾讯／搜狗输入法表情接口搜索图片，在 Raycast 中预览并回车复制原图。无需 API Key，不依赖微信登录。这个源并非经确认的微信客户端同源接口，没有公开的稳定性承诺。

## 使用

先在 Raycast 设置中找到 **Fallback Commands**（后备命令），添加 **Search Memes**；旧版可运行 **Manage Fallback Commands**。

1. 唤起 Raycast，直接输入「大胆」等关键词。
2. 在后备命令中选中「Search Memes」，按回车进入图片结果。
3. 方向键选中图片，按回车复制，再到聊天窗口粘贴。

后备命令的显示由 Raycast 决定，通常在主搜索没有匹配项时出现。若关键词命中了其他应用或命令，可直接选「Search Memes」，在其关键词参数栏输入文字后回车。也可以为此命令设置 `meme` 别名，用 `meme` 加关键词直接搜索。以上流程不需要 Command+Enter。

结果页顶部不再提供本页过滤，避免误以为是在搜索图库。Esc 返回主搜索。⌘] 下一页、⌘[ 上一页；⌘K 菜单提供复制图片链接和查看原图。

## 开发

需要 macOS、Raycast 和 Node.js 22.18+。

```sh
npm ci
npm run dev
```

`ray develop` 将扩展导入本机 Raycast；也可运行 Import Extension 选择此目录。保留源代码目录。

```sh
npm run build
npm run typecheck
npm test
```

## 验证与限制

2026-10-28：使用当前实现连续查询「大胆」「开心」「熊猫头」「打工」，分别得到 19、18、20、19 张图片，首图均下载成功；「大胆」第二页返回19张且首图不同。本轮没有遇到429，不代表未来不会限流。此前也验证过该接口 GIF 下载成功。

构建、TypeScript 检查及4项回归测试通过。支持 fallbackText 和根搜索关键词参数，复制为首个默认操作。未自动验证本机 Raycast 后备命令开关、键盘操作及微信/大象中的实际粘贴效果。

接口每页可能少于请求数量，是否继续翻页按 hasMore/endFlag 判断。HTTP或接口错误明确显示，不自动重试。

图片下载到扩展支持目录的 images 文件夹后，通过 Raycast 文件剪贴板 API 复制，保留 GIF 文件格式。目标软件可能作为图片或文件接收。复制过的图片保留在该目录。

## 数据源

当前接口：`https://h5api.sginput.qq.com/wxbq/search`，图片来自 `biaoqing.gtimg.com`。未找到正式开放文档，不能承诺与微信搜索有相同图库或排序。

旧版本 SOOGIF 页面源在实测中出现429，已移除，当前不会调用它。

## 自定义源

在扩展设置的 Custom Source JSON 填入配置，留空恢复默认源。支持无需认证的 GET JSON 接口；不执行脚本，不支持 HTML 抓取或自定义认证头。不要在配置中填写密钥。

```json
{"url":"https://example.com/search?q={query}&page={page}","results":"data.items","image":"url","title":"title","hasMore":"data.hasMore"}
```

`{query}` 自动 URL 编码；`{page}` 从1开始。results 是结果数组的点分路径，image/title 是每项中的字段路径。数组在根节点时 results 填空字符串；数组项本身为图片 URL 时 image 填空字符串。title 和 hasMore 可省略。只有 hasMore 指向 true 或数字1且 URL 包含 {page} 时提供下一页。

命令名称为 Search Memes，已索引关键词 meme。若希望输入 meme 后直接进入参数栏，请在 Raycast 设置中把该命令的 Alias 设为 meme；扩展无法在 manifest 中替你设定用户别名。
