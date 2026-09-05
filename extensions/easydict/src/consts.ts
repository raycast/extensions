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
- **No action is required after updating.** Existing OpenAI and Gemini preferences continue to work and are treated as legacy until imported.
- **Migration is optional and explicit.** Open **Manage Providers** and import configured OpenAI or Gemini settings individually or together; merely opening the page does not migrate anything.
- **Migration remains explicit and reversible.** Imported providers replace their legacy counterparts without changing the old preferences. Removing a replacement keeps the legacy provider retired until it is restored manually, so deleted providers do not silently return.
- **Provider ordering is now managed in Manage Providers.** Built-in, configured legacy, and AI providers share one order and can be moved together with the **Move Up**/**Move Down** actions or Cmd+Shift+Up/Down on macOS and Ctrl+Shift+Up/Down on Windows. AI providers may explicitly replace an available legacy OpenAI or Gemini slot. The **Legacy Service List Order** preference only initializes this order until it is saved.

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
- **更新后无需操作。** 原有 OpenAI 和 Gemini 偏好设置继续生效，并在导入前作为旧版提供商使用。
- **迁移可选且必须主动执行。** 进入 **Manage Providers**，单独或一起导入已配置的 OpenAI/Gemini 设置；仅打开页面不会迁移。
- **迁移仍然显式且可撤销。** 导入后的 Provider 会替代对应旧版服务，但不会修改旧 Preferences。删除替代项后，旧版 Provider 会保持 retired，只有用户手动 Restore 才会恢复，避免已删除的 Provider 静默返回。
- **Provider 排序现在统一由 Manage Providers 管理。** 内置、已配置的旧版和 AI Provider 共用同一顺序，可通过 **Move Up**/**Move Down** 一起调整；AI Provider 也可以显式替代可用的旧版 OpenAI 或 Gemini 位置。**Legacy Service List Order** 仅在新顺序保存前负责初始化。

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
