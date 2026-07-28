/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { getPreferenceValues } from "@raycast/api";
import os from "os";
import path from "path";

export const myPreferences = getPreferenceValues<Preferences>();

export const EASYDICT_TMP_DIR = path.join(os.tmpdir(), "raycast-easydict");

export const userAgent =
  "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";

export const networkTimeout = 15000;

export const EASYDICT_VERSION = "3.0.0";

const GITHUB_REPO = "https://github.com/tisfeng/Raycast-Easydict";

export const FEEDBACK_URL = `${GITHUB_REPO}/issues`;

export function getReleaseTagUrl(version: string): string {
  return `${GITHUB_REPO}/releases/tag/${version}`;
}

export const RELEASE_MARKDOWN = `
## [v${EASYDICT_VERSION}]

### ⚠️ 行为变更

- 移除了内置的系统代理检测与转发机制。如果您依赖操作系统的代理设置，请开启 **Raycast → Settings → Advanced → Use System Proxy Settings**。
- 将 **Play Text** 重命名为 **Read Text**。快捷键变更为 \`Cmd+R\`，并为 **Read Result Text** 增加了独立的快捷键：\`Cmd+Shift+R\`。

### ✨ 新特性

- 新增 Windows 平台支持，包含原生的 TTS 语音合成与跨平台音频播放能力。
- 新增繁体中文作为 DeepL 目标语言支持。
- 新增选项：支持隐藏语言选择和标题中的国家/地区 emoji。
- 为腾讯和火山翻译的语言检测功能新增了独立的开关选项，以便更好地管理 API 额度。

### 💎 改进

#### 架构与性能

- 全面重构底层架构，提升可维护性、扩展性与长期稳定性。
- 重构音频系统，统一管理下载、播放与语音合成逻辑。
- 重组项目结构，通过移除不必要的依赖并使用原生实现替代，进一步减小插件体积。

#### 翻译体验

- 优化 OpenAI 翻译提示词，以更少的 token 消耗提供更好的翻译质量。
- 改进有道词典的格式化逻辑。
- 优化 Linguee 的 HTML 解析逻辑。
- 提升跨翻译提供商的语言处理一致性。

#### 开发者体验

- 改进项目文档和仓库组织。
- 引入自动文档生成，保持语言支持表格与代码实现的一致性。
- 改进构建工具链与开发自动化。

### 🐞 修复

- 修复扩展从后台恢复时，搜索文本偶尔会闪现的历史遗留问题。
- 修复必应翻译在特定边界情况下因递归过深导致的查询失败，并解决并发请求中的竞态问题。
- 修复部分词典连续播放音频时产生的播放冲突与缓存覆盖问题。
- 修复 DeepLX 翻译错误
- 修复格鲁吉亚语虽然能在偏好设置中选择但无法正常翻译的问题，已在内部补全了对该语言的完整支持。
- 修复了包含单引号的文本发送给 Apple Translate 时被错误转义的问题。

---

### ⚠️ Behavioral Changes

- Removed the built-in system proxy detection and forwarding mechanism. If you rely on your operating system's proxy settings, please enable **Raycast → Settings → Advanced → Use System Proxy Settings**.
- Renamed **Play Text** to **Read Text**. The shortcut is now \`Cmd+R\`, and **Read Result Text** now has its own shortcut: \`Cmd+Shift+R\`.

### ✨ New Features

- Added Windows support, including native TTS voice synthesis and cross-platform audio playback.
- Added Traditional Chinese as a supported target language for DeepL.
- Added an option to hide country/region emojis in language selectors and titles.

### 💎 Improvements

#### Architecture & Performance

- Rebuilt the underlying architecture to improve maintainability, extensibility, and long-term stability.
- Refactored the audio system with unified management for downloading, playback, and speech synthesis.
- Reorganized the project structure and reduced the extension size by removing unnecessary dependencies and replacing them with native implementations where appropriate.

#### Translation Experience

- Optimized OpenAI translation prompts for better translation quality with lower token usage.
- Improved Youdao dictionary formatting.
- Optimized the Linguee HTML parsing logic.
- Improved language handling consistency across translation providers.

#### Developer Experience

- Improved project documentation and repository organization.
- Introduced automated documentation generation to keep language support tables synchronized with the implementation.
- Improved build tooling and development automation.

### 🐞 Bug Fixes

- Fixed a longstanding issue where the search text could briefly reappear after the extension resumed from the background.
- Fixed Bing translation failures caused by excessive recursion in edge cases and resolved race conditions during concurrent requests.
- Fixed playback conflicts and cache overwrite issues during consecutive audio playback for certain dictionaries.
- Fixed DeepLX translate is always failed.
- Fixed an issue where Georgian could be selected in preferences but failed to translate by properly implementing its internal language configuration.
`;
