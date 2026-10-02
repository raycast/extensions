---
description: This guide explains how an extension can provide AI models to Raycast.
---

# Provide AI Models

Extensions can act as model providers: they tell Raycast which AI models they can serve, and Raycast makes those models available everywhere users pick a model — AI Chat, Quick AI, and AI Commands. This is how local model runtimes (such as Ollama or other on-device inference engines) or custom gateways integrate with Raycast.

{% hint style="info" %}

Using models provided by extensions requires a Raycast Pro plan.

Provided models run through your extension's code. After installing the extension, users allow it to provide models from the model picker or with the "Allow AI Models" toggle in the extension's settings. Either action immediately discovers models, guiding users through required preferences and sign-in only when needed. If setup is interrupted, users can return to the picker to finish it. Once setup is complete, Raycast periodically runs the provider entry point in the background to discover and refresh models.

{% endhint %}

## Declare the entry point

Add `ai.modelProvider` to your extension's manifest. The value maps to a file in `src`, like command entry points:

```json
{
  "ai": {
    "modelProvider": "models"
  }
}
```

The entry point file (here `src/models.ts`) must have two named exports: `getModels` and `streamCompletion`.

## getModels

Raycast calls `getModels` to discover the models your extension currently provides — during user-initiated setup, periodically in the background after the user has allowed access and completed setup, and whenever you call [`AI.refreshModels`](../api-reference/ai.md#ai.refreshmodels) for an enabled provider.

```typescript
import { AI } from "@raycast/api";

export const getModels: AI.GetModels = () => {
  return [
    {
      id: "llama-3.3-70b",
      title: "Llama 3.3 70B",
      isLocal: true,
      description: "Runs fully on-device.",
      capabilities: {
        systemMessage: { supported: true },
        temperature: { supported: true },
        streaming: { supported: true },
        tools: { supported: true },
        vision: { mediaTypes: ["image/png", "image/jpeg"] },
      },
      contextWindow: 128000,
      sizeInBytes: 40_000_000_000,
    },
  ];
};
```

Each model is an [`AI.RegisteredModel`](#ai.registeredmodel). The `id` only needs to be unique within your extension.

## streamCompletion

Raycast calls `streamCompletion` whenever a user sends a request to one of your models. It receives the model and the request, and returns a stream of the response.

The request messages follow the [Vercel AI SDK](https://sdk.vercel.ai) `ModelMessage` shape. Tool input schemas arrive as plain JSON Schema objects, so wrap them with the AI SDK's `jsonSchema()` helper before passing them to `streamText`:

{% tabs %} {% tab title="AI SDK" %}

```typescript
import { AI } from "@raycast/api";
import { jsonSchema, streamText } from "ai";
import { createOllama } from "ollama-ai-provider";

const ollama = createOllama();

export const streamCompletion: AI.StreamCompletion = (model, request) => {
  const tools = request.tools
    ? Object.fromEntries(
        Object.entries(request.tools).map(([name, tool]) => [
          name,
          {
            ...tool,
            inputSchema: jsonSchema(
              (tool.inputSchema ?? { type: "object", properties: {} }) as Parameters<typeof jsonSchema>[0],
            ),
          },
        ]),
      )
    : undefined;

  return streamText({
    model: ollama(model.id),
    system: request.system,
    messages: request.messages ?? [],
    temperature: request.temperature,
    tools,
    toolChoice: request.toolChoice,
  });
};
```

{% endtab %} {% tab title="Text stream" %}

```typescript
import { AI } from "@raycast/api";

export const streamCompletion: AI.StreamCompletion = async function* (model, request) {
  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    body: JSON.stringify({ model: model.id, messages: request.messages }),
  });

  // Yield plain strings to stream text chunks.
  for await (const chunk of parseChunks(response)) {
    yield chunk;
  }
};
```

{% endtab %} {% endtabs %}

You can return an AI SDK `streamText` result, a `ReadableStream`, or an async iterable. Streamed values can be plain strings or AI SDK stream parts (`text-delta`, `reasoning-delta`, `tool-call`, `source`, `finish`, …), so reasoning, tool calls, and citations are forwarded to the Raycast UI.

### Vision

Declare the `vision` capability to receive user image attachments. Attachments arrive as `file` content parts on user messages, with base64 `data` and a `mediaType` matching one of your declared formats:

```typescript
{
  role: "user",
  content: [
    { type: "text", text: "What is in this image?" },
    { type: "file", data: "<base64>", mediaType: "image/png" },
  ],
}
```

Attachments in formats you don't declare are dropped, and models without the `vision` capability receive text-only messages.

### Tools

Declare the `tools` capability to receive tool definitions on the request when users bring AI Extensions into the conversation. Emit standard AI SDK tool-call parts in your stream; Raycast executes the tools and continues the conversation.

### Provider options

Raycast passes request context in `request.providerOptions.raycast`. The options and their individual fields are optional:

| Property | Description | Type |
| :-- | :-- | :-- |
| `locale` | The locale supplied with the request. | `string` |
| `currentDate` | The current date supplied with the request. | `string` |
| `reasoningEffort` | The reasoning effort requested for the model. Declare the supported levels with `capabilities.reasoningEffort`. | `string` |

The `raycast` namespace carries Raycast context; AI SDK providers do not automatically translate it into their own options. Read the values you support and map them to your provider's namespace and accepted values. For example, when using the [AI SDK OpenAI provider](https://ai-sdk.dev/providers/ai-sdk-providers/openai) with a model that accepts the same reasoning effort values:

```typescript
const reasoningEffort = request.providerOptions?.raycast.reasoningEffort;
const providerOptions = reasoningEffort === undefined ? undefined : { openai: { reasoningEffort } };
```

Pass the resulting `providerOptions` to `streamText`. Other providers may use a different namespace, option name, or value format. Forwarding `request.providerOptions` unchanged will not apply Raycast's reasoning effort setting to those providers.

## Refreshing models

When the set of available models changes outside a regular refresh — for example after the user downloads a new local model through one of your commands — call [`AI.refreshModels`](../api-reference/ai.md#ai.refreshmodels) to make Raycast re-run `getModels`:

```typescript
import { AI, showHUD } from "@raycast/api";

export default async function command() {
  await downloadModel("llama-3.3-70b");
  await AI.refreshModels();
  await showHUD("Model installed");
}
```

`AI.refreshModels` is available in commands and tools, not inside the provider entry point itself.

## Using your models with AI.ask

Your extension can target its own provided models from [`AI.ask`](../api-reference/ai.md#ai.ask) by passing the local model `id`:

```typescript
const answer = await AI.ask("Suggest 5 jazz songs", { model: { id: "llama-3.3-70b" } });
```

Other extensions cannot use your models through `AI.ask`; users can select them anywhere models are picked.

## Types

### AI.RegisteredModel

A serializable description of a model your extension provides.

| Property | Description | Type |
| :-- | :-- | :-- |
| id<mark style="color:red;">\*</mark> | Unique identifier within your extension. | `string` |
| title<mark style="color:red;">\*</mark> | Display name shown in model pickers. | `string` |
| icon | Icon shown in model pickers. | [`Image.ImageLike`](../api-reference/user-interface/icons-and-images.md) |
| description | Short description shown in model pickers. | `string` |
| isLocal | Whether the model runs on-device. | `boolean` |
| capabilities | What the model supports. See below. | `AI.RegisteredModel["capabilities"]` |
| contextWindow | The context window of the model in tokens. | `number` |
| sizeInBytes | The size of the model on disk. Mostly relevant for local models. | `number` |

#### Capabilities

| Property | Description | Type |
| :-- | :-- | :-- |
| systemMessage | Whether the model accepts a system prompt. | `{ supported: boolean }` |
| temperature | Whether the model accepts a temperature. | `{ supported: boolean }` |
| streaming | Whether the model streams its responses. | `{ supported: boolean }` |
| tools | Whether the model supports tool calling. | `{ supported: boolean }` |
| reasoningEffort | Reasoning effort levels the model exposes. | `{ supported: boolean; options: string[]; default: string }` |
| vision | Image media types the model accepts. | `{ mediaTypes: ("image/png" \| "image/jpeg" \| "image/webp" \| "image/gif")[] }` |

### AI.GetModels

The type of the `getModels` export: `() => AI.RegisteredModel[] | Promise<AI.RegisteredModel[]>`.

### AI.StreamCompletion

The type of the `streamCompletion` export: `(model: AI.RegisteredModel, request: AI.ModelRequest) => AI.ModelStream | Promise<AI.ModelStream>`.
