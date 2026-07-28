# 商店截图占位

Raycast Store 要求 view 类命令的扩展必须提供 `metadata/` 目录，内含 2000×1250 PNG（16:10）截图。

## 计划

| 文件                | 内容                                                     | 状态       |
| ------------------- | -------------------------------------------------------- | ---------- |
| `toybox-1.png`      | ToyBox 主入口列表（默认视图）                            | 待本地采集 |
| `json-viewer-1.png` | JSON 树形浏览页（带 JSONPath 复制 Action 展示）          | 待本地采集 |
| `mybatis-1.png`     | MyBatis 日志格式化结果页（展示复制 SQL / 复制为 INSERT） | 待本地采集 |

## 采集流程

1. 在仓库根目录执行 `npm run dev`，Raycast 加载扩展。
2. 在 Raycast v2 中：
   - 打开「Manage Extensions → toybox → Extension Preferences」找到或设置 `Capture Window` 快捷键（Raycast v1 也可用 `⌘` + `⇧` + `6` 之类的预设）。
   - 依次打开 ToyBox / JSON 查看器 / MyBatis 三个命令。
   - 按下 `Capture Window` 快捷键，**勾选「Save to Metadata」**后按相机按钮。
   - 截图会自动写入本目录，文件名形如 `toybox-1.png` 等。
3. `git add metadata/*.png` 与其它改动一并提交。

## 规范

- 尺寸：2000×1250，PNG。
- 比例：16:10。
- 主题：浅色 Raycast（统一背景）。
- 数量：1–6 张；推荐至少 3 张。
- 不要混入其它应用截图；不要展示敏感数据。

详见 <https://github.com/raycast/extensions/blob/main/docs/basics/prepare-an-extension-for-store.md#screenshots>。
