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

| Model                             | Description                                                                                                                                                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenAI_GPT4                       | GPT-4 is the model with broad general knowledge, allowing it to follow complex instructions and solve difficult problems. This model is the previous generation, use GPT-4o for better results.                              |
| OpenAI_GPT4-turbo                 | GPT-4 Turbo is an evolution of the GPT-4 model with a larger context. This model is the previous generation, use GPT-4o for better results.                                                                                  |
| OpenAI_GPT4o                      | GPT-4o is the most advanced and fastest model from OpenAI, making it a great choice for complex everyday problems and deeper conversations.                                                                                  |
| OpenAI_GPT4o-mini                 | GPT-4o mini is a highly intelligent and fast model that is ideal for a variety of everyday tasks.                                                                                                                            |
| OpenAI_o1-preview                 | OpenAI o1-preview is an advanced reasoning model designed to tackle complex problems in science, coding, mathematics, and similar fields.                                                                                    |
| OpenAI_o1-mini                    | OpenAI o1-mini is a faster, more cost-effective reasoning model particularly effective at coding tasks.                                                                                                                      |
| OpenAI_o1                         | OpenAI o1 is an advanced reasoning model designed to tackle complex problems in science, coding, mathematics, and similar fields.                                                                                            |
| OpenAI_o3-mini                    | OpenAI o3-mini is a fast and powerful reasoning model optimized for STEM tasks like science, math, and coding. It offers advanced features like web search making it ideal for complex problem-solving with reduced latency. |
| Anthropic_Claude_Haiku            | Claude 3.5 Haiku is Anthropic's fastest model, with a large context window that makes it ideal for analyzing code, documents, or large amounts of text.                                                                      |
| Anthropic_Claude_Sonnet           | Claude 3.5 Sonnet from Anthropic has enhanced intelligence with increased speed. It excels at complex tasks like visual reasoning or workflow orchestrations. Currently points to claude-3-5-sonnet-20241022                 |
| Anthropic_Claude_Opus             | Claude 3 Opus is Anthropic's intelligent model designed to solve highly complex tasks. It stands out for its remarkable fluency.                                                                                             |
| Perplexity_Sonar                  | Lightweight Perplexity model with search grounding, quicker than Sonar Pro                                                                                                                                                   |
| Perplexity_Sonar_Pro              | Premier Perplexity model with search grounding, supporting advanced queries and follow-ups                                                                                                                                   |
| Perplexity_Sonar_Reasoning        | Lightweight reasoning offering powered by reasoning models trained with DeepSeek R1.                                                                                                                                         |
| Perplexity_Sonar_Reasoning_Pro    | Premier reasoning offering powered by DeepSeek R1.                                                                                                                                                                           |
| Llama3.3_70B                      | Llama 3.3 70B is an open-source model from Meta, state-of-the-art in areas like reasoning, math, and general knowledge.                                                                                                      |
| Llama3.1_8B                       | Llama 3.1 8B is an open-source model from Meta, optimized for instruction following and high-speed performance.                                                                                                              |
| Llama3_70B                        | Llama 3 70B from Meta is a highly capable open-source LLM that can serve as a tool for various text-related tasks.                                                                                                           |
| Llama3.1_405B                     | Llama 3.1 405B is Meta's flagship open-source model, offering unparalleled capabilities in general knowledge, steerability, math, tool use, and multilingual translation.                                                    |
| MixtraL_8x7B                      | Mixtral 8x7B from Mistral is an open-source model that demonstrates high performance in generating code and text at an impressive speed.                                                                                     |
| Mistral_Nemo                      | Mistral Nemo is a small model built in collaboration with NVIDIA, and released under the Apache 2.0 license.                                                                                                                 |
| Mistral_Large                     | Mistral Large is Mistral's top-tier reasoning model for high-complexity tasks with stronger multilingual support. Currently points to mistral-large-2411                                                                     |
| Mistral_Small                     | Mistral Small is Mistral's latest enterprise-grade small model that delivers significant improvements in human alignment, reasoning capabilities, and code. Currently points to mistral-small-2501                           |
| Mistral_Codestral                 | Codestral is Mistral's cutting-edge language model that specializes in low-latency, high-frequency tasks such as fill-in-the-middle (FIM), code correction and test generation. Currently points to codestral-2501           |
| DeepSeek_R1                       | Fully open-source model with performance on par with OpenAI-o1                                                                                                                                                               |
| DeepSeek_R1_Distill_Llama_3.3_70B | DeepSeek R1 Distill Llama 3.3 70B is a fine-tuned version of Llama 3.3 70B, leveraging DeepSeek-R1's advanced capabilities for enhanced reasoning and precision.                                                             |
| Google_Gemini_1.5_Flash           | Google's fastest multimodal model with exceptional speed and efficiency for quick, high-frequency tasks                                                                                                                      |
| Google_Gemini_1.5_Pro             | Google's high-performing multimodal model for complex tasks requiring deep reasoning and nuanced understanding                                                                                                               |
| Google_Gemini_2.0_Flash           | Google's powerful workhorse model with low latency and enhanced performance, built to power agentic experiences                                                                                                              |
| Google_Gemini_2.0_Flash_Thinking  | Gemini 2.0 Flash Thinking is an experimental model that generates its internal reasoning process, enabling stronger analytical capabilities                                                                                  |
| xAI_Grok_2                        | Grok-2 is xAI's frontier language model with state-of-the-art reasoning capabilities                                                                                                                                         |

If a model isn't available to the user, Raycast will fallback to a similar one:

- `AI.Model.OpenAI_GPT4`, `AI.Model["OpenAI_GPT4-turbo"]`, and `AI.Model.OpenAI_GPT4o` -> `AI.Model["OpenAI_GPT4o-mini"]`
- `AI.Model["OpenAI_o1-preview"]`, `AI.Model["OpenAI_o1-mini"]`, and `AI.Model.OpenAI_o1` -> `AI.Model["OpenAI_GPT4o-mini"]`
- `AI.Model.Anthropic_Claude_Opus` and `AI.Model.Anthropic_Claude_Sonnet` -> `AI.Model.Anthropic_Claude_Haiku`
- `AI.Model.Perplexity_Sonar_Pro` -> `AI.Model.Perplexity_Sonar`
- `AI.Model.Mistral_Large` -> `AI.Model.Mistral_Nemo`
- `AI.Model["Llama3.1_405B"]` -> `AI.Model["Llama3.3_70B"]`
- `AI.Model["Google_Gemini_1.5_Pro"]` -> `AI.Model["Google_Gemini_1.5_Flash"]`
- `AI.Model.DeepSeek_R1` -> `AI.Model["DeepSeek_R1_Distill_Llama_3.3_70B"]`
- `AI.Model.xAI_Grok_2` -> `AI.Model["OpenAI_GPT4o-mini"]`

### AI.AskOptions

#### Properties

<InterfaceTableFromJSDoc name="AI.AskOptions" />
