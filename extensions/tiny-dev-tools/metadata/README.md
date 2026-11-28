# Store Screenshots — 截图指引

Raycast Store 商品页截图目录。**提审前必须至少 1 张**（建议 4~6 张）。

## 规格硬要求（审核 bot 会校验）

| 项 | 要求 |
|---|---|
| 格式 | PNG |
| 尺寸 | **2000 × 1250**（16:10，Retina 下即 2x 截图） |
| 命名 | `screenshot-1.png`、`screenshot-2.png`…（数字递增，不可跳号） |
| 数量 | 1~6 张 |
| 内容 | 必须是真实运行界面（不是设计稿）；英文化后的 UI |

## 截图方法（官方推荐）

用 **Raycast 内置 Window Capture**：聚焦要截的命令窗口 → 打开动作面板（⌘K）→ 搜 "Capture Window" 运行——自动去除开发模式图标。

Retina 屏直接截即为 2x；非 Retain 可先放大窗口再截，最终保证 2000×1250（可用 `sips -Z 1250 screenshot-x.png` 辅助，或 Preview 调整）。

> 校验尺寸：`sips -g pixelWidth -g pixelHeight screenshot-1.png`

## 建议截图清单（按差异化优先级）

| # | 命令 | 画面 | 为什么 |
|---|---|---|---|
| screenshot-1 | JSON to Types | 粘贴 JSON 后四语言行 + 类型代码（TypeScript 选中态） | 独有功能，最有辨识度 |
| screenshot-2 | JSON to Types | 切换到 Go/Java 的 struct/class 画面 | 四语言能力一眼可见 |
| screenshot-3 | JWT Decoder | 完整 token 解码画面（状态行 + claims 逐行） | 展示信息密度 |
| screenshot-4 | JWT Decoder | 验签 Form（⌘V 打开，公钥栏有预填） | 独有：非对称验签 |
| screenshot-5 | Case Converter | 输入标识符后六格式并排 | 干净利落的全并排 |
| screenshot-6 | Password Generator | 预设行 + 密码行（强度标签） | 展示预设交互 |

> 优先截"截图里能看出别人没有的东西"：预填提示行（Auto-loaded from selection）、四语言行、验签面板。timestamp/base64 这类单窗口价值低，不截。

## 截完后的自查

```bash
ls metadata/*.png          # 命名连续
sips -g pixelWidth -g pixelHeight metadata/screenshot-1.png
```

然后 `npm run publish` 时该目录会被自动带上。
