/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { getPreferenceValues } from "@raycast/api";
import os from "os";
import path from "path";

export const myPreferences = getPreferenceValues<Preferences>();

export const EASYDICT_TMP_DIR = path.join(os.tmpdir(), "raycast-easydict");

export const userAgent =
  "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";

export const networkTimeout = 15000;

export const EASYDICT_VERSION = "3.6.0";

const GITHUB_REPO = "https://github.com/tisfeng/Raycast-Easydict";

export const FEEDBACK_URL = `${GITHUB_REPO}/issues`;

export function getReleaseTagUrl(version: string): string {
  return `${GITHUB_REPO}/releases/tag/${version}`;
}

export const RELEASE_MARKDOWN = `
## [v${EASYDICT_VERSION}]

### ⚠️ Behavioral Changes

- Removed Tencent Cloud TMT translation and language detection. To translate with Tencent, add the **Tencent TokenHub** preset in **Manage Providers** and enter a separate TokenHub API key. The preset defaults to \`hy-mt2-lite\`. Previously saved Tencent translations remain available in **Favorite Words**.

### ✨ New Features

- Added **Wiktionary Dictionary**, a free dictionary that fills gaps such as English ↔ Danish. It shows available target-language translations for English words and labels English definitions when they serve as a fallback. Results can include IPA pronunciation, recorded audio, word forms, and usage examples. The setup screen now shows all three built-in dictionary switches. Wiktionary is off by default and can be enabled in the extension settings.
  - Thanks to [@d3faulter](https://github.com/d3faulter)!

---

<details>
<summary>Recent Updates [v3.5.0]</summary>

### ✨ New Features

#### Windows OCR Screenshot Translation

- **OCR Translate** now works on Windows: drag-select a screen area, recognize the text locally with the built-in Windows OCR engine, and query it in Easydict. Install an OCR language pack in Windows Settings to recognize languages other than your Windows display language.
- Added the **Select OCR Language** command to pin an installed Windows OCR language; the default **Automatic (Windows profile)** uses the OCR languages from your Windows language settings.

Thanks to [@duckieeeduck](https://github.com/duckieeeduck) for the original Windows implementation ([raycast/extensions#30884](https://github.com/raycast/extensions/pull/30884))!

### 🐞 Bug Fixes

- Query Cache, AI Query Cache, AnkiConnect URL, and Anki Deck no longer appear in the first-run preferences form. These are optional settings, and leaving them empty falls back to their defaults.

</details>

---

## [v${EASYDICT_VERSION}]

### ⚠️ 行为变更

- 移除了腾讯云机器翻译（TMT）的文本翻译和语种识别。若要使用腾讯翻译，请在 **Manage Providers** 添加 **Tencent TokenHub** 预设，并填写独立的 TokenHub API Key。默认模型为 \`hy-mt2-lite\`。此前保存的腾讯翻译仍可在 **Favorite Words** 中查看。

### ✨ 新特性

- 新增 **Wiktionary Dictionary**，无需 API 密钥，可补充英语与丹麦语等语言对的词典查询。查英语单词时会显示可用的目标语言译文，并为作为回退的英文释义加上标注。词条可包含国际音标、发音录音、词形变化和用法示例。设置界面现在会显示三个内置词典的开关。Wiktionary 默认关闭，可在扩展设置中启用。
  - 感谢 [@d3faulter](https://github.com/d3faulter)！

---

<details>
<summary>最近更新 [v3.5.0]</summary>

### ✨ 新特性

#### Windows OCR 截图翻译

- **OCR Translate** 现已支持 Windows：框选屏幕区域，使用系统内置的 Windows OCR 引擎在本地识别文字，并在 Easydict 中查询。如需识别 Windows 显示语言以外的语言，请在 Windows 设置中安装对应的 OCR 语言包。
- 新增 **Select OCR Language** 命令，可将某个已安装的 Windows OCR 语言固定为使用语言；默认的 **Automatic (Windows profile)** 会使用 Windows 语言设置中的 OCR 语言。

感谢 [@duckieeeduck](https://github.com/duckieeeduck) 提供 Windows 版原始实现（[raycast/extensions#30884](https://github.com/raycast/extensions/pull/30884)）。

### 🐞 修复

- Query Cache、AI Query Cache、AnkiConnect URL 和 Anki Deck 不再出现在首次运行的偏好设置表单中。这些均为可选设置，留空时会回退到默认值。

</details>

---
`;
