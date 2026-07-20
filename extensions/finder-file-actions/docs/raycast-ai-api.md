# AI

The AI API provides developers with seamless access to AI functionality without requiring API keys, configuration, or extra dependencies.

{% hint style="info" %}
Some users might not have access to this API. If a user doesn't have access to Raycast Pro, they will be asked if they want to get access when your extension calls the AI API. If the user doesn't wish to get access, the API call will throw an error.

You can check if a user has access to the API using [`environment.canAccess(AI)`](https://developers.raycast.com/api-reference/environment).
{% endhint %}

## API Reference

### AI.ask

Ask AI anything you want. Use this in “no-view” Commands, effects, or callbacks. In a React component, you might want to use the [useAI util hook](https://developers.raycast.com/utilities/react-hooks/useai) instead.

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

| Name                                     | Description                                                  | Type                              |
| ---------------------------------------- | ------------------------------------------------------------ | --------------------------------- |
| prompt<mark style="color:red;">\*</mark> | The prompt to ask the AI.                                    | `string`                          |
| options                                  | Options to control which and how the AI model should behave. | [`AI.AskOptions`](#ai.askoptions) |

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

| Model                                            | Description                                                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| OpenAI\_GPT-5\_mini                              | OpenAI's latest model, great for well-defined tasks and precise prompts.                                           |
| OpenAI\_GPT-5\_nano                              | OpenAI's latest model, great for summarization and classification tasks.                                           |
| OpenAI\_GPT-4.1                                  | OpenAI's flagship model optimized for complex problem solving.                                                     |
| OpenAI\_GPT-4.1\_mini                            | Balanced GPT-4.1 variant optimized for speed and cost efficiency.                                                  |
| OpenAI\_GPT-4.1\_nano                            | Fastest and most cost-effective GPT-4.1 variant.                                                                   |
| OpenAI\_GPT-4                                    | Previous generation GPT-4 model with broad knowledge and complex instruction handling.                             |
| OpenAI\_GPT-4\_Turbo                             | Previous generation GPT-4 with expanded context window.                                                            |
| OpenAI\_GPT-4o                                   | Advanced OpenAI model optimized for speed and complex problem solving.                                             |
| OpenAI\_GPT-4o\_mini                             | Fast and intelligent model for everyday tasks.                                                                     |
| OpenAI\_GPT-5                                    | OpenAI's latest model, great for coding and agentic tasks across domains.                                          |
| OpenAI\_GPT-5.1                                  | OpenAI's model with adaptive reasoning, great for coding and agentic tasks across domains.                         |
| OpenAI\_GPT-5.1\_Codex                           | A version of GPT-5.1 optimized for agentic coding tasks in Codex or similar environments.                          |
| OpenAI\_GPT-5.1\_Instant                         | OpenAI's fastest GPT-5.1 model with adaptive reasoning, optimized for speed and efficiency.                        |
| OpenAI\_GPT-5.2                                  | OpenAI's most capable model for professional work and long-running agents with state-of-the-art tool-calling.      |
| OpenAI\_GPT-5.2\_Instant                         | OpenAI's fast, capable model for everyday work with improved info-seeking, how-tos, and technical writing.         |
| OpenAI\_GPT-5.3\_Instant                         | OpenAI's fast, capable model for everyday work with improved info-seeking, how-tos, and technical writing.         |
| OpenAI\_GPT-5.3\_Codex                           | A version of GPT-5.3 optimized for agentic coding tasks in Codex or similar environments.                          |
| OpenAI\_GPT-5.4                                  | OpenAI's most capable model for professional work and long-running agents with state-of-the-art tool-calling.      |
| OpenAI\_GPT-5.4\_mini                            | OpenAI's strongest mini model yet for coding and agentic workflows.                                                |
| OpenAI\_GPT-5.4\_nano                            | OpenAI's cheapest GPT-5.4-class model for simpler tasks.                                                           |
| OpenAI\_o3                                       | Advanced model excelling in math, science, coding, and visual tasks.                                               |
| OpenAI\_o4-mini                                  | Fast, efficient model optimized for coding and visual tasks.                                                       |
| OpenAI\_o1                                       | Advanced reasoning model for complex STEM problems.                                                                |
| OpenAI\_o3-mini                                  | Fast reasoning model optimized for STEM tasks.                                                                     |
| Groq\_GPT-OSS\_20b                               | OpenAI's first open-source model, 20b variant.                                                                     |
| Groq\_GPT-OSS\_120b                              | OpenAI's first open-source model, 120b variant.                                                                    |
| Anthropic\_Claude\_4.5\_Haiku                    | Anthropic's offering focusing on being the best combination of performance and speed.                              |
| Anthropic\_Claude\_4\_Sonnet                     | Anthropic's previous generation Sonnet model with strong general capabilities.                                     |
| Anthropic\_Claude\_4.5\_Sonnet                   | Anthropic's previous generation Sonnet model with high intelligence across most tasks.                             |
| Anthropic\_Claude\_4.6\_Sonnet                   | Anthropic's most intelligent model with the highest intelligence across most tasks.                                |
| Anthropic\_Claude\_4.5\_Opus                     | Anthropic's previous generation Opus model with enhanced capabilities.                                             |
| Anthropic\_Claude\_4.6\_Opus                     | Anthropic's model for complex tasks with exceptional fluency.                                                      |
| Perplexity\_Sonar                                | Fast Perplexity model with integrated search capabilities.                                                         |
| Perplexity\_Sonar\_Pro                           | Advanced Perplexity model for complex queries with search integration.                                             |
| Groq\_Llama\_4\_Scout                            | Advanced 17B parameter multimodal model with 16 experts.                                                           |
| Groq\_Llama\_3.3\_70B                            | Meta's state-of-the-art model for reasoning and general knowledge.                                                 |
| Groq\_Llama\_3.1\_8B                             | Fast, instruction-optimized open-source model.                                                                     |
| Mistral\_Nemo                                    | Small, Apache-licensed model built with NVIDIA.                                                                    |
| Mistral\_Large                                   | Top-tier reasoning model with strong multilingual support.                                                         |
| Mistral\_Medium                                  | A powerful, cost-effective, frontier-class multimodal model.                                                       |
| Mistral\_Small\_3                                | Latest enterprise-grade small model with improved reasoning.                                                       |
| Mistral\_Codestral                               | Specialized model for code-related tasks and testing.                                                              |
| Groq\_Kimi\_K2\_Instruct                         | Kimi K2 is a powerful and versatile AI model designed for a wide range of tasks.                                   |
| Groq\_Qwen3-32B                                  | The latest generation of large language models in the Qwen series.                                                 |
| Google\_Gemini\_3.1\_Flash\_Lite                 | Ultra-fast, cost-effective model for high-volume tasks and lightweight agentic workflows.                          |
| Google\_Gemini\_3\_Flash                         | Fast thinking model with strong balance of speed, performance, and value.                                          |
| Google\_Gemini\_3.1\_Pro                         | Next generation thinking model for complex problem solving.                                                        |
| Google\_Gemini\_2.5\_Pro                         | Previous generation thinking model for complex problem solving.                                                    |
| Google\_Gemini\_2.5\_Flash                       | Fast, well-rounded thinking model.                                                                                 |
| Google\_Gemini\_2.5\_Flash\_Lite                 | Fast model optimized for large-scale text output.                                                                  |
| Together\_AI\_Qwen3-235B-A22B-Instruct-2507-tput | A varied model with enhanced reasoning.                                                                            |
| Together\_AI\_DeepSeek-R1                        | Open-source model matching OpenAI-o1 performance.                                                                  |
| Together\_AI\_DeepSeek-V3                        | Advanced Mixture-of-Experts model.                                                                                 |
| Together\_AI\_Kimi\_K2.5                         | Kimi K2.5 is an advanced multimodal AI model with improved reasoning and instruction-following capabilities.       |
| xAI\_Grok-4.1\_Fast                              | xAI's best agentic tool calling model that shines in real-world use cases like customer support and deep research. |
| xAI\_Grok-4.20                                   | xAI's advanced reasoning model with enhanced capabilities.                                                         |
| xAI\_Grok-4                                      | Advanced language model with enhanced reasoning and tool capabilities.                                             |
| xAI\_Grok-4\_Fast                                | xAI's latest advancement in cost-efficient reasoning models.                                                       |
| xAI\_Grok\_Code\_Fast\_1                         | Grok Code Fast 1 is xAI's Coding Agent focused model                                                               |
| xAI\_Grok-3\_Beta                                | Enterprise-focused model for data, coding, and summarization tasks.                                                |
| xAI\_Grok-3\_Mini\_Beta                          | Fast, lightweight model for logic-based tasks.                                                                     |

If a model isn't available to the user (or has been disabled by the user), Raycast will fallback to a similar one.

### AI.AskOptions

#### Properties

| Property   | Description                                                                                                                                                                                                                                                      | Type                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| creativity | Concrete tasks, such as fixing grammar, require less creativity while open-ended questions, such as generating ideas, require more. If a number is passed, it needs to be in the range 0-2. For larger values, 2 will be used. For lower values, 0 will be used. | [`AI.Creativity`](#ai.creativity)                                             |
| model      | The AI model to use to answer to the prompt.                                                                                                                                                                                                                     | [`AI.Model`](#ai.model)                                                       |
| signal     | Abort signal to cancel the request.                                                                                                                                                                                                                              | [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) |
