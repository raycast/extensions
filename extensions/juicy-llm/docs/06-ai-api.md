# AI API

Raycast Pro 사용자를 위한 AI 기능. API 키나 설정 없이 다양한 AI 모델에 접근.

## 접근 확인

```tsx
import { environment, AI } from "@raycast/api";

if (environment.canAccess(AI)) {
  // AI 사용 가능
} else {
  // Raycast Pro 필요
}
```

AI 접근이 없는 사용자가 호출하면 Pro 가입 안내 → 거부 시 에러 throw.

---

## AI.ask

프롬프트에 대한 AI 응답. no-view 커맨드, 콜백, 이펙트에서 사용. React 컴포넌트에서는 `useAI` 훅 권장.

### Signature

```tsx
async function ask(prompt: string, options?: AI.AskOptions): Promise<string> & EventEmitter;
```

### AI.AskOptions

| Prop | Type | 설명 |
|------|------|------|
| `creativity` | `AI.Creativity` | 창의성 수준 |
| `model` | `AI.Model` | AI 모델 |
| `signal` | `AbortSignal` | 요청 취소 |

### AI.Creativity

| 값 | 설명 |
|----|------|
| `"none"` | 0 - 문법 교정 등 정확한 작업 |
| `"low"` | 0.5 |
| `"medium"` | 1.0 |
| `"high"` | 1.5 |
| `"maximum"` | 2.0 - 아이디어 생성 등 개방적 작업 |
| `number` | 0-2 직접 지정 |

### AI.Model (주요 모델)

**OpenAI:**
- `OpenAI_GPT-4o`, `OpenAI_GPT-4o_mini` (기본값)
- `OpenAI_GPT-5`, `OpenAI_GPT-5.1`, `OpenAI_GPT-5.2`, `OpenAI_GPT-5.4`
- `OpenAI_o3`, `OpenAI_o4-mini` (추론 모델)

**Anthropic:**
- `Anthropic_Claude_4.6_Opus`, `Anthropic_Claude_4.6_Sonnet`
- `Anthropic_Claude_4.5_Haiku`, `Anthropic_Claude_4.5_Sonnet`, `Anthropic_Claude_4.5_Opus`

**Google:**
- `Google_Gemini_3.1_Pro`, `Google_Gemini_3.1_Flash_Lite`
- `Google_Gemini_2.5_Pro`, `Google_Gemini_2.5_Flash`

**기타:**
- `Perplexity_Sonar`, `Perplexity_Sonar_Pro` (검색 통합)
- `Groq_Llama_4_Scout`, `Groq_Llama_3.3_70B`
- `Mistral_Large`, `Mistral_Codestral`
- `Together_AI_DeepSeek-R1`, `Together_AI_DeepSeek-V3`
- `xAI_Grok-4.1_Fast`, `xAI_Grok-4.20`

사용자가 비활성화했거나 접근 불가한 모델은 유사 모델로 자동 폴백.

---

## 사용 패턴

### 기본 사용 (no-view)

```tsx
import { AI, Clipboard } from "@raycast/api";

export default async function command() {
  const answer = await AI.ask("Suggest 5 jazz songs");
  await Clipboard.copy(answer);
}
```

### 에러 처리

```tsx
import { AI, showToast, Toast } from "@raycast/api";

export default async function command() {
  try {
    await AI.ask("Suggest 5 jazz songs");
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "AI request failed" });
  }
}
```

### 스트리밍 응답

```tsx
import { AI, showHUD } from "@raycast/api";
import fs from "fs";

export default async function main() {
  let allData = "";
  const answer = AI.ask("Write a poem about coding");

  answer.on("data", (data) => {
    allData += data;
    // 실시간 처리
  });

  await answer;
  await showHUD("Done!");
}
```

### React 컴포넌트에서 (useAI)

```tsx
import { Detail } from "@raycast/api";
import { useAI } from "@raycast/utils";

export default function Command() {
  const { isLoading, data } = useAI("Explain quantum computing in simple terms", {
    creativity: "medium",
    model: AI.Model["Anthropic_Claude_4.6_Sonnet"],
  });

  return <Detail isLoading={isLoading} markdown={data || "Loading..."} />;
}
```
