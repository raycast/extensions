# AI

The AI API provides developers with seamless access to AI functionality without requiring API keys, configuration, or extra dependencies.

{% hint style="info" %}

Some users might not have access to this API. If a user doesn't have access to Raycast AI, they will be asked if they want to get access when your extension calls the AI API. If the user doesn't wish to get access, the API call will throw an error.

You can check if a user has access to the API using [`environment.canAccess(AI)`](./environment.md).

{% endhint %}

## API Reference

### AI.ask

Ask AI anything you want. Use this in “no-view” Commands, effects, or callbacks. In a React component, you might want to use the [`useAI` util hook](../utils-reference/react-hooks/useAI.md) instead.

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

| Name                          | Description                                                                                                                                                         |
| :---------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OpenAI_GPT3.5-turbo           | GPT-3.5 Turbo is OpenAI’s fastest model, making it ideal for tasks that require quick response times with basic language processing capabilities.                   |
| OpenAI_GPT4                   | GPT-4 is OpenAI’s most capable model with broad general knowledge, allowing it to follow complex instructions and solve difficult problems.                         |
| OpenAI_GPT4-turbo             | GPT-4 Turbo from OpenAI has a big context window that fits hundreds of pages of text, making it a great choice for workloads that involve longer prompts.           |
| OpenAI_GPT4o                  | GPT-4o is the most advanced and fastest model from OpenAI, making it a great choice for complex everyday problems and deeper conversations.                         |
| Anthropic_Claude_Haiku        | Claude 3 Haiku is Anthropic's fastest model, with a large context window that makes it ideal for analyzing code, documents, or large amounts of text.               |
| Anthropic_Claude_Sonnet       | Claude 3 Sonnet from Anthropic strikes a balance between speed and intelligence, making it an ideal assistant for daily tasks like coding and copywriting.          |
| Anthropic_Claude_Opus         | Claude 3 Opus is Anthropic's most intelligent model, with best-in-market performance on highly complex tasks. It stands out for remarkable fluency.                 |
| Perplexity_Llama3_Sonar_Small | Perplexity's Llama 3 Sonar Small is built for speed. It quickly gives you helpful answers using the latest internet knowledge while minimizing hallucinations.      |
| Perplexity_Llama3_Sonar_Large | Perplexity's most advanced model, Llama 3 Sonar Large, can handle complex questions. It considers current web knowledge to provide well-reasoned, in-depth answers. |
| Llama3_70B                    | Llama 3 70B from Meta is the most capable openly available LLM which can serve as a tool for various text-related tasks. Powered by Groq.                           |
| MixtraL_8x7B                  | Mixtral 8x7B from Mistral is an open-source model that demonstrates high performance in generating code and text at an impressive speed. Powered by Groq.           |

If a model isn't available to the user, Raycast will fallback to a similar one:

- `AI.Model.Anthropic_Claude_Opus` and `AI.Model.Anthropic_Claude_Sonnet` -> `AI.Model.Anthropic_Claude_Haiku`
- `AI.Model.OpenAI_GPT4` and `AI.Model["OpenAI_GPT4-turbo"]` -> `AI.Model["OpenAI_GPT3.5-turbo"]`
- `AI.Model.Perplexity_Llama3_Sonar_Large` -> `AI.Model.Perplexity_Llama3_Sonar_Small`

### AI.AskOptions

#### Properties

<InterfaceTableFromJSDoc name="AI.AskOptions" />
