/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { getPreferenceValues } from "@raycast/api";
import os from "os";
import path from "path";

export const myPreferences = getPreferenceValues<Preferences>();

export const EASYDICT_TMP_DIR = path.join(os.tmpdir(), "raycast-easydict");

export const userAgent =
  "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";

export const networkTimeout = 15000;

export const EASYDICT_VERSION = "3.1.0";

const GITHUB_REPO = "https://github.com/tisfeng/Raycast-Easydict";

export const FEEDBACK_URL = `${GITHUB_REPO}/issues`;

export function getReleaseTagUrl(version: string): string {
  return `${GITHUB_REPO}/releases/tag/${version}`;
}

export const RELEASE_MARKDOWN = `
## [v${EASYDICT_VERSION}]

### ✨ New Features

- Added favorite words: save translation results and browse/manage them in the favorites list.
  - Thanks for @[TTsWorld](https://github.com/TTsWorld)

### 🔧 Maintenance

- Updated dependencies.

---

<details>
<summary>Recent Updates [v3.0.0]</summary>

### ⚠️ Behavioral Changes

- Removed built-in proxy detection; enable Raycast system proxy if needed.
- **Play Text** renamed to **Read Text** with updated shortcuts (\`Cmd+R\` / \`Cmd+Shift+R\`).

### ✨ New Features

- Windows platform support with native TTS and cross-platform audio.
- DeepL Traditional Chinese, hide language emoji option, independent Tencent/Volcano detection toggles.

### 💎 Improvements

- Full architecture and audio system refactor; streamlined project structure and dependencies.
- Optimized OpenAI translation prompts, Youdao dictionary formatting, and Linguee HTML parsing.
- Improved documentation, auto-generated docs, and build tooling.

### 🐞 Bug Fixes

- Fixed background resume text flash, Bing recursion/race conditions, audio playback conflicts, DeepLX failures, Georgian language support, and Apple Translate single-quote escaping.

</details>

---

## [v${EASYDICT_VERSION}]

### ✨ 新特性

- 新增收藏单词功能，支持保存翻译结果并在收藏列表中查看和管理。
  - 感谢 @[TTsWorld](https://github.com/TTsWorld)

### 🔧 维护

- 更新项目依赖项。

---

<details>
<summary>最近更新 [v3.0.0]</summary>

### ⚠️ 行为变更

- 移除内置系统代理检测，如需代理请开启 Raycast 的系统代理设置。
- **Play Text** 重命名为 **Read Text**，快捷键调整为 \`Cmd+R\` / \`Cmd+Shift+R\`。

### ✨ 新特性

- Windows 平台支持（含原生 TTS 与跨平台音频）。
- DeepL 繁体中文目标语言、隐藏语言 emoji 选项、腾讯/火山检测独立开关。

### 💎 改进

- 底层架构与音频系统全面重构，项目结构优化，移除冗余依赖。
- 优化 OpenAI 翻译提示词、有道词典格式、Linguee HTML 解析。
- 改进文档、自动文档生成与构建工具链。

### 🐞 修复

- 修复后台恢复时搜索文本闪现、必应翻译递归/竞态、音频播放冲突、DeepLX 翻译失败、格鲁吉亚语支持、Apple Translate 单引号转义等问题。

</details>

---
`;
