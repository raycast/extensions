/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { getPreferenceValues } from "@raycast/api";
import os from "os";
import path from "path";

export const myPreferences = getPreferenceValues<Preferences>();

export const EASYDICT_TMP_DIR = path.join(os.tmpdir(), "raycast-easydict");

export const userAgent =
  "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";

export const networkTimeout = 15000;

export const EASYDICT_VERSION = "3.5.0";

const GITHUB_REPO = "https://github.com/tisfeng/Raycast-Easydict";

export const FEEDBACK_URL = `${GITHUB_REPO}/issues`;

export function getReleaseTagUrl(version: string): string {
  return `${GITHUB_REPO}/releases/tag/${version}`;
}

export const RELEASE_MARKDOWN = `
## [v${EASYDICT_VERSION}]

### ✨ New Features

#### Windows OCR Screenshot Translation

- **OCR Translate** now works on Windows: drag-select a screen area, recognize the text locally with the built-in Windows OCR engine, and query it in Easydict. Install an OCR language pack in Windows Settings to recognize languages other than your Windows display language.
- Added the **Select OCR Language** command to pin an installed Windows OCR language; the default **Automatic (Windows profile)** uses the OCR languages from your Windows language settings.

Thanks to [@duckieeeduck](https://github.com/duckieeeduck) for the original Windows implementation ([raycast/extensions#30884](https://github.com/raycast/extensions/pull/30884))!

### 🐞 Bug Fixes

- Query Cache, AI Query Cache, AnkiConnect URL, and Anki Deck no longer appear in the first-run preferences form. These are optional settings, and leaving them empty falls back to their defaults.

---

<details>
<summary>Recent Updates [v3.4.0]</summary>

### ✨ New Features

#### Add Favorite Words to Anki

- Added **Add to Anki** and **Add All to Anki** actions to Favorite Words, sending cards to Anki through the AnkiConnect add-on. Cards include the word, phonetic, pronunciation audio, translations, and dictionary explanations.
- Added the **Add Favorites to Anki Automatically** preference (off by default). Removing a favorite does not delete its Anki card.

Thanks to [@cassieliang6709](https://github.com/cassieliang6709) for contributing this feature!

### 💎 Improvements

- Improved content page rendering: headwords and pronunciations use a text layout that wraps naturally instead of a fixed-size image; saved favorites no longer repeat the language direction.
- **Clear Query Cache** is hidden while both Query Cache and AI Query Cache are Off, since there is nothing to clear.
- Favorites with unreadable saved data can be recovered or exported instead of being discarded.

### 🐞 Bug Fixes

- Fixed the Requery All Services shortcut conflict: read actions keep \`Cmd+R\` / \`Cmd+Shift+R\`, and Requery All Services uses \`Cmd+Option+R\` (\`Ctrl+Alt+R\` on Windows).
  - Thanks to [@qizidog](https://github.com/qizidog)
- Resolve the Serbian preference alias (\`sr\` → \`sr-Latn\`) when reading language preferences.
- Keep the active query running when an AI provider falls back from unsupported JSON output.
- Preserve AI model loading when a provider's catalog refreshes.

</details>

---

## [v${EASYDICT_VERSION}]

### ✨ 新特性

#### Windows OCR 截图翻译

- **OCR Translate** 现已支持 Windows：框选屏幕区域，使用系统内置的 Windows OCR 引擎在本地识别文字，并在 Easydict 中查询。如需识别 Windows 显示语言以外的语言，请在 Windows 设置中安装对应的 OCR 语言包。
- 新增 **Select OCR Language** 命令，可将某个已安装的 Windows OCR 语言固定为使用语言；默认的 **Automatic (Windows profile)** 会使用 Windows 语言设置中的 OCR 语言。

感谢 [@duckieeeduck](https://github.com/duckieeeduck) 提供 Windows 版原始实现（[raycast/extensions#30884](https://github.com/raycast/extensions/pull/30884)）。

### 🐞 修复

- Query Cache、AI Query Cache、AnkiConnect URL 和 Anki Deck 不再出现在首次运行的偏好设置表单中。这些均为可选设置，留空时会回退到默认值。

---

<details>
<summary>最近更新 [v3.4.0]</summary>

### ✨ 新特性

#### 收藏单词添加到 Anki

- 在收藏单词中新增 **Add to Anki** 和 **Add All to Anki** 操作，通过 AnkiConnect 插件把卡片发送到 Anki。卡片包含单词、音标、发音音频、翻译和词典释义。
- 可以通过新增的 **Add Favorites to Anki Automatically** 设置自动同步收藏单词到 Anki（默认关闭）。删除收藏不会删除对应的 Anki 卡片。

感谢 [@cassieliang6709](https://github.com/cassieliang6709) 贡献此功能。

### 💎 改进

- 优化内容页渲染：单词与音标改用可自然换行的文本排版，取代固定尺寸图片；收藏详情不再重复显示语言方向。
- 当 **Query Cache** 与 **AI Query Cache** 均为 **Off** 时隐藏 **Clear Query Cache**（此时没有缓存可清除）。
- 收藏数据无法读取时可以选择恢复或导出，而不是直接丢弃。
  - 感谢 [@qizidog](https://github.com/qizidog)

### 🐞 修复

- 修复 **Requery All Services** 的快捷键冲突：朗读相关操作保留 \`Cmd+R\` / \`Cmd+Shift+R\`，**Requery All Services** 改用 \`Cmd+Option+R\`（Windows 为 \`Ctrl+Alt+R\`）。
- 修正塞尔维亚语偏好别名（\`sr\` → \`sr-Latn\`）的解析。
- AI Provider 从不受支持的 JSON 输出回退时，保持正在进行的查询继续运行。
- Provider 目录刷新时，保持 AI 模型加载状态。

</details>

---
`;
