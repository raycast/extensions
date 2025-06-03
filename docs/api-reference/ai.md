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

The AI model to use to answer to the prompt. Defaults to `AI.Model["OpenAI_GPT3.5-turbo"]`.

#### Enumeration members

| Model                             | Description                                                                            |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| OpenAI_GPT4.1                     | OpenAI's flagship model optimized for complex problem solving.                         |
| OpenAI_GPT4.1-mini                | Balanced GPT-4.1 variant optimized for speed and cost efficiency.                      |
| OpenAI_GPT4.1-nano                | Fastest and most cost-effective GPT-4.1 variant.                                       |
| OpenAI_GPT4                       | Previous generation GPT-4 model with broad knowledge and complex instruction handling. |
| OpenAI_GPT4-turbo                 | Previous generation GPT-4 with expanded context window.                                |
| OpenAI_GPT4o                      | Advanced OpenAI model optimized for speed and complex problem solving.                 |
| OpenAI_GPT4o-mini                 | Fast and intelligent model for everyday tasks.                                         |
| OpenAI_o3                         | Advanced model excelling in math, science, coding, and visual tasks.                   |
| OpenAI_o4-mini                    | Fast, efficient model optimized for coding and visual tasks.                           |
| OpenAI_o1                         | Advanced reasoning model for complex STEM problems.                                    |
| OpenAI_o3-mini                    | Fast reasoning model optimized for STEM tasks.                                         |
| Anthropic_Claude_Haiku            | Anthropic's fastest model with large context window for code and text analysis.        |
| Anthropic_Claude_Sonnet           | Enhanced Claude model for complex tasks and visual reasoning.                          |
| Anthropic_Claude_Sonnet_3.7       | Anthropic's most intelligent model.                                                    |
| Anthropic_Claude_Opus             | Anthropic's model for complex tasks with exceptional fluency.                          |
| Perplexity_Sonar                  | Fast Perplexity model with integrated search capabilities.                             |
| Perplexity_Sonar_Pro              | Advanced Perplexity model for complex queries with search integration.                 |
| Perplexity_Sonar_Reasoning        | Fast reasoning model powered by DeepSeek R1.                                           |
| Perplexity_Sonar_Reasoning_Pro    | Premium reasoning model with DeepSeek R1 capabilities.                                 |
| Llama4_Scout                      | Advanced 17B parameter multimodal model with 16 experts.                               |
| Llama3.3_70B                      | Meta's state-of-the-art model for reasoning and general knowledge.                     |
| Llama3.1_8B                       | Fast, instruction-optimized open-source model.                                         |
| Llama3_70B                        | Capable open-source LLM for text-related tasks.                                        |
| Llama3.1_405B                     | Meta's flagship model with advanced capabilities across multiple domains.              |
| Mistral_Nemo                      | Small, Apache-licensed model built with NVIDIA.                                        |
| Mistral_Large                     | Top-tier reasoning model with strong multilingual support.                             |
| Mistral_Small                     | Latest enterprise-grade small model with improved reasoning.                           |
| Mistral_Codestral                 | Specialized model for code-related tasks and testing.                                  |
| DeepSeek_R1_Distill_Llama_3.3_70B | Fine-tuned Llama model with enhanced reasoning capabilities.                           |
| Google_Gemini_2.5_Pro             | Advanced thinking model for complex problem solving.                                   |
| Google_Gemini_2.5_Flash           | Fast, well-rounded thinking model.                                                     |
| Google_Gemini_2.0_Flash           | Low-latency model optimized for agentic experiences.                                   |
| Google_Gemini_2.0_Flash_Thinking  | Experimental model with enhanced analytical capabilities.                              |
| DeepSeek_R1                       | Open-source model matching OpenAI-o1 performance.                                      |
| DeepSeek_V3                       | Advanced Mixture-of-Experts model.                                                     |
| xAI_Grok_3                        | Enterprise-focused model for data, coding, and summarization tasks.                    |
| xAI_Grok_3_Mini                   | Fast, lightweight model for logic-based tasks.                                         |
| xAI_Grok_2                        | Advanced language model with strong reasoning capabilities.                            |

If a model isn't available to the user, Raycast will fallback to a similar one:

- `AI.Model.OpenAI_GPT4`, `AI.Model["OpenAI_GPT4-turbo"]`, and `AI.Model.OpenAI_GPT4o` -> `AI.Model["OpenAI_GPT4o-mini"]`
- `AI.Model.OpenAI_o1` -> `AI.Model["OpenAI_GPT4o-mini"]`
- `AI.Model.Anthropic_Claude_Opus`, `AI.Model.Anthropic_Claude_Sonnet`, and `AI.Model["Anthropic_Claude_Sonnet_3.7"]` -> `AI.Model.Anthropic_Claude_Haiku`
- `AI.Model.Perplexity_Sonar_Pro` -> `AI.Model.Perplexity_Sonar`
- `AI.Model.Mistral_Large` -> `AI.Model.Mistral_Nemo`
- `AI.Model["Llama3.1_405B"]` -> `AI.Model["Llama3.3_70B"]`
- `AI.Model.DeepSeek_R1` -> `AI.Model["DeepSeek_R1_Distill_Llama_3.3_70B"]`
- `AI.Model.xAI_Grok_2` -> `AI.Model["OpenAI_GPT4o-mini"]`
- `AI.Model.xAI_Grok_3` -> `AI.Model.xAI_Grok_3_Mini`
- `AI.Model["Google_Gemini_2.5_Pro"]` -> `AI.Model["Google_Gemini_2.5_Flash"]`

### AI.AskOptions

#### Properties

<InterfaceTableFromJSDoc name="AI.AskOptions" />
