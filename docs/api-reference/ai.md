# AI

The AI API provides developers with seamless access to AI functionality without requiring API keys, configuration, or extra dependencies.

{% hint style="info" %}

Some users might not have access to this API. If a user doesn't have access to Raycast Pro, they will be asked if they want to get access when your extension calls the AI API. If the user doesn't wish to get access, the API call will throw an error.

You can check if a user has access to the API using [`environment.canAccess(AI)`](./environment.md).

{% endhint %}

## API Reference

### AI.ask

Ask AI anything you want. Use this in “no-view” Commands, effects, or callbacks. In a React component, you might want to use the [useAI util hook](../utils-reference/react-hooks/useAI.md) instead.

#### Signature

```typescript
async function ask(prompt: string, options?: AskOptions): Promise<string> & EventEmitter;
```

#### Example

{% tabs %} {% tab title="Basic Usage" %}

```typescript
import { AI, Clipboard } from "@raycast/api";

export default async function command() {
  const answer = await AI.ask("Suggest 5 jazz songs");

  await Clipboard.copy(answer);
}
```

{% endtab %} {% tab title="Error handling" %}

```typescript
import { AI, showToast, Toast } from "@raycast/api";

export default async function command() {
  try {
    await AI.ask("Suggest 5 jazz songs");
  } catch (error) {
    // Handle error here, eg: by showing a Toast
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to generate answer",
    });
  }
}
```

{% endtab %} {% tab title="Stream answer" %}

```typescript
import { AI, getSelectedFinderItems, showHUD } from "@raycast/api";
import fs from "fs";

export default async function main() {
  let allData = "";
  const [file] = await getSelectedFinderItems();

  const answer = AI.ask("Suggest 5 jazz songs");

  // Listen to "data" event to stream the answer
  answer.on("data", async (data) => {
    allData += data;
    await fs.promises.writeFile(`${file.path}`, allData.trim(), "utf-8");
  });

  await answer;

  await showHUD("Done!");
}
```

{% endtab %} {% tab title="User Feedback" %}

```typescript
import { AI, getSelectedFinderItems, showHUD } from "@raycast/api";
import fs from "fs";

export default async function main() {
  let allData = "";
  const [file] = await getSelectedFinderItems();

  // If you're doing something that happens in the background
  // Consider showing a HUD or a Toast as the first step
  // To give users feedback about what's happening
  await showHUD("Generating answer...");

  const answer = await AI.ask("Suggest 5 jazz songs");

  await fs.promises.writeFile(`${file.path}`, allData.trim(), "utf-8");

  // Then, when everythig is done, notify the user again
  await showHUD("Done!");
}
```

{% endtab %} {% tab title="Check for access" %}

```typescript
import { AI, getSelectedFinderItems, showHUD, environment } from "@raycast/api";
import fs from "fs";

export default async function main() {
  if (environment.canAccess(AI)) {
    const answer = await AI.ask("Suggest 5 jazz songs");
    await Clipboard.copy(answer);
  } else {
    await showHUD("You don't have access :(");
  }
}
```

{% endtab %} {% endtabs %}

#### Parameters

<FunctionParametersTableFromJSDoc name="AI.ask" />

#### Return

A Promise that resolves with a prompt completion.

## Types

### AI.Creativity

Concrete tasks, such as fixing grammar, require less creativity while open-ended questions, such as generating ideas, require more.

```typescript
type Creativity = "none" | "low" | "medium" | "high" | "maximum" | number;
```

If a number is passed, it needs to be in the range 0-2. For larger values, 2 will be used. For lower values, 0 will be used.

### AI.Model

The AI model to use to answer to the prompt. Defaults to `AI.Model["OpenAI_GPT-5.6_Luna"]`.

| Model | Description |
| --- | --- |
| OpenAI_GPT-5_mini | OpenAI's compact model, great for well-defined tasks and precise prompts. |
| OpenAI_GPT-5_nano | OpenAI's lightweight model, great for summarization and classification tasks. |
| OpenAI_GPT-4.1 | OpenAI's flagship model optimized for complex problem solving. |
| OpenAI_GPT-4.1_mini | Balanced GPT-4.1 variant optimized for speed and cost efficiency. |
| OpenAI_GPT-4.1_nano | Fastest and most cost-effective GPT-4.1 variant. |
| OpenAI_GPT-4 | Previous generation GPT-4 model with broad knowledge and complex instruction handling. |
| OpenAI_GPT-4_Turbo | Previous generation GPT-4 with expanded context window. |
| OpenAI_GPT-4o | Advanced OpenAI model optimized for speed and complex problem solving. |
| OpenAI_GPT-4o_mini | Fast and intelligent model for everyday tasks. |
| OpenAI_GPT-5.1 | OpenAI's model with adaptive reasoning, great for coding and agentic tasks across domains. |
| OpenAI_GPT-5.2 | OpenAI's most capable model for professional work and long-running agents with state-of-the-art tool-calling. |
| OpenAI_GPT-5.2_Instant | OpenAI's fast, capable GPT-5.2-class model for everyday work with improved info-seeking, how-tos, and technical writing. |
| OpenAI_GPT-5.3_Instant | OpenAI's fast, capable GPT-5.3-class model for everyday work with improved info-seeking, how-tos, and technical writing. |
| OpenAI_GPT-5.3_Codex | A version of GPT-5.3 optimized for agentic coding tasks in Codex or similar environments. |
| OpenAI_GPT-5.4 | OpenAI's high-performance GPT-5.4-class model for professional work and long-running agents with state-of-the-art tool-calling. |
| OpenAI_GPT-5.4_mini | OpenAI's strongest mini model yet for coding and agentic workflows. |
| OpenAI_GPT-5.4_nano | OpenAI's cheapest GPT-5.4-class model for simpler tasks. |
| OpenAI_GPT-5.5 | OpenAI's most capable model for complex reasoning and long-running agentic work. |
| OpenAI_GPT-5.5_Instant | OpenAI's fast, capable model for everyday work with improved info-seeking, how-tos, and technical writing. |
| OpenAI_GPT-5.6_Sol | OpenAI's frontier GPT-5.6 model for complex, professional-grade reasoning and long-running agentic work. |
| OpenAI_GPT-5.6_Terra | OpenAI's balanced GPT-5.6 model for everyday work across writing, analysis, and coding. |
| OpenAI_GPT-5.6_Luna | OpenAI's fastest GPT-5.6 model for responsive everyday tasks. |
| OpenAI_o4-mini | Fast, efficient model optimized for coding and visual tasks. |
| OpenAI_o1 | Advanced reasoning model for complex STEM problems. |
| OpenAI_o3-mini | Fast reasoning model optimized for STEM tasks. |
| Groq_GPT-OSS_20b | OpenAI's first open-source model, 20b variant. |
| Groq_GPT-OSS_120b | OpenAI's first open-source model, 120b variant. |
| Anthropic_Claude_Haiku_4.5 | Anthropic's offering focusing on being the best combination of performance and speed. |
| Anthropic_Claude_Sonnet_4.6 | Anthropic's most intelligent model with the highest intelligence across most tasks. |
| Anthropic_Claude_Sonnet_5 | Anthropic's best combination of speed and intelligence, with combined reasoning and non-reasoning capabilities. |
| Anthropic_Claude_Opus_4.7 | Anthropic's previous generation Opus model with combined reasoning and non-reasoning capabilities. |
| Anthropic_Claude_Opus_4.8 | Anthropic's most powerful model with combined reasoning and non-reasoning capabilities. |
| Anthropic_Claude_Opus_5 | Anthropic's most powerful model with combined reasoning and non-reasoning capabilities. |
| Perplexity_Sonar | Fast Perplexity model with integrated search capabilities. |
| Perplexity_Sonar_Pro | Advanced Perplexity model for complex queries with search integration. |
| Groq_Llama_3.3_70B | Meta's state-of-the-art model for reasoning and general knowledge. |
| Groq_Llama_3.1_8B | Fast, instruction-optimized open-source model. |
| Mistral_Nemo | Small, Apache-licensed model built with NVIDIA. |
| Mistral_Large | Top-tier reasoning model with strong multilingual support. |
| Mistral_Medium | A powerful, cost-effective, frontier-class multimodal model. |
| Mistral_Small | Latest enterprise-grade small model with improved reasoning. |
| Mistral_Codestral | Specialized model for code-related tasks and testing. |
| Groq_Qwen3-32B | The latest generation of large language models in the Qwen series. |
| Google_Gemini_3.6_Flash | Balances speed with intelligence for agentic and multimodal tasks. |
| Google_Gemini_3.5_Flash | Near-Pro intelligence with Flash-tier speed and cost for agentic workflows. |
| Google_Gemini_3.5_Flash_Lite | Fast, cost-effective model for high-throughput agentic workflows and data processing. |
| Google_Gemini_3.1_Flash_Lite | Ultra-fast, cost-effective model for high-volume tasks and lightweight agentic workflows. |
| Google_Gemini_3_Flash | Fast thinking model with strong balance of speed, performance, and value. |
| Google_Gemini_3.1_Pro | Next generation thinking model for complex problem solving. |
| Google_Gemini_2.5_Pro | Previous generation thinking model for complex problem solving. |
| Google_Gemini_2.5_Flash | Fast, well-rounded thinking model. |
| Google_Gemini_2.5_Flash_Lite | Fast model optimized for large-scale text output. |
| xAI_Grok-4.5 | xAI's latest flagship Grok model, delivering frontier reasoning, stronger coding, and multimodal understanding. |
| xAI_Grok-4.3 | xAI's advanced reasoning model with enhanced capabilities. |
| Baseten_Kimi_K2.7_Code | Moonshot AI's code-optimized trillion-parameter multimodal model with enhanced coding capabilities and agentic tool-calling. |
| Baseten_GLM-5.2 | Z.AI's next-generation flagship model with MoE + DSA architecture for efficient long-context coding, agentic, and reasoning tasks. |
| Baseten_DeepSeek_V4_Pro | DeepSeek's 1.6T parameter MoE model optimized for coding, reasoning, and agentic tasks with a 1M token context window. |
| Vercel_Kimi_K3 | Moonshot AI's trillion-parameter multimodal model with strong reasoning and agentic tool-calling. |
| Vercel_Gemma_4_31B | Google's open-weight dense model with vision and 140+ language support, tuned for output quality over throughput. |
| Vercel_Inkling | Thinking Machines' open-weights multimodal MoE model with controllable thinking effort for reasoning, coding, and tool use. |
| Vercel_DeepSeek_V4_Flash | DeepSeek's lightweight V4 MoE model tuned for fast, low-cost coding, reasoning, and agentic tasks. |
| Vercel_Qwen3.8_Max | Alibaba's 2.4-trillion-parameter MoE flagship with native visual understanding for long-horizon coding and professional work. |

If a model isn't available to the user (or has been disabled by the user), Raycast will fallback to a similar one.

### AI.AskOptions

#### Properties

<InterfaceTableFromJSDoc name="AI.AskOptions" />

## Rate Limit

To prevent accidental programmatic over-usage of AI quota, Raycast enforces rate limits on AI requests made from extensions.

| Limit per minute | Limit per hour |
| ---------------- | -------------- |
| 10/minute        | 100/hour       |
