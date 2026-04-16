# ZhenShift Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个 Raycast 扩展 `ZhenShift`，提供 `Translate` 命令，支持基于 OpenAI 兼容 `chat/completions` 接口的中英自动双向翻译。

**Architecture:** 扩展采用单命令加服务层解耦结构。`src/translate.tsx` 负责详情页 UI 与交互状态，`src/lib` 下拆分配置读取、语言识别、网络请求、翻译编排和错误映射，确保自动方向判定在本地完成、翻译生成由 LLM 负责。

**Tech Stack:** Raycast API、React、TypeScript、Node.js 22+、npm、Vitest

---

## 文件结构

### 计划创建或修改的文件

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `README.md`
- Create: `assets/icon.png` 或临时占位图标
- Create: `src/translate.tsx`
- Create: `src/lib/detect-language.ts`
- Create: `src/lib/preferences.ts`
- Create: `src/lib/openai-compatible-client.ts`
- Create: `src/lib/translate.ts`
- Create: `src/lib/errors.ts`
- Create: `tests/detect-language.test.ts`
- Create: `tests/preferences.test.ts`
- Create: `tests/translate.test.ts`
- Create: `tests/openai-compatible-client.test.ts`

### 文件职责

- `package.json`
  - Raycast 扩展元数据
  - `Translate` 命令声明
  - npm scripts
  - 测试依赖
- `tsconfig.json`
  - TypeScript 编译配置
- `.gitignore`
  - 忽略 `node_modules`、构建输出、测试缓存
- `src/translate.tsx`
  - 输入框、状态区、结果区、Action 面板
- `src/lib/detect-language.ts`
  - 中文/英文主导语言识别
- `src/lib/preferences.ts`
  - Raycast 扩展设置读取与规范化
- `src/lib/openai-compatible-client.ts`
  - 调用 `chat/completions`
  - 解析兼容响应
- `src/lib/translate.ts`
  - 组织 prompt
  - 串联方向识别与请求发送
- `src/lib/errors.ts`
  - 统一错误类型与中文错误提示
- `tests/*.test.ts`
  - 覆盖核心纯逻辑与服务层

### 外部参考

- Raycast 创建扩展官方文档：建议对照 [Create Your First Extension](https://developers.raycast.com/basics/create-your-first-extension)
- Raycast CLI 官方文档：建议对照 [CLI](https://developers.raycast.com/information/developer-tools/cli)
- Raycast 文件结构文档：建议对照 [File Structure](https://developers.raycast.com/information/file-structure)

## Task 1: 初始化扩展骨架与开发工具

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `README.md`

- [ ] **Step 1: 写一个最小测试占位，确保测试工具链未配置前会失败**

```ts
// tests/detect-language.test.ts
import { describe, expect, it } from "vitest";

describe("placeholder", () => {
  it("should fail before setup", () => {
    expect(true).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试，确认当前仓库没有测试能力且确实失败**

Run: `npm test`
Expected: FAIL，提示缺少 `package.json` 或没有测试脚本

- [ ] **Step 3: 写最小扩展骨架**

```json
{
  "name": "raycast-zhenshift",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "ray develop",
    "build": "ray build",
    "lint": "ray lint",
    "test": "vitest run"
  },
  "dependencies": {
    "@raycast/api": "latest"
  },
  "devDependencies": {
    "@types/node": "latest",
    "typescript": "latest",
    "vitest": "latest"
  },
  "commands": [
    {
      "name": "translate",
      "title": "Translate",
      "subtitle": "Auto Chinese <-> English Translation",
      "description": "Translate between Chinese and English with an OpenAI-compatible LLM",
      "mode": "view"
    }
  ]
}
```

- [ ] **Step 4: 安装依赖并验证测试工具链可运行**

Run: `npm install`
Expected: PASS，生成 `node_modules` 与 `package-lock.json`

- [ ] **Step 5: 再次运行测试，确认占位测试被执行且失败**

Run: `npm test`
Expected: FAIL，`should fail before setup`

- [ ] **Step 6: 提交骨架**

```bash
git add package.json package-lock.json tsconfig.json .gitignore README.md tests/detect-language.test.ts
git commit -m "chore: initialize raycast extension skeleton"
```

## Task 2: 实现语言识别模块

**Files:**
- Create: `src/lib/detect-language.ts`
- Modify: `tests/detect-language.test.ts`

- [ ] **Step 1: 写失败测试，覆盖中英识别和空输入**

```ts
import { describe, expect, it } from "vitest";
import { detectLanguageDirection } from "../src/lib/detect-language";

describe("detectLanguageDirection", () => {
  it("中文输入应识别为翻译到英文", () => {
    expect(detectLanguageDirection("你好，世界")).toMatchObject({
      sourceLanguage: "zh",
      targetLanguage: "en",
      directionLabel: "中文 -> English",
    });
  });

  it("英文输入应识别为翻译到中文", () => {
    expect(detectLanguageDirection("hello world")).toMatchObject({
      sourceLanguage: "en",
      targetLanguage: "zh",
      directionLabel: "English -> 中文",
    });
  });

  it("空输入应返回 idle", () => {
    expect(detectLanguageDirection("   ").status).toBe("idle");
  });
});
```

- [ ] **Step 2: 运行该测试并确认是“找不到模块”类失败**

Run: `npm test -- tests/detect-language.test.ts`
Expected: FAIL，提示无法导入 `src/lib/detect-language`

- [ ] **Step 3: 写最小实现**

```ts
export function detectLanguageDirection(input: string) {
  const text = input.trim();
  if (!text) return { status: "idle" as const };

  const chineseCount = (text.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const englishCount = (text.match(/[A-Za-z]/g) ?? []).length;

  if (chineseCount >= englishCount) {
    return {
      status: "ready" as const,
      sourceLanguage: "zh" as const,
      targetLanguage: "en" as const,
      directionLabel: "中文 -> English",
    };
  }

  return {
    status: "ready" as const,
    sourceLanguage: "en" as const,
    targetLanguage: "zh" as const,
    directionLabel: "English -> 中文",
  };
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test -- tests/detect-language.test.ts`
Expected: PASS

- [ ] **Step 5: 提交语言识别模块**

```bash
git add src/lib/detect-language.ts tests/detect-language.test.ts
git commit -m "feat: add language direction detection"
```

## Task 3: 实现设置读取与校验

**Files:**
- Create: `src/lib/preferences.ts`
- Create: `src/lib/errors.ts`
- Create: `tests/preferences.test.ts`

- [ ] **Step 1: 写失败测试，覆盖 URL 规范化与缺失字段**

```ts
import { describe, expect, it } from "vitest";
import { normalizeBaseUrl, validatePreferences } from "../src/lib/preferences";

describe("preferences", () => {
  it("应移除 base url 末尾斜杠", () => {
    expect(normalizeBaseUrl("https://api.example.com/")).toBe("https://api.example.com");
  });

  it("缺少 api key 时应抛出配置错误", () => {
    expect(() =>
      validatePreferences({
        baseUrl: "https://api.example.com",
        apiKey: "",
        model: "gpt-4o-mini",
      }),
    ).toThrowError("缺少 API Key");
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- tests/preferences.test.ts`
Expected: FAIL，提示缺少 `preferences` 模块

- [ ] **Step 3: 写最小实现**

```ts
export function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, "");
}

export function validatePreferences(input: { baseUrl: string; apiKey: string; model: string }) {
  if (!input.baseUrl.trim()) throw new Error("缺少 Base URL");
  if (!input.apiKey.trim()) throw new Error("缺少 API Key");
  if (!input.model.trim()) throw new Error("缺少 Model");
  return {
    baseUrl: normalizeBaseUrl(input.baseUrl),
    apiKey: input.apiKey.trim(),
    model: input.model.trim(),
  };
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test -- tests/preferences.test.ts`
Expected: PASS

- [ ] **Step 5: 提交设置层**

```bash
git add src/lib/preferences.ts src/lib/errors.ts tests/preferences.test.ts
git commit -m "feat: add preference validation"
```

## Task 4: 实现 OpenAI 兼容客户端

**Files:**
- Create: `src/lib/openai-compatible-client.ts`
- Modify: `src/lib/errors.ts`
- Create: `tests/openai-compatible-client.test.ts`

- [ ] **Step 1: 写失败测试，覆盖成功解析和错误映射**

```ts
import { describe, expect, it, vi } from "vitest";
import { requestChatCompletion } from "../src/lib/openai-compatible-client";

describe("requestChatCompletion", () => {
  it("应解析标准 chat completions 响应", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "hello" } }],
      }),
    }));

    await expect(
      requestChatCompletion({
        baseUrl: "https://api.example.com",
        apiKey: "sk-test",
        model: "test-model",
        messages: [],
      }),
    ).resolves.toBe("hello");
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- tests/openai-compatible-client.test.ts`
Expected: FAIL，提示缺少客户端模块

- [ ] **Step 3: 写最小实现**

```ts
export async function requestChatCompletion(input: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: "system" | "user"; content: string }>;
}) {
  const response = await fetch(`${input.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.apiKey}`,
    },
    body: JSON.stringify({
      model: input.model,
      messages: input.messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`请求失败: ${response.status}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("服务返回格式不兼容 OpenAI chat/completions");
  }

  return content.trim();
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test -- tests/openai-compatible-client.test.ts`
Expected: PASS

- [ ] **Step 5: 提交客户端**

```bash
git add src/lib/openai-compatible-client.ts src/lib/errors.ts tests/openai-compatible-client.test.ts
git commit -m "feat: add openai compatible client"
```

## Task 5: 实现翻译服务编排

**Files:**
- Create: `src/lib/translate.ts`
- Modify: `tests/translate.test.ts`

- [ ] **Step 1: 写失败测试，覆盖中译英和英译中 prompt 编排**

```ts
import { describe, expect, it, vi } from "vitest";
import { translateText } from "../src/lib/translate";

vi.mock("../src/lib/openai-compatible-client", () => ({
  requestChatCompletion: vi.fn().mockResolvedValue("Hello, world"),
}));

describe("translateText", () => {
  it("中文输入时应指定输出英文", async () => {
    const result = await translateText({
      text: "你好，世界",
      baseUrl: "https://api.example.com",
      apiKey: "sk-test",
      model: "test-model",
    });

    expect(result.directionLabel).toBe("中文 -> English");
    expect(result.translation).toBe("Hello, world");
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- tests/translate.test.ts`
Expected: FAIL，提示缺少 `translate` 模块

- [ ] **Step 3: 写最小实现**

```ts
import { detectLanguageDirection } from "./detect-language";
import { requestChatCompletion } from "./openai-compatible-client";

export async function translateText(input: {
  text: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}) {
  const direction = detectLanguageDirection(input.text);
  if (direction.status !== "ready") {
    throw new Error("请输入中文或英文文本");
  }

  const targetLanguage = direction.targetLanguage === "en" ? "English" : "中文";
  const translation = await requestChatCompletion({
    baseUrl: input.baseUrl,
    apiKey: input.apiKey,
    model: input.model,
    messages: [
      {
        role: "system",
        content: `你是一个中英翻译器。请将用户输入翻译为${targetLanguage}。只返回译文，不要解释，不要添加引号，不要补充说明。`,
      },
      {
        role: "user",
        content: input.text,
      },
    ],
  });

  return {
    directionLabel: direction.directionLabel,
    translation,
  };
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test -- tests/translate.test.ts`
Expected: PASS

- [ ] **Step 5: 提交翻译服务**

```bash
git add src/lib/translate.ts tests/translate.test.ts
git commit -m "feat: add translation orchestration"
```

## Task 6: 实现 Translate 命令详情页

**Files:**
- Create: `src/translate.tsx`
- Modify: `package.json`

- [ ] **Step 1: 写一个最小行为测试或至少定义页面状态模型测试**

```ts
import { describe, expect, it } from "vitest";
import { buildViewState } from "../src/translate";

describe("buildViewState", () => {
  it("空输入时应显示待输入", () => {
    expect(buildViewState({ text: "", loading: false, error: null, translation: "" }).statusTitle).toBe("待输入");
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- tests/translate-view.test.ts`
Expected: FAIL，提示缺少页面状态函数或测试文件

- [ ] **Step 3: 实现最小详情页与状态模型**

```tsx
export function buildViewState(input: {
  text: string;
  loading: boolean;
  error: string | null;
  translation: string;
}) {
  if (!input.text.trim()) return { statusTitle: "待输入" };
  if (input.loading) return { statusTitle: "翻译中" };
  if (input.error) return { statusTitle: "翻译失败" };
  if (input.translation) return { statusTitle: "翻译成功" };
  return { statusTitle: "待输入" };
}
```

页面实现要求：

- 使用 `Detail` 作为主展示
- 使用 `ActionPanel` 提供复制结果、重新翻译、清空输入
- 输入变化采用 `400ms` 防抖
- 启动时读取 Raycast preferences
- 配置缺失时显示中文提示

- [ ] **Step 4: 运行测试并确认通过**

Run: `npm test`
Expected: PASS，至少所有单元测试通过

- [ ] **Step 5: 本地运行扩展开发模式**

Run: `npm run dev`
Expected: Raycast 能导入本地扩展并出现 `Translate` 命令

- [ ] **Step 6: 提交 UI 命令**

```bash
git add src/translate.tsx package.json
git commit -m "feat: add translate detail command"
```

## Task 7: 联调、文档与最终验证

**Files:**
- Modify: `README.md`
- Modify: `package.json`

- [ ] **Step 1: 补全文档**

文档至少包括：

- 扩展用途
- 配置项说明
- 本地开发方式
- 支持的接口格式限制

- [ ] **Step 2: 运行完整验证**

Run: `npm test`
Expected: PASS

Run: `npm run lint`
Expected: PASS

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: 手工验证**

验证项：

- 中文输入得到英文输出
- 英文输入得到中文输出
- 缺少配置时显示中文提示
- 错误接口地址时显示连接错误
- 成功后复制动作可用

- [ ] **Step 4: 提交最终结果**

```bash
git add README.md package.json src tests
git commit -m "feat: complete zhenshift translator extension"
```
