# Word Memory Coach

一个独立的 Raycast 插件原型，用来把你复制过的英文单词沉淀成当天词库，并进一步生成练习文本和跟读音频。

## 现在已经实现的能力

- `One-Click Daily Review`
  - 一键补录最近剪贴板历史
  - 自动合并今天已有词库
  - 自动生成练习文本
  - 自动导出音频
  - 直接展示今天的学习结果
- `Capture Current Clipboard`
  - 读取当前剪贴板文本
  - 自动提取里面的英文单词
  - 保存到当天的词库
- `Import Recent Clipboard History`
  - 从 Raycast 最近的剪贴板历史补录单词
  - 受官方 API 限制，最多只能直接读取最近 6 条历史
- `Study Today's Words`
  - 查看今天已经积累的单词
  - 生成一段练习文本
  - 优先用 Raycast AI 生成更自然的段落
  - 如果没有 Raycast Pro / AI 权限，会回退到本地模板文本
  - 用 macOS `say` 导出 `.aiff` 音频

## 推荐使用方式

1. 最省事的方式是直接运行 `One-Click Daily Review`。
2. 它会自动从最近 clipboard history 补录单词，再生成当天练习段落和音频。
3. 如果你想把“今天整天见过的词”积累得更完整，还是建议顺手给 `Capture Current Clipboard` 绑定快捷键。
4. 如果漏记了，可以再跑一次 `Import Recent Clipboard History` 做补录。

## 开发启动

```bash
cd /Users/leonlu/Projects/ShareCompute/raycast/word-memory-coach
npm install
npm run dev
```

然后在 Raycast 里导入这个 extension 目录即可。

## 发布前还需要你提供的内容

- 把 `package.json` 里的 `author` 从当前占位值改成你自己的 Raycast 用户名
- 登录 Raycast 和 GitHub，执行 `npm run publish`
- 如果要上架到公开 Store，建议准备一张 Raycast 内的展示截图

## 设计说明

- 之所以没有“直接抓出今天全部 clipboard history”，是因为 Raycast 官方 `Clipboard.readText({ offset })` 目前只支持 `offset` 0 到 5。
- 为了尽量接近“当天全部单词”的目标，这个原型现在提供一个 `One-Click Daily Review` 命令，把“最近历史导入 + 当天词库 + 文章生成 + 音频导出”串成一步。
- 如果你希望词库覆盖一整天的所有生词，`Capture Current Clipboard` 仍然是最稳的长期积累入口。
- 词库数据存在 Raycast 的 `LocalStorage` 里，音频文件写到 extension 的 `supportPath/audio/` 目录。
