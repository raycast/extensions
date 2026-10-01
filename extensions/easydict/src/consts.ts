/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { getPreferenceValues } from "@raycast/api";
import os from "os";
import path from "path";

export const myPreferences = getPreferenceValues<Preferences>();

export const EASYDICT_TMP_DIR = path.join(os.tmpdir(), "raycast-easydict");

export const userAgent =
  "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";

export const networkTimeout = 15000;

export const EASYDICT_VERSION = "3.4.0";

const GITHUB_REPO = "https://github.com/tisfeng/Raycast-Easydict";

export const FEEDBACK_URL = `${GITHUB_REPO}/issues`;

export function getReleaseTagUrl(version: string): string {
  return `${GITHUB_REPO}/releases/tag/${version}`;
}

export const RELEASE_MARKDOWN = `
## [v${EASYDICT_VERSION}]

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

---

<details>
<summary>Recent Updates [v3.3.0]</summary>

### ✨ New Features

#### Optional Query Caching

- Added local caching for completed dictionary lookups and translations, with separate **Query Cache** and **AI Query Cache** settings. Both default to **Off** and offer **Words Only** and **All Text** modes.
- Language detection can reuse confirmed results for inputs covered by either cache setting.
- Cached results show a clock indicator. Use **Requery All Services** to fetch fresh results, **Regenerate AI Result** to refresh one AI provider, or **Clear Query Cache** to remove cached results.

### 💎 Improvements

- Improved result previews, detailed views, and saved favorites with clearer headings, pronunciation and language direction, and compact tables for short word translations, word forms, and phrases.
- Google Translate now supports full translations of text longer than 1,830 characters, with paragraph breaks preserved.

### 🐞 Bug Fixes

- Fixed Google Translate failures caused by the previous web translation endpoint.
- Favorites now show language codes when **Flags are not languages** is enabled, keeping the source and target languages distinguishable.

</details>

---

## [v${EASYDICT_VERSION}]

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

---

<details>
<summary>最近更新 [v3.3.0]</summary>

### ✨ 新特性

#### 可选查询缓存

- 新增已完成的词典查询和翻译结果的本地缓存，可分别通过 **Query Cache** 和 **AI Query Cache** 设置。两项默认均为 **Off**，可选择 **Words Only** 或 **All Text** 模式。
- 当任一缓存设置允许缓存当前输入时，语言检测也可复用已确认的检测结果。
- 缓存结果会显示时钟标识。可使用 **Requery All Services** 重新查询所有服务、**Regenerate AI Result** 重新生成单个 AI Provider 的结果，或使用 **Clear Query Cache** 清除查询缓存。

### 💎 改进

- 优化结果预览、详情页和收藏内容的排版，让标题、音标和翻译方向更清晰，并用紧凑表格展示简短的单词译文、词形和短语。
- Google 翻译现在支持完整翻译超过 1,830 字符的长文本，并保留段落换行。

### 🐞 修复

- 修复旧网页翻译接口导致的 Google 翻译失败。
- 启用 **Flags are not languages** 后，收藏列表会显示语言代码，便于区分源语言和目标语言。

</details>

---
`;
