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

The AI model to use to answer to the prompt. Defaults to `AI.Model["OpenAI_GPT-4o_mini"]`.

#### Enumeration members

| Model                                              | Description                                                                            |
| -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| OpenAI_GPT-5_mini                                  | Compact GPT-5 variant optimized for well-defined tasks and precise prompts.            |
| OpenAI_GPT-5_nano                                  | Lightweight GPT-5 variant optimized for summarization and classification tasks.        |
| OpenAI_GPT-4.1                                     | OpenAI's flagship model optimized for complex problem solving.                         |
| OpenAI_GPT-4.1_mini                                | Balanced GPT-4.1 variant optimized for speed and cost efficiency.                      |
| OpenAI_GPT-4.1_nano                                | Fastest and most cost-effective GPT-4.1 variant.                                       |
| OpenAI_GPT-4                                       | Previous generation GPT-4 model with broad knowledge and complex instruction handling. |
| OpenAI_GPT-4_Turbo                                 | Previous generation GPT-4 with expanded context window.                                |
| OpenAI_GPT-4o                                      | Advanced OpenAI model optimized for speed and complex problem solving.                 |
| OpenAI_GPT-4o_mini                                 | Fast and intelligent model for everyday tasks.                                         |
| OpenAI_GPT-5                                       | OpenAI's flagship GPT-5 model for coding and agentic tasks across domains.             |
| OpenAI_GPT-5_Codex                                 | GPT-5 variant specialized for code generation and software development tasks.          |
| OpenAI_GPT-5.1                                     | Enhanced GPT-5.1 model with improved reasoning and code understanding.                 |
| OpenAI_GPT-5.1_Codex                               | GPT-5.1 variant optimized for advanced code generation and development workflows.      |
| OpenAI_GPT-5.1_Instant                             | Fast GPT-5.1 variant optimized for low-latency responses and agentic workflows.        |
| OpenAI_o3                                          | Advanced model excelling in math, science, coding, and visual tasks.                   |
| OpenAI_o4-mini                                     | Fast, efficient model optimized for coding and visual tasks.                           |
| OpenAI_o1                                          | Advanced reasoning model for complex STEM problems.                                    |
| OpenAI_o3-mini                                     | Fast reasoning model optimized for STEM tasks.                                         |
| Groq_GPT-OSS_20b                                   | Groq's open-source model, 20b variant.                                                 |
| Groq_GPT-OSS_120b                                  | Groq's open-source model, 120b variant.                                                |
| Anthropic_Claude_3.5_Haiku                         | Anthropic's fastest model with large context window for code and text analysis.        |
| Anthropic_Claude_4.5_Haiku                         | Anthropic's latest Haiku model with improved performance.                              |
| Anthropic_Claude_4_Sonnet                          | Anthropic's intelligent model for complex tasks.                                       |
| Anthropic_Claude_4.5_Sonnet                        | Anthropic's most intelligent model.                                                    |
| Anthropic_Claude_4_Opus                            | Anthropic's model for complex tasks with exceptional fluency.                          |
| Anthropic_Claude_4.1_Opus                          | Anthropic's enhanced Opus model with improved capabilities.                            |
| Anthropic_Claude_4.5_Opus                          | Anthropic's most advanced Opus model.                                                  |
| Perplexity_Sonar                                   | Fast Perplexity model with integrated search capabilities.                             |
| Perplexity_Sonar_Pro                               | Advanced Perplexity model for complex queries with search integration.                 |
| Groq_Llama_4_Scout                                 | Advanced 17B parameter multimodal model with 16 experts.                               |
| Groq_Llama_3.3_70B                                 | Meta's state-of-the-art model for reasoning and general knowledge.                     |
| Groq_Llama_3.1_8B                                  | Fast, instruction-optimized open-source model.                                         |
| Together_AI_Llama_3.1_405B                         | Meta's flagship model with advanced capabilities across multiple domains.              |
| Mistral_Nemo                                       | Small, Apache-licensed model built with NVIDIA.                                        |
| Mistral_Large                                      | Top-tier reasoning model with strong multilingual support.                             |
| Mistral_Medium                                     | A powerful, cost-effective, frontier-class multimodal model.                           |
| Mistral_Small_3                                    | Latest enterprise-grade small model with improved reasoning.                           |
| Mistral_Codestral                                  | Specialized model for code-related tasks and testing.                                  |
| Groq_Kimi_K2_Instruct                              | Kimi K2 is a powerful and versatile AI model designed for a wide range of tasks.       |
| Groq_Qwen3-32B                                     | The latest generation of large language models in the Qwen series.                     |
| Google_Gemini_3_Pro                                | Advanced Google Gemini model for complex tasks.                                        |
| Google_Gemini_2.5_Pro                              | Advanced thinking model for complex problem solving.                                   |
| Google_Gemini_2.5_Flash                            | Fast, well-rounded thinking model.                                                     |
| Google_Gemini_2.5_Flash_Lite                       | Fast model optimized for large-scale text output.                                      |
| Google_Gemini_2.0_Flash                            | Low-latency model optimized for agentic experiences.                                   |
| Together_AI_Qwen3-235B-A22B-Instruct-2507-tput     | Large Qwen model with enhanced reasoning capabilities.                                 |
| Together_AI_DeepSeek-R1                            | Open-source model matching OpenAI-o1 performance.                                      |
| Together_AI_DeepSeek-V3                            | Advanced Mixture-of-Experts model.                                                     |
| xAI_Grok-4.1_Fast                                  | Fast variant of xAI's Grok-4.1 model.                                                  |
| xAI_Grok-4                                         | Advanced language model with enhanced reasoning and tool capabilities.                 |
| xAI_Grok-4_Fast                                    | Fast variant of xAI's Grok-4 model.                                                    |
| xAI_Grok_Code_Fast_1                               | Fast code-specialized variant of xAI's Grok model.                                     |
| xAI_Grok-3_Beta                                    | Beta version of xAI's Grok-3 model.                                                    |
| xAI_Grok-3_Mini_Beta                               | Lightweight beta version of xAI's Grok-3 model.                                        |
| xAI_Grok-2                                         | Advanced language model with strong reasoning capabilities.                            |

If a model isn't available to the user (or has been disabled by the user), Raycast will fallback to a similar one.

### AI.AskOptions

#### Properties

| Property | Description | Type |
| :--- | :--- | :--- |
| creativity | Concrete tasks, such as fixing grammar, require less creativity while open-ended questions, such as generating ideas, require more.  If a number is passed, it needs to be in the range 0-2. For larger values, 2 will be used. For lower values, 0 will be used. | <code>[AI.Creativity](ai.md#ai.creativity)</code> |
| model | The AI model to use to answer to the prompt. | <code>[AI.Model](ai.md#ai.model)</code> |
| signal | Abort signal to cancel the request. | <code>[Date](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)</code> |
