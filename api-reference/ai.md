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

{% tabs %}
{% tab title="Basic Usage" %}

```typescript
import { AI, Clipboard } from "@raycast/api";

export default async function command() {
  const answer = await AI.ask("Suggest 5 jazz songs");

  await Clipboard.copy(answer);
}
```

{% endtab %}
{% tab title="Error handling" %}

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

{% endtab %}
{% tab title="Stream answer" %}

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

{% endtab %}
{% tab title="User Feedback" %}

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

{% endtab %}
{% tab title="Check for access" %}

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

{% endtab %}
{% endtabs %}

#### Parameters

| Name | Description | Type |
| :--- | :--- | :--- |
| prompt<mark style="color:red;">*</mark> | The prompt to ask the AI. | <code>string</code> |
| options | Options to control which and how the AI model should behave. | <code>[AI.AskOptions](ai.md#ai.askoptions)</code> |

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

The AI model to use to answer to the prompt. Defaults to `AI.Model["OpenAI_GPT3.5-turbo"]`.

#### Enumeration members

| Model                                          | Description                                                                 |
| ---------------------------------------------- | --------------------------------------------------------------------------- |
| OpenAI_GPT-5                                   | OpenAI’s latest flagship model for coding and agentic tasks across domains. |
| OpenAI_GPT-5.1                                 | Improved GPT-5 variant with better reasoning and reliability.               |
| OpenAI_GPT-5.1_Instant                         | Low-latency GPT-5.1 variant optimized for fast responses.                   |
| OpenAI_GPT-5_Codex                             | GPT-5 variant specialized for coding and code generation.                   |
| OpenAI_GPT-5.1_Codex                           | Advanced GPT-5.1 coding-focused model.                                      |
| OpenAI_GPT-5_mini                              | Lightweight GPT-5 model for well-defined tasks and precise prompts.         |
| OpenAI_GPT-5_nano                              | Ultra-fast GPT-5 model for summarization and classification.                |
| OpenAI_GPT-4.1                                 | Flagship GPT-4.1 model optimized for complex problem solving.               |
| OpenAI_GPT-4.1_mini                            | Balanced GPT-4.1 variant optimized for speed and cost.                      |
| OpenAI_GPT-4.1_nano                            | Fastest and most cost-effective GPT-4.1 variant.                            |
| OpenAI_GPT-4                                   | Previous-generation GPT-4 with broad knowledge.                             |
| OpenAI_GPT-4_Turbo                             | GPT-4 Turbo with expanded context window.                                   |
| OpenAI_GPT-4o                                  | Advanced multimodal GPT-4o optimized for speed and reasoning.               |
| OpenAI_GPT-4o_mini                             | Fast, cost-efficient GPT-4o for everyday tasks.                             |
| OpenAI_o1                                      | Advanced reasoning model for complex STEM problems.                         |
| OpenAI_o3                                      | Advanced model excelling in math, science, coding, and visual tasks.        |
| OpenAI_o3-mini                                 | Fast reasoning model optimized for STEM tasks.                              |
| OpenAI_o4-mini                                 | Efficient reasoning model optimized for coding and visual tasks.            |
| Groq_GPT-OSS_20b                               | OpenAI open-source GPT-OSS 20B model hosted on Groq.                        |
| Groq_GPT-OSS_120b                              | OpenAI open-source GPT-OSS 120B model hosted on Groq.                       |
| Anthropic_Claude_3.5_Haiku                     | Fast Claude model optimized for short responses and analysis.               |
| Anthropic_Claude_4.5_Haiku                     | Latest Haiku model with improved reasoning and speed.                       |
| Anthropic_Claude_4_Sonnet                      | High-intelligence Claude model for complex tasks.                           |
| Anthropic_Claude_4.5_Sonnet                    | Anthropic’s most capable Sonnet model.                                      |
| Anthropic_Claude_4_Opus                        | High-end Claude model with exceptional fluency.                             |
| Anthropic_Claude_4.1_Opus                      | Most advanced Opus model with improved reasoning depth.                     |
| Perplexity_Sonar                               | Fast Perplexity model with integrated web search.                           |
| Perplexity_Sonar_Pro                           | Advanced Perplexity model for complex, search-heavy queries.                |
| Groq_Llama_4_Scout                             | Llama-4 Scout 17B MoE model optimized for instruction following.            |
| Groq_Llama_3.3_70B                             | High-quality 70B Llama model for reasoning and general tasks.               |
| Groq_Llama_3.1_8B                              | Fast, lightweight Llama model for instant responses.                        |
| Together_AI_Llama_3.1_405B                     | Meta’s flagship 405B Llama model via Together AI.                           |
| Mistral_Nemo                                   | Small, efficient Apache-licensed Mistral model.                             |
| Mistral_Large                                  | Top-tier Mistral reasoning model with multilingual strength.                |
| Mistral_Medium                                 | Cost-effective frontier-class Mistral model.                                |
| Mistral_Small_3                                | Latest enterprise-grade small Mistral model.                                |
| Mistral_Codestral                              | Specialized Mistral model for code generation and testing.                  |
| Groq_Kimi_K2_Instruct                          | Versatile instruction-tuned Kimi K2 model on Groq.                          |
| Groq_Qwen3-32B                                 | Qwen3 32B model optimized for reasoning and instruction tasks.              |
| Together_AI_Qwen3-235B-A22B-Instruct-2507-tput | Large-scale Qwen3 MoE model optimized for throughput.                       |
| Together_AI_DeepSeek-R1                        | DeepSeek R1 reasoning model via Together AI.                                |
| Together_AI_DeepSeek-V3                        | Advanced DeepSeek V3 Mixture-of-Experts model.                              |
| Google_Gemini_3_Pro                            | Next-generation Gemini model for advanced reasoning.                        |
| Google_Gemini_2.5_Pro                          | Advanced Gemini model for complex problem solving.                          |
| Google_Gemini_2.5_Flash                        | Fast, well-rounded Gemini model.                                            |
| Google_Gemini_2.5_Flash_Lite                   | Lightweight Gemini model optimized for scale.                               |
| Google_Gemini_2.0_Flash                        | Low-latency Gemini model for agentic workflows.                             |
| xAI_Grok-4                                     | Advanced Grok model with strong reasoning and tools.                        |
| xAI_Grok-4_Fast                                | Faster Grok-4 variant with reduced latency.                                 |
| xAI_Grok-4.1_Fast                              | Optimized Grok-4.1 model for speed-critical use cases.                      |
| xAI_Grok_Code_Fast_1                           | Grok model specialized for fast code generation.                            |
| xAI_Grok-3_Beta                                | Grok-3 beta for general reasoning and analysis.                             |
| xAI_Grok-3_Mini_Beta                           | Lightweight Grok-3 variant for quick tasks.                                 |
| xAI_Grok-2                                     | Previous-generation Grok model with solid reasoning.                        |

If a model isn't available to the user (or has been disabled by the user), Raycast will fallback to a similar one.

### AI.AskOptions

#### Properties

| Property | Description | Type |
| :--- | :--- | :--- |
| creativity | Concrete tasks, such as fixing grammar, require less creativity while open-ended questions, such as generating ideas, require more.  If a number is passed, it needs to be in the range 0-2. For larger values, 2 will be used. For lower values, 0 will be used. | <code>[AI.Creativity](ai.md#ai.creativity)</code> |
| model | The AI model to use to answer to the prompt. | <code>[AI.Model](ai.md#ai.model)</code> |
| signal | Abort signal to cancel the request. | <code>[Date](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)</code> |
