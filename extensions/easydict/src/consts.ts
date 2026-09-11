/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { getPreferenceValues } from "@raycast/api";
import os from "os";
import path from "path";

export const myPreferences = getPreferenceValues<Preferences>();

export const EASYDICT_TMP_DIR = path.join(os.tmpdir(), "raycast-easydict");

export const userAgent =
  "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";

export const networkTimeout = 15000;

export const EASYDICT_VERSION = "3.2.0";

const GITHUB_REPO = "https://github.com/tisfeng/Raycast-Easydict";

export const FEEDBACK_URL = `${GITHUB_REPO}/issues`;

export function getReleaseTagUrl(version: string): string {
  return `${GITHUB_REPO}/releases/tag/${version}`;
}

export const RELEASE_MARKDOWN = `
## [v${EASYDICT_VERSION}]

### ⚠️ Behavioral Changes

#### Custom AI Providers

- Connect LLMs through Raycast AI or any OpenAI-compatible endpoint for translation and word lookup.
- **Existing settings migrate automatically.** Open Search Word or Manage Providers to convert configured OpenAI and Gemini settings into ordinary AI providers, preserving connection settings, enablement, and ordering. Previously imported providers keep their edits; previously retired providers stay removed.
- **Manage AI providers in Manage Providers.** Old Extension Settings remain available as import sources, but no longer run separate providers. Editing, disabling, or deleting an AI provider does not restore an old service. Use **Add from Legacy OpenAI/Gemini Settings…** to create another copy, initially disabled.
- **Provider ordering is now managed in Manage Providers.** Built-in and AI providers share one order and can be moved together with the **Move Up**/**Move Down** actions or Cmd+Shift+Up/Down on macOS and Ctrl+Shift+Up/Down on Windows. The **Legacy Service List Order** preference only initializes this order until it is saved.

### ✨ New Features

#### AI-Generated Dictionary Entries

- For each provider, choose Plain Translation or AI-Generated Dictionary Entry in Word & Term Results.
- Dictionary mode applies to words and terms; other input remains plain translation. New or connection-related provider changes offer Test & Save by default, with Save Without Testing still available. JSON output defaults follow provider presets. Some models may fail to return valid structured dictionary output and require a retry, and dictionary generation may take longer.

#### Chinese Stroke Order

- Use **Show Stroke Order** from live or saved translation results to view stroke-order diagrams for Chinese characters.
  - Thanks to [@MagEk1511](https://github.com/MagEk1511)

---

<details>
<summary>Recent Updates [v3.1.0]</summary>

### ✨ New Features

- Added Favorite Words to save translation results and browse/manage them offline.
  - Thanks to [@TTsWorld](https://github.com/TTsWorld)

### 🔧 Maintenance

- Updated dependencies.

</details>

---

## [v${EASYDICT_VERSION}]

### ⚠️ 行为变更

#### 🆕 自定义 AI Provider

- 现在可通过 Raycast AI 或任意 OpenAI 兼容端点接入 LLM，用于翻译和查词。
- **旧设置自动迁移。** 打开 Search Word 或 Manage Providers 时，已配置的 OpenAI/Gemini 设置会转换为普通 AI Provider，保留连接配置、启用状态和排序。已导入 Provider 的修改会保留；此前已退出的 Provider 不会重新创建。
- **AI Provider 统一在 Manage Providers 管理。** 旧 Extension Settings 仅保留为导入来源，不再运行独立服务。编辑、禁用或删除 AI Provider 不会恢复旧服务；如需重新复制旧配置，可使用 **Add from Legacy OpenAI/Gemini Settings…**，新副本初始为禁用状态。
- **Provider 排序现在统一由 Manage Providers 管理。** 内置和 AI Provider 共用同一顺序，可通过 **Move Up**/**Move Down** 或 macOS 的 Cmd+Shift+Up/Down、Windows 的 Ctrl+Shift+Up/Down 调整。**Legacy Service List Order** 仅在新顺序保存前负责初始化。

### ✨ 新特性

#### AI 词典结果

- 每个配置都可在 Word & Term Results 中选择 Plain Translation 或 AI-Generated Dictionary Entry。
- 词典模式仅用于单词和术语，其他输入仍使用普通翻译。新建 Provider 或修改连接相关配置后会默认提供 Test & Save，同时仍可选择 Save Without Testing。JSON 输出模式会根据预设选择默认值。部分模型可能无法返回有效的结构化词典结果而需要重试，生成词典结果也可能耗时更长。

#### 汉字笔顺

- 可在实时查询或已收藏的翻译结果中选择 **Show Stroke Order**，查看汉字笔顺图。
  - 感谢 [@MagEk1511](https://github.com/MagEk1511)

---

<details>
<summary>最近更新 [v3.1.0]</summary>

### ✨ 新特性

- 新增收藏单词，支持保存翻译结果并离线浏览和管理。
  - 感谢 [@TTsWorld](https://github.com/TTsWorld)

### 🔧 维护

- 更新项目依赖项。

</details>

---
`;
