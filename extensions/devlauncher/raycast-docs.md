---
description: Start building your perfect tools with the Raycast API.
---

# Introduction

Welcome, developers! Our docs cover guides, examples, references, and more to help you build extensions and share them with [our community](https://raycast.com/community) and [your team](teams/getting-started.md).

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/introduction-hello-world.webp)

The Raycast Platform consists of two parts:

- **API:** This allows developers to build rich extensions with React, Node.js, and TypeScript. The docs explain how to use the API to build top-notch experiences.
- **Store:** This lets developers share their extensions with all Raycast users. You'll learn how to [publish your extension](basics/publish-an-extension.md).

## Key features

Here are a few points that make our ecosystem special:

- **Powerful and familiar tooling:** Extensions are built with TypeScript, React, and Node. Leverage npm's ecosystem to quickly build what you imagine.
- **No-brainer to build UI:** You concentrate on the logic, we push the pixels. Use our built-in UI components to be consistent with all our extensions.
- **Collaborate with our community:** Build your extension, share it with our community, and get inspired by others.
- **Developer experience front and foremost:** A strongly typed API, hot-reloading, and modern tooling that makes it a blast to work with.
- **Easy to start, flexible to scale:** Start with a simple script, add a static UI or use React to go wild. Anything goes.

## Overview

A quick overview about where to find what in our docs:

- [**Basics:**](basics/getting-started.md) Go over this section to learn how to build extensions in our step-by-step guides.
- [**Teams:**](teams/getting-started.md) Build and share extensions with your teammates to speed up common workflows.
- [**Examples:**](examples/doppler.md) Kickstart your extension by using an open-source example and learn as you go.
- [**Information:**](information/best-practices.md) Get the background knowledge to master your understanding of our platform.
- [**API Reference:**](api-reference/ai.md) Go into details with the API reference that includes code snippets.
- [**Utilities:**](utils-reference/getting-started.md) A set of utilities to streamline common patterns and operations used in extensions.

Now, let's build 💪


# Table of contents

- [Introduction](README.md)

## Basics

- [Getting Started](basics/getting-started.md)
- [Create Your First Extension](basics/create-your-first-extension.md)
- [Contribute to an Extension](basics/contribute-to-an-extension.md)
- [Prepare an Extension for Store](basics/prepare-an-extension-for-store.md)
- [Publish an Extension](basics/publish-an-extension.md)
- [Debug an Extension](basics/debug-an-extension.md)
- [Install an Extension](basics/install-an-extension.md)
- [Review an Extension in a Pull Request](basics/review-pullrequest.md)

## Teams

- [Getting Started](teams/getting-started.md)
- [Publish a Private Extension](teams/publish-a-private-extension.md)
- [Collaborate on Private Extensions](teams/collaborate-on-private-extensions.md)

## Examples

- [Doppler Share Secrets](examples/doppler.md)
- [Hacker News](examples/hacker-news.md)
- [Todo List](examples/todo-list.md)
- [Spotify Controls](examples/spotify-controls.md)

## Information

- [Terminology](information/terminology.md)
- [File Structure](information/file-structure.md)
- [Manifest](information/manifest.md)
- [Lifecycle](information/lifecycle/README.md)
  - [Arguments](information/lifecycle/arguments.md)
  - [Background Refresh](information/lifecycle/background-refresh.md)
  - [Deeplinks](information/lifecycle/deeplinks.md)
- [Best Practices](information/best-practices.md)
- [Developer Tools](information/developer-tools/README.md)
  - [Manage Extensions Command](information/developer-tools/manage-extensions-command.md)
  - [CLI](information/developer-tools/cli.md)
  - [ESLint](information/developer-tools/eslint.md)
  - [VS Code (community tool)](information/developer-tools/vscode.md)
- [Security](information/security.md)
- [Versioning](information/versioning.md)

## API Reference

- [AI](api-reference/ai.md)
- [Browser Extension](api-reference/browser-extension.md)
- [Cache](api-reference/cache.md)
- [Command](api-reference/command.md)
- [Clipboard](api-reference/clipboard.md)
- [Environment](api-reference/environment.md)
- [Feedback](api-reference/feedback/README.md)
  - [Alert](api-reference/feedback/alert.md)
  - [HUD](api-reference/feedback/hud.md)
  - [Toast](api-reference/feedback/toast.md)
- [Keyboard](api-reference/keyboard.md)
- [Menu Bar Commands](api-reference/menu-bar-commands.md)
- [OAuth](api-reference/oauth.md)
- [Preferences](api-reference/preferences.md)
- [Storage](api-reference/storage.md)
- [System Utilities](api-reference/utilities.md)
- [User Interface](api-reference/user-interface/README.md)
  - [Action Panel](api-reference/user-interface/action-panel.md)
  - [Actions](api-reference/user-interface/actions.md)
  - [Detail](api-reference/user-interface/detail.md)
  - [Form](api-reference/user-interface/form.md)
  - [List](api-reference/user-interface/list.md)
  - [Grid](api-reference/user-interface/grid.md)
  - [Colors](api-reference/user-interface/colors.md)
  - [Icons & Images](api-reference/user-interface/icons-and-images.md)
  - [Navigation](api-reference/user-interface/navigation.md)
- [Raycast Window & Search Bar](api-reference/window-and-search-bar.md)
- [Window Management](api-reference/window-management.md)

## Misc

- [Changelog](changelog.md)
- [Migration](migration/README.md)
  - [v1.28.0](migration/v1.28.0.md)
  - [v1.31.0](migration/v1.31.0.md)
  - [v1.37.0](migration/v1.37.0.md)
  - [v1.42.0](migration/v1.42.0.md)
  - [v1.48.8](migration/v1.48.8.md)
  - [v1.50.0](migration/v1.50.0.md)
  - [v1.51.0](migration/v1.51.0.md)
  - [v1.59.0](migration/v1.59.0.md)
- [FAQ](faq.md)


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

| Model | Description |
|-------|-------------|
| OpenAI_GPT4 | GPT-4 is OpenAI's most capable model with broad general knowledge, allowing it to follow complex instructions and solve difficult problems. |
| OpenAI_GPT4-turbo | GPT-4 Turbo from OpenAI has a big context window that fits hundreds of pages of text, making it a great choice for workloads that involve longer prompts. |
| OpenAI_GPT4o | GPT-4o is the most advanced and fastest model from OpenAI, making it a great choice for complex everyday problems and deeper conversations. |
| OpenAI_GPT4o-mini | GPT-4o mini is a highly intelligent and fast model that is ideal for a variety of everyday tasks. |
| Anthropic_Claude_Haiku | Claude 3 Haiku is Anthropic's fastest model, with a large context window that makes it ideal for analyzing code, documents, or large amounts of text. |
| Anthropic_Claude_Sonnet | Claude 3.5 Sonnet from Anthropic has enhanced intelligence with increased speed. It excels at complex tasks like visual reasoning or workflow orchestrations. |
| Anthropic_Claude_Opus | Claude 3 Opus is Anthropic's most intelligent model, with best-in-market performance on highly complex tasks. It stands out for remarkable fluency. |
| Perplexity_Llama3.1_Sonar_Small | Perplexity's Llama 3.1 Sonar Small is built for speed. It quickly gives you helpful answers using the latest internet knowledge while minimizing hallucinations. |
| Perplexity_Llama3.1_Sonar_Large | Perplexity's advanced model. Can handle complex questions. It considers current web knowledge to provide well-reasoned, in-depth answers. |
| Perplexity_Llama3.1_Sonar_Huge | Perplexity's most advanced model. Offers performance that is on par with state of the art models today. |
| Llama3.1_70B | Llama 3.1 70B is a versatile open-source model from Meta suitable for complex reasoning tasks, multilingual interactions, and extensive text analysis. Powered by Groq. |
| Llama3.1_8B | Llama 3.1 8B is an open-source model from Meta, optimized for instruction following and high-speed performance. Powered by Groq. |
| Llama3_70B | Llama 3 70B from Meta is a highly capable open-source LLM that can serve as a tool for various text-related tasks. Powered by Groq. |
| Llama3.1_405B | Llama 3.1 405B is Meta's flagship open-source model, offering unparalleled capabilities in general knowledge, steerability, math, tool use, and multilingual translation. Powered by together.ai |
| MixtraL_8x7B | Mixtral 8x7B from Mistral is an open-source model that demonstrates high performance in generating code and text at an impressive speed. Powered by Groq. |
| Mistral_Nemo | Mistral Nemo is a small model built in collaboration with NVIDIA, and released under the Apache 2.0 license. |
| Mistral_Large2 | Mistral Large is Mistral's flagship model, capable of code generation, mathematics, and reasoning, with stronger multilingual support. |

If a model isn't available to the user, Raycast will fallback to a similar one:

- `AI.Model.Anthropic_Claude_Opus` and `AI.Model.Anthropic_Claude_Sonnet` -> `AI.Model.Anthropic_Claude_Haiku`
- `AI.Model.OpenAI_GPT4` and `AI.Model["OpenAI_GPT4-turbo"]` -> `AI.Model["OpenAI_GPT4o-mini"]`
- `AI.Model["Perplexity_Llama3.1_Sonar_Large"]` and `AI.Model["Perplexity_Llama3.1_Sonar_Huge"]` -> `AI.Model["Perplexity_Llama3.1_Sonar_Small"]`
- `AI.Model.Mistral_Large2` -> `AI.Model.Mistral_Nemo`

### AI.AskOptions

#### Properties

<InterfaceTableFromJSDoc name="AI.AskOptions" />


# Browser Extension

The Browser Extension API provides developers with deeper integration into the user's Browser _via_ a [Browser Extension](https://raycast.com/browser-extension).

{% hint style="info" %}

Some users might not have installed the Browser Extension. If a user doesn't have the Browser Extension installed, they will be asked if they want to install it when your extension calls the Browser Extension API. If the user doesn't wish to install it, the API call will throw an error.

You can check if a user has the Browser Extension installed using [`environment.canAccess(BrowserExtension)`](./environment.md).

{% endhint %}

## API Reference

### BrowserExtension.getContent

Get the content of an opened browser tab.

#### Signature

```typescript
async function getContent(options?: {
  cssSelector?: string;
  tabId?: number;
  format?: "html" | "text" | "markdown";
}): Promise<string>;
```

#### Example

{% tabs %}
{% tab title="Basic Usage" %}

```typescript
import { BrowserExtension, Clipboard } from "@raycast/api";

export default async function command() {
  const markdown = await BrowserExtension.getContent({ format: "markdown" });

  await Clipboard.copy(markdown);
}
```

{% endtab %}
{% tab title="CSS Selector" %}

```typescript
import { BrowserExtension, Clipboard } from "@raycast/api";

export default async function command() {
  const title = await BrowserExtension.getContent({ format: "text", cssSelector: "title" });

  await Clipboard.copy(title);
}
```

{% endtab %}
{% endtabs %}

#### Parameters

<FunctionParametersTableFromJSDoc name="BrowserExtension.getContent" />

#### Return

A Promise that resolves with the content of the tab.

### BrowserExtension.getTabs

Get the list of open browser tabs.

#### Signature

```typescript
async function getTabs(): Promise<Tab[]>;
```

#### Example

```typescript
import { BrowserExtension } from "@raycast/api";

export default async function command() {
  const tabs = await BrowserExtension.getTabs();
  console.log(tabs);
}
```

#### Return

A Promise that resolves with the list of [tabs](#browserextension.tab).

## Types

### BrowserExtension.Tab

#### Properties

<InterfaceTableFromJSDoc name="BrowserExtension.Tab" />


# Caching

Caching abstraction that stores data on disk and supports LRU (least recently used) access. Since extensions can only consume up to a max. heap memory size, the cache only maintains a lightweight index in memory and stores the actual data in separate files on disk in the extension's support directory.

## API Reference

### Cache

The `Cache` class provides CRUD-style methods (get, set, remove) to update and retrieve data synchronously based on a key. The data must be a string and it is up to the client to decide which serialization format to use.
A typical use case would be to use `JSON.stringify` and `JSON.parse`.

By default, the cache is shared between the commands of an extension. Use [Cache.Options](#cache.options) to configure a `namespace` per command if needed (for example, set it to [`environment.commandName`](./environment.md)).

#### Signature

```typescript
constructor(options: Cache.Options): Cache
```

#### Example

```typescript
import { List, Cache } from "@raycast/api";

type Item = { id: string; title: string };
const cache = new Cache();
cache.set("items", JSON.stringify([{ id: "1", title: "Item 1" }]));

export default function Command() {
  const cached = cache.get("items");
  const items: Item[] = cached ? JSON.parse(cached) : [];

  return (
    <List>
      {items.map((item) => (
        <List.Item key={item.id} title={item.title} />
      ))}
    </List>
  );
}
```

#### Properties

| Property                                  | Description                                              | Type                 |
| :---------------------------------------- | :------------------------------------------------------- | :------------------- |
| isEmpty<mark style="color:red;">\*</mark> | Returns `true` if the cache is empty, `false` otherwise. | <code>boolean</code> |

#### Methods

| Method                                                                                       |
| :------------------------------------------------------------------------------------------- |
| <code>[get(key: string): string \| undefined](#cache-get)</code>                             |
| <code>[has(key: string): boolean](#cache-has)</code>                                         |
| <code>[set(key: string, data: string): void](#cache-set)</code>                              |
| <code>[remove(key: string): boolean](#cache-remove)</code>                                   |
| <code>[clear(options = { notifySubscribers: true }): void](#cache-clear)</code>              |
| <code>[subscribe(subscriber: Cache.Subscriber): Cache.Subscription](#cache-subscribe)</code> |

### Cache#get

Returns the data for the given key. If there is no data for the key, `undefined` is returned.
If you want to just check for the existence of a key, use [has](#cache-has).

#### Signature

```typescript
get(key: string): string | undefined
```

#### Parameters

| Name                                  | Description                 | Type                |
| :------------------------------------ | :-------------------------- | :------------------ |
| key<mark style="color:red;">\*</mark> | The key of the Cache entry. | <code>string</code> |

### Cache#has

Returns `true` if data for the key exists, `false` otherwise.
You can use this method to check for entries without affecting the LRU access.

#### Signature

```typescript
has(key: string): boolean
```

#### Parameters

| Name                                  | Description                 | Type                |
| :------------------------------------ | :-------------------------- | :------------------ |
| key<mark style="color:red;">\*</mark> | The key of the Cache entry. | <code>string</code> |

### Cache#set

Sets the data for the given key.
If the data exceeds the configured `capacity`, the least recently used entries are removed.
This also notifies registered subscribers (see [subscribe](#cache-subscribe)).

#### Signature

```typescript
set(key: string, data: string)
```

#### Parameters

| Name                                   | Description                              | Type                |
| :------------------------------------- | :--------------------------------------- | :------------------ |
| key<mark style="color:red;">\*</mark>  | The key of the Cache entry.              | <code>string</code> |
| data<mark style="color:red;">\*</mark> | The stringified data of the Cache entry. | <code>string</code> |

### Cache#remove

Removes the data for the given key.
This also notifies registered subscribers (see [subscribe](#cache-subscribe)).
Returns `true` if data for the key was removed, `false` otherwise.

#### Signature

```typescript
remove(key: string): boolean
```

### Cache#clear

Clears all stored data.
This also notifies registered subscribers (see [subscribe](#cache-subscribe)) unless the `notifySubscribers` option is set to `false`.

#### Signature

```typescript
clear((options = { notifySubscribers: true }));
```

#### Parameters

| Name    | Description                                                                                                                | Type                |
| :------ | :------------------------------------------------------------------------------------------------------------------------- | :------------------ |
| options | Options with a `notifySubscribers` property. The default is `true`; set to `false` to disable notification of subscribers. | <code>object</code> |

### Cache#subscribe

Registers a new subscriber that gets notified when cache data is set or removed.
Returns a function that can be called to remove the subscriber.

#### Signature

```typescript
subscribe(subscriber: Cache.Subscriber): Cache.Subscription
```

#### Parameters

| Name       | Description                                                                                                                                                                                               | Type                                               |
| :--------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------- |
| subscriber | A function that is called when the Cache is updated. The function receives two values: the `key` of the Cache entry that was updated or `undefined` when the Cache is cleared, and the associated `data`. | <code>[Cache.Subscriber](#cache.subscriber)</code> |

## Types

### Cache.Options

The options for creating a new Cache.

#### Properties

<InterfaceTableFromJSDoc name="Cache.Options" />

### Cache.Subscriber

Function type used as parameter for [subscribe](#cache-subscribe).

```typescript
type Subscriber = (key: string | undefined, data: string | undefined) => void;
```

### Cache.Subscription

Function type returned from [subscribe](#cache-subscribe).

```typescript
type Subscription = () => void;
```


# Clipboard

Use the Clipboard APIs to work with content from your clipboard. You can write contents to the clipboard through [`Clipboard.copy`](clipboard.md#clipboard.copy) and clear it through [`Clipboard.clear`](clipboard.md#clipboard.clear). The [`Clipboard.paste`](clipboard.md#clipboard.paste) function inserts text at the current cursor position in your frontmost app.

The action [`Action.CopyToClipboard`](user-interface/actions.md#action.copytoclipboard) can be used to copy content of a selected list item to the clipboard and the action [`Action.Paste`](user-interface/actions.md#action.paste) can be used to insert text in your frontmost app.

## API Reference

### Clipboard.copy

Copies text or a file to the clipboard.

#### Signature

```typescript
async function copy(content: string | number | Content, options?: CopyOptions): Promise<void>;
```

#### Example

```typescript
import { Clipboard } from "@raycast/api";

export default async function Command() {
  // copy some text
  await Clipboard.copy("https://raycast.com");

  const textContent: Clipboard.Content = {
    text: "https://raycast.com",
  };
  await Clipboard.copy(textContent);

  // copy a file
  const file = "/path/to/file.pdf";
  try {
    const fileContent: Clipboard.Content = { file };
    await Clipboard.copy(fileContent);
  } catch (error) {
    console.log(`Could not copy file '${file}'. Reason: ${error}`);
  }

  // copy confidential data
  await Clipboard.copy("my-secret-password", { concealed: true });
}
```

#### Parameters

<FunctionParametersTableFromJSDoc name="Clipboard.copy" />

#### Return

A Promise that resolves when the content is copied to the clipboard.

### Clipboard.paste

Pastes text or a file to the current selection of the frontmost application.

#### Signature

```typescript
async function paste(content: string | Content): Promise<void>;
```

#### Example

```typescript
import { Clipboard } from "@raycast/api";

export default async function Command() {
  await Clipboard.paste("I really like Raycast's API");
}
```

#### Parameters

<FunctionParametersTableFromJSDoc name="Clipboard.paste" />

#### Return

A Promise that resolves when the content is pasted.

### Clipboard.clear

Clears the current clipboard contents.

#### Signature

```typescript
async function clear(): Promise<void>;
```

#### Example

```typescript
import { Clipboard } from "@raycast/api";

export default async function Command() {
  await Clipboard.clear();
}
```

#### Return

A Promise that resolves when the clipboard is cleared.

### Clipboard.read

Reads the clipboard content as plain text, file name, or HTML.

#### Signature

```typescript
async function read(options?: { offset?: number }): Promise<ReadContent>;
```

#### Example

```typescript
import { Clipboard } from "@raycast/api";

export default async () => {
  const { text, file, html } = await Clipboard.read();
  console.log(text);
  console.log(file);
  console.log(html);
};
```

#### Parameters

<FunctionParametersTableFromJSDoc name="Clipboard.read" />

#### Return

A promise that resolves when the clipboard content was read as plain text, file name, or HTML.

### Clipboard.readText

Reads the clipboard as plain text.

#### Signature

```typescript
async function readText(options?: { offset?: number }): Promise<string | undefined>;
```

#### Example

```typescript
import { Clipboard } from "@raycast/api";

export default async function Command() {
  const text = await Clipboard.readText();
  console.log(text);
}
```

#### Parameters

<FunctionParametersTableFromJSDoc name="Clipboard.readText" />

#### Return

A promise that resolves once the clipboard content is read as plain text.

## Types

### Clipboard.Content

Type of content that is copied and pasted to and from the Clipboard

```typescript
type Content =
  | {
      text: string;
    }
  | {
      file: PathLike;
    };
```

### Clipboard.ReadContent

Type of content that is read from the Clipboard

```typescript
type Content =
  | {
      text: string;
    }
  | {
      file?: string;
    }
  | {
      html?: string;
    };
```

### Clipboard.CopyOptions

Type of options passed to `Clipboard.copy`.

#### Properties

<InterfaceTableFromJSDoc name="Clipboard.CopyOptions" />


# Command-related Utilities

This set of utilities to work with Raycast commands.

## API Reference

### launchCommand

Launches another command. If the command does not exist, or if it's not enabled, an error will be thrown.
If the command is part of another extension, the user will be presented with a permission alert.
Use this method if your command needs to open another command based on user interaction,
or when an immediate background refresh should be triggered, for example when a command needs to update an associated menu-bar command.

#### Signature

```typescript
export async function launchCommand(options: LaunchOptions): Promise<void>;
```

#### Example

```typescript
import { launchCommand, LaunchType } from "@raycast/api";

export default async function Command() {
  await launchCommand({ name: "list", type: LaunchType.UserInitiated, context: { foo: "bar" } });
}
```

#### Parameters

<FunctionParametersTableFromJSDoc name="launchCommand" />

#### Return

A Promise that resolves when the command has been launched. (Note that this does not indicate that the launched command has finished executing.)

### updateCommandMetadata

Update the values of properties declared in the manifest of the current command. Note that currently only `subtitle` is supported. Pass `null` to clear the custom subtitle.

{% hint style="info" %}
The actual manifest file is not modified, so the update applies as long as the command remains installed.
{% endhint %}

#### Signature

```typescript
export async function updateCommandMetadata(metadata: { subtitle?: string | null }): Promise<void>;
```

#### Example

```typescript
import { updateCommandMetadata } from "@raycast/api";

async function fetchUnreadNotificationCount() {
  return 10;
}

export default async function Command() {
  const count = await fetchUnreadNotificationCount();
  await updateCommandMetadata({ subtitle: `Unread Notifications: ${count}` });
}
```

#### Return

A Promise that resolves when the command's metadata have been updated.

## Types

### LaunchContext

Represents the passed context object of programmatic command launches.

### LaunchOptions

A parameter object used to decide which command should be launched and what data (arguments, context) it should receive.

#### IntraExtensionLaunchOptions

The options that can be used when launching a command from the same extension.

<InterfaceTableFromJSDoc name="IntraExtensionLaunchOptions" />

#### InterExtensionLaunchOptions

The options that can be used when launching a command from a different extension.

<InterfaceTableFromJSDoc name="InterExtensionLaunchOptions" />


# Environment

The Environment APIs are useful to get context about the setup in which your command runs. You can get information about the extension and command itself as well as Raycast. Furthermore, a few paths are injected and are helpful to construct file paths that are related to the command's assets.

## API Reference

### environment

Contains environment values such as the Raycast version, extension info, and paths.

#### Example

```typescript
import { environment } from "@raycast/api";

export default async function Command() {
  console.log(`Raycast version: ${environment.raycastVersion}`);
  console.log(`Owner or Author name: ${environment.ownerOrAuthorName}`);
  console.log(`Extension name: ${environment.extensionName}`);
  console.log(`Command name: ${environment.commandName}`);
  console.log(`Command mode: ${environment.commandMode}`);
  console.log(`Assets path: ${environment.assetsPath}`);
  console.log(`Support path: ${environment.supportPath}`);
  console.log(`Is development mode: ${environment.isDevelopment}`);
  console.log(`Appearance: ${environment.appearance}`);
  console.log(`Text size: ${environment.textSize}`);
  console.log(`LaunchType: ${environment.launchType}`);
}
```

#### Properties

<InterfaceTableFromJSDoc name="Environment" />

## environment.canAccess

Checks whether the user can access a specific API or not.

#### Signature

```typescript
function canAccess(api: any): bool;
```

#### Example

```typescript
import { AI, showHUD, environment } from "@raycast/api";
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

#### Return

A Boolean indicating whether the user running the command has access to the API.

### getSelectedFinderItems

Gets the selected items from Finder.

#### Signature

```typescript
async function getSelectedFinderItems(): Promise<FileSystemItem[]>;
```

#### Example

```typescript
import { getSelectedFinderItems, showToast, Toast } from "@raycast/api";

export default async function Command() {
  try {
    const selectedItems = await getSelectedFinderItems();
    console.log(selectedItems);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot copy file path",
      message: String(error),
    });
  }
}
```

#### Return

A Promise that resolves with the [selected file system items](#filesystemitem). If Finder is not the frontmost application, the promise will be rejected.

### getSelectedText

Gets the selected text of the frontmost application.

#### Signature

```typescript
async function getSelectedText(): Promise<string>;
```

#### Example

```typescript
import { getSelectedText, Clipboard, showToast, Toast } from "@raycast/api";

export default async function Command() {
  try {
    const selectedText = await getSelectedText();
    const transformedText = selectedText.toUpperCase();
    await Clipboard.paste(transformedText);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot transform text",
      message: String(error),
    });
  }
}
```

#### Return

A Promise that resolves with the selected text. If no text is selected in the frontmost application, the promise will be rejected.

## Types

### FileSystemItem

Holds data about a File System item. Use the [getSelectedFinderItems](#getselectedfinderitems) method to retrieve values.

#### Properties

<InterfaceTableFromJSDoc name="FileSystemItem" />

### LaunchType

Indicates the type of command launch. Use this to detect whether the command has been launched from the background.

#### Enumeration members

| Name          | Description                                                |
| :------------ | :--------------------------------------------------------- |
| UserInitiated | A regular launch through user interaction                  |
| Background    | Scheduled through an interval and launched from background |


# Feedback

Raycast has several ways to provide feedback to the user:

- [Toast](./toast.md) _- when an asynchronous operation is happening or when an error is thrown_
- [HUD](./hud.md) _- to confirm an action worked after closing Raycast_
- [Alert](./alert.md) _- to ask for confirmation before taking an action_

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/toast.webp)


# Alert

When the user takes an important action (for example when irreversibly deleting something), you can ask for confirmation by using `confirmAlert`.

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/alert.webp)

## API Reference

### confirmAlert

Creates and shows a confirmation Alert with the given [options](#alert.options).

#### Signature

```typescript
async function confirmAlert(options: Alert.Options): Promise<boolean>;
```

#### Example

```typescript
import { confirmAlert } from "@raycast/api";

export default async function Command() {
  if (await confirmAlert({ title: "Are you sure?" })) {
    console.log("confirmed");
    // do something
  } else {
    console.log("canceled");
  }
}
```

#### Parameters

<FunctionParametersTableFromJSDoc name="confirmAlert" />

#### Return

A Promise that resolves to a boolean when the user triggers one of the actions.
It will be `true` for the primary Action, `false` for the dismiss Action.

## Types

### Alert.Options

The options to create an Alert.

#### Example

```typescript
import { Alert, confirmAlert } from "@raycast/api";

export default async function Command() {
  const options: Alert.Options = {
    title: "Finished cooking",
    message: "Delicious pasta for lunch",
    primaryAction: {
      title: "Do something",
      onAction: () => {
        // while you can register a handler for an action, it's more elegant
        // to use the `if (await confirmAlert(...)) { ... }` pattern
        console.log("The alert action has been triggered");
      },
    },
  };
  await confirmAlert(options);
}
```

#### Properties

<InterfaceTableFromJSDoc name="Alert.Options" />

### Alert.ActionOptions

The options to create an Alert Action.

#### Properties

<InterfaceTableFromJSDoc name="Alert.ActionOptions" />

### Alert.ActionStyle

Defines the visual style of an Action of the Alert.

Use [Alert.ActionStyle.Default](#alert.actionstyle) for confirmations of a positive action.
Use [Alert.ActionStyle.Destructive](#alert.actionstyle) for confirmations of a destructive action (eg. deleting a file).

#### Enumeration members

| Name        | Value                                                    |
| :---------- | :------------------------------------------------------- |
| Default     | ![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/alert-action-default.webp)     |
| Destructive | ![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/alert-action-destructive.webp) |
| Cancel      | ![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/alert-action-cancel.webp)      |


# HUD

When the user takes an action that has the side effect of closing Raycast (for example when copying something in the [Clipboard](../clipboard.md)), you can use a HUD to confirm that the action worked properly.

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/hud.webp)

## API Reference

### showHUD

A HUD will automatically hide the main window and show a compact message at the bottom of the screen.

#### Signature

```typescript
async function showHUD(
  title: string,
  options?: { clearRootSearch?: boolean; popToRootType?: PopToRootType }
): Promise<void>;
```

#### Example

```typescript
import { showHUD } from "@raycast/api";

export default async function Command() {
  await showHUD("Hey there 👋");
}
```

`showHUD` closes the main window when called, so you can use the same options as `closeMainWindow`:

```typescript
import { PopToRootType, showHUD } from "@raycast/api";

export default async function Command() {
  await showHUD("Hey there 👋", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
}
```

#### Parameters

<FunctionParametersTableFromJSDoc name="showHUD" />

#### Return

A Promise that resolves when the HUD is shown.


# Toast

When an asynchronous operation is happening or when an error is thrown, it's usually a good idea to keep the user informed about it. Toasts are made for that.

Additionally, Toasts can have some actions associated to the action they are about. For example, you could provide a way to cancel an asynchronous operation, undo an action, or copy the stack trace of an error.

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/toast.webp)

## API Reference

### showToast

Creates and shows a Toast with the given [options](#toast.options).

#### Signature

```typescript
async function showToast(options: Toast.Options): Promise<Toast>;
```

#### Example

```typescript
import { showToast, Toast } from "@raycast/api";

export default async function Command() {
  const success = false;

  if (success) {
    await showToast({ title: "Dinner is ready", message: "Pizza margherita" });
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: "Dinner isn't ready",
      message: "Pizza dropped on the floor",
    });
  }
}
```

When showing an animated Toast, you can later on update it:

```typescript
import { showToast, Toast } from "@raycast/api";
import { setTimeout } from "timers/promises";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Uploading image",
  });

  try {
    // upload the image
    await setTimeout(1000);

    toast.style = Toast.Style.Success;
    toast.title = "Uploaded image";
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to upload image";
    if (err instanceof Error) {
      toast.message = err.message;
    }
  }
}
```

#### Parameters

<FunctionParametersTableFromJSDoc name="showToast" />

#### Return

A Promise that resolves with the shown Toast. The Toast can be used to change or hide it.

## Types

### Toast

A Toast with a certain style, title, and message.

Use [showToast](#showtoast) to create and show a Toast.

#### Properties

<InterfaceTableFromJSDoc name="Toast" />

#### Methods

| Name | Type                                | Description      |
| :--- | :---------------------------------- | :--------------- |
| hide | <code>() => Promise&lt;void></code> | Hides the Toast. |
| show | <code>() => Promise&lt;void></code> | Shows the Toast. |

### Toast.Options

The options to create a [Toast](#toast).

#### Example

```typescript
import { showToast, Toast } from "@raycast/api";

export default async function Command() {
  const options: Toast.Options = {
    style: Toast.Style.Success,
    title: "Finished cooking",
    message: "Delicious pasta for lunch",
    primaryAction: {
      title: "Do something",
      onAction: (toast) => {
        console.log("The toast action has been triggered");
        toast.hide();
      },
    },
  };
  await showToast(options);
}
```

#### Properties

<InterfaceTableFromJSDoc name="Toast.Options" />

### Toast.Style

Defines the visual style of the Toast.

Use [Toast.Style.Success](#toast.style) for confirmations and [Toast.Style.Failure](#toast.style) for displaying errors.
Use [Toast.Style.Animated](#toast.style) when your Toast should be shown until a process is completed.
You can hide it later by using [Toast.hide](#toast) or update the properties of an existing Toast.

#### Enumeration members

| Name     | Value                                          |
| :------- | :--------------------------------------------- |
| Animated | ![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/toast-animated.webp) |
| Success  | ![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/toast-success.webp)  |
| Failure  | ![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/toast-failure.webp)  |

### Toast.ActionOptions

The options to create a [Toast](#toast) Action.

#### Properties

<InterfaceTableFromJSDoc name="Toast.ActionOptions" />


# Keyboard

The Keyboard APIs are useful to make your actions accessible via the keyboard shortcuts. Shortcuts help users to use your command without touching the mouse.

## Types

### Keyboard.Shortcut

A keyboard shortcut is defined by one or more modifier keys (command, control, etc.) and a single key equivalent (a character or special key).

See [KeyModifier](#keyboard.keymodifier) and [KeyEquivalent](#keyboard.keyequivalent) for supported values.

#### Example

```typescript
import { Action, ActionPanel, Detail, Keyboard } from "@raycast/api";

export default function Command() {
  return (
    <Detail
      markdown="Let's play some games 👾"
      actions={
        <ActionPanel title="Game controls">
          <Action title="Up" shortcut={{ modifiers: ["opt"], key: "arrowUp" }} onAction={() => console.log("Go up")} />
          <Action
            title="Down"
            shortcut={{ modifiers: ["opt"], key: "arrowDown" }}
            onAction={() => console.log("Go down")}
          />
          <Action
            title="Left"
            shortcut={{ modifiers: ["opt"], key: "arrowLeft" }}
            onAction={() => console.log("Go left")}
          />
          <Action
            title="Right"
            shortcut={{ modifiers: ["opt"], key: "arrowRight" }}
            onAction={() => console.log("Go right")}
          />
          <Action title="Open" shortcut={Keyboard.Shortcut.Common.Open} onAction={() => console.log("Open")} />
        </ActionPanel>
      }
    />
  );
}
```

#### Properties

<InterfaceTableFromJSDoc name="Keyboard.Shortcut" />

### Keyboard.Shortcut.Common

A collection of shortcuts that are commonly used throughout Raycast. Using them should help provide a more consistent experience and preserve muscle memory.

| Name            | Shortcut  |
| --------------- | --------- |
| Copy            | ⌘ + ⇧ + C |
| CopyDeeplink    | ⌘ + ⇧ + C |
| CopyName        | ⌘ + ⇧ + . |
| CopyPath        | ⌘ + ⇧ + , |
| Duplicate       | ⌘ + D     |
| Edit            | ⌘ + E     |
| MoveDown        | ⌘ + ⇧ + ↓ |
| MoveUp          | ⌘ + ⇧ + ↑ |
| New             | ⌘ + N     |
| Open            | ⌘ + O     |
| OpenWith        | ⌘ + ⇧ + O |
| Pin             | ⌘ + ⇧ + P |
| Refresh         | ⌘ + R     |
| Remove          | ⌃ + X     |
| RemoveAll       | ⌃ + ⇧ + X |
| ToggleQuickLook | ⌘ + Y     |

### Keyboard.KeyEquivalent

```typescript
KeyEquivalent: "a" |
  "b" |
  "c" |
  "d" |
  "e" |
  "f" |
  "g" |
  "h" |
  "i" |
  "j" |
  "k" |
  "l" |
  "m" |
  "n" |
  "o" |
  "p" |
  "q" |
  "r" |
  "s" |
  "t" |
  "u" |
  "v" |
  "w" |
  "x" |
  "y" |
  "z" |
  "0" |
  "1" |
  "2" |
  "3" |
  "4" |
  "5" |
  "6" |
  "7" |
  "8" |
  "9" |
  "." |
  "," |
  ";" |
  "=" |
  "+" |
  "-" |
  "[" |
  "]" |
  "{" |
  "}" |
  "«" |
  "»" |
  "(" |
  ")" |
  "/" |
  "\\" |
  "'" |
  "`" |
  "§" |
  "^" |
  "@" |
  "$" |
  "return" |
  "delete" |
  "deleteForward" |
  "tab" |
  "arrowUp" |
  "arrowDown" |
  "arrowLeft" |
  "arrowRight" |
  "pageUp" |
  "pageDown" |
  "home" |
  "end" |
  "space" |
  "escape" |
  "enter" |
  "backspace";
```

KeyEquivalent of a [Shortcut](#keyboard.shortcut)

### Keyboard.KeyModifier

```typescript
KeyModifier: "cmd" | "ctrl" | "opt" | "shift";
```

Modifier of a [Shortcut](#keyboard.shortcut)


# Menu Bar Commands

The `MenuBarExtra` component can be used to create commands which populate the [extras](https://developer.apple.com/design/human-interface-guidelines/components/system-experiences/the-menu-bar#menu-bar-commands) section of macOS' menu bar.

## Getting Started

If you don't have an extension yet, follow the [getting started](../basics/getting-started.md) guide and then return to this page.
Now that your extension is ready, let's open its `package.json` file and add a new entry to its `commands` array, ensuring its `mode` property is set to `menu-bar`. For this guide, let's add the following:

```JSON
{
  "name": "github-pull-requests",
  "title": "Pull Requests",
  "subtitle": "GitHub",
  "description": "See your GitHub pull requests at a glance",
  "mode": "menu-bar"
},
```

{% hint style="info" %}
Check out the [command properties entry](../information/manifest.md#command-properties) in the manifest file documentation for more detailed information on each of those properties.
{% endhint %}

Create `github-pull-requests.tsx` in your extensions `src/` folder and add the following:

```typescript
import { MenuBarExtra } from "@raycast/api";

export default function Command() {
  return (
    <MenuBarExtra icon="https://github.githubassets.com/favicons/favicon.png" tooltip="Your Pull Requests">
      <MenuBarExtra.Item title="Seen" />
      <MenuBarExtra.Item
        title="Example Seen Pull Request"
        onAction={() => {
          console.log("seen pull request clicked");
        }}
      />
      <MenuBarExtra.Item title="Unseen" />
      <MenuBarExtra.Item
        title="Example Unseen Pull Request"
        onAction={() => {
          console.log("unseen pull request clicked");
        }}
      />
    </MenuBarExtra>
  );
}
```

If your development server is running, the command should appear in your root search, and running the command should result in the `GitHub` icon appearing in your menu bar.

![GitHub Pull Requests menu bar command](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/menu-bar-command.gif)

{% hint style="info" %}
macOS has the final say on whether a given menu bar extra is displayed. If you have a lot of items there, it is possible that the command we just ran doesn't show up. If that's the case, try to clear up some space in the menu bar, either by closing some of the items you don't need or by hiding them using [HiddenBar](https://github.com/dwarvesf/hidden), [Bartender](https://www.macbartender.com/), or similar apps.
{% endhint %}

Of course, our pull request command wouldn't be of that much use if we had to tell it to update itself every single time. To add [background refresh](../information/lifecycle/background-refresh.md) to our command, we need to open the `package.json` file we modified earlier and add an `interval` key to the command configuration object:

```JSON
{
  "name": "github-pull-requests",
  "title": "Pull Requests",
  "subtitle": "GitHub",
  "description": "See your GitHub pull requests at a glance",
  "mode": "menu-bar",
  "interval": "5m"
}
```

Your root search should look similar to:

![Menu Bar Command - Activate Background Refresh](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/menu-bar-activate-command.webp)

Running it once should activate it to:

![Menu Bar Command - Refresh](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/menu-bar-refresh.webp)

## Lifecycle

Although `menu-bar` commands can result in items permanently showing up in the macOS menu bar, they are not long-lived processes. Instead, as with other commands, Raycast loads them into memory on demand, executes their code and then tries to unload them at the next convenient time.
There are five distinct events that can result in a `menu-bar`'s item being placed in the menu bar, so let's walk through each one.

### From the root search

Same as any other commands, `menu-bar` commands can be run directly from Raycast's root search. Eventually, they may result in a new item showing up in your menu bar (if you have enough room and if the command returns a `MenuBarExtra`), or in a previous item disappearing, if the command returns `null`. In this case, Raycast will load your command code, execute it, wait for the `MenuBarExtra`'s `isLoading` prop to switch to `false`, and unload the command.

{% hint style="danger" %}
If your command returns a `MenuBarExtra`, it _must_ either not set `isLoading` - in which case Raycast will render and immediately unload the command, or set it to `true` while it's performing an async task (such as an API call) and then set it to `false` once it's done. Same as above, Raycast will load the command code, execute it, wait for `MenuBarExtra`'s `isLoading` prop to switch to `false`, and then unload the command.
{% endhint %}

### At a set interval

If your `menu-bar` command also makes use of [background refresh](../information/lifecycle/background-refresh.md) _and_ it has background refresh activated, Raycast will run the command at set intervals. In your command, you can use `environment.launchType` to check whether it is launched in the background or by the user.

{% hint style="info" %}
To ease testing, commands configured to run in the background have an extra action in development mode:
![Menu Bar Command - Run in Background](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/menu-bar-run-in-background.webp)
{% endhint %}

### When the user clicks the command's icon / title in the menu bar

One of the bigger differences to `view` or `no-view` commands is that `menu-bar` commands have an additional entry point: when the user clicks their item in the menu bar. If the item has a menu (i.e. `MenuBarExtra` provides at least one child), Raycast will load the command code, execute it and keep it in memory while the menu is open. When the menu closes (either by the user clicking outside, or by clicking a `MenuBarExtra.Item`), the command is then unloaded.

### When Raycast is restarted

This case assumes that your command has run at least once, resulting in an item being placed in the menu bar. If that's the case, quitting and starting Raycast again should put the same item in your menu bar. However, that item will be restored from Raycast's database - _not_ by loading and executing the command.

### When a menu bar command is re-enabled in preferences

This case should work the same as when Raycast is restarted.

## Best practices

- make generous use of the [Cache API](./cache.md) and our [Utilities](../utils-reference/getting-started.md) in order to provide quick feedback and ensure action handlers work as expected
- make sure you set `isLoading` to false when your command finishes executing
- avoid setting long titles in `MenuBarExtra`, `MenuBarExtra.Submenu` or `MenuBarExtra.Item`
- don't put identical `MenuBarExtra.Item`s at the same level (direct children of `MenuBarExtra` or in the same `Submenu`) as their `onAction` handlers will not be executed correctly

## API Reference

### MenuBarExtra

Adds an item to the menu bar, optionally with a menu attached in case its `children` prop is non-empty.

{% hint style="info" %}
`menu-bar` commands don't always need to return a `MenuBarExtra`. Sometimes it makes sense to remove an item from the menu bar, in which case you can write your command logic to return `null` instead.
{% endhint %}

#### Example

```typescript
import { Icon, MenuBarExtra, open } from "@raycast/api";

const data = {
  archivedBookmarks: [{ name: "Google Search", url: "www.google.com" }],
  newBookmarks: [{ name: "Raycast", url: "www.raycast.com" }],
};

export default function Command() {
  return (
    <MenuBarExtra icon={Icon.Bookmark}>
      <MenuBarExtra.Section title="New">
        {data?.newBookmarks.map((bookmark) => (
          <MenuBarExtra.Item key={bookmark.url} title={bookmark.name} onAction={() => open(bookmark.url)} />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Archived">
        {data?.archivedBookmarks.map((bookmark) => (
          <MenuBarExtra.Item key={bookmark.url} title={bookmark.name} onAction={() => open(bookmark.url)} />
        ))}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
```

#### Props

<PropsTableFromJSDoc component="MenuBarExtra" />

### MenuBarExtra.Item

An item in the [MenuBarExtra](#menubarextra) or in a [MenuBarExtra.Submenu](#menubarextra.submenu).

#### Example

{% tabs %}

{% tab title="ItemWithTitle.tsx" %}

An item that only provides a `title` prop will be rendered as disabled. Use this to create section titles.

```typescript
import { Icon, MenuBarExtra } from "@raycast/api";

export default function Command() {
  return (
    <MenuBarExtra icon={Icon.Bookmark}>
      <MenuBarExtra.Item title="Raycast.com" />
    </MenuBarExtra>
  );
}
```

{% endtab %}

{% tab title="ItemWithTitleAndIcon.tsx" %}

Similarly, an item that provides a `title` and an `icon` prop will also be rendered as disabled.

```typescript
import { Icon, MenuBarExtra } from "@raycast/api";

export default function Command() {
  return (
    <MenuBarExtra icon={Icon.Bookmark}>
      <MenuBarExtra.Item icon="raycast.png" title="Raycast.com" />
    </MenuBarExtra>
  );
}
```

{% endtab %}

{% tab title="ItemWithAction.tsx" %}

An item that provides an `onAction` prop alongside `title` (and optionally `icon`) will _not_ be rendered as disabled. When users click this item in the menu bar, the action handler will be executed.

```typescript
import { Icon, MenuBarExtra, open } from "@raycast/api";

export default function Command() {
  return (
    <MenuBarExtra icon={Icon.Bookmark}>
      <MenuBarExtra.Item icon="raycast.png" title="Raycast.com" onAction={() => open("https://raycast.com")} />
    </MenuBarExtra>
  );
}
```

{% endtab %}

{% tab title="ItemWithAlternate.tsx" %}

If an item provides another `MenuBarEtra.Item` via its `alternate`, prop, the second item will be shown then the user presses the ⌥ (opt) key. There are a few limitation:

1. The `alternate` item may not have a custom shortcut. Instead, it will inherit its parent's shortcut, with the addition of ⌥ (opt) as a modifier.
2. The `alternate` item may not also specify an alternate.
3. A parent item that provides an `alternate` may not use ⌥ (opt) as a modifier.

```typescript
import { Icon, MenuBarExtra, open } from "@raycast/api";

export default function Command() {
  return (
    <MenuBarExtra icon={Icon.Bookmark}>
      <MenuBarExtra.Item
        icon="raycast.png"
        title="Open Raycast Homepage"
        shortcut={{ key: "r", modifiers: ["cmd"] }}
        onAction={() => open("https://raycast.com")}
        alternate={
          <MenuBarExtra.Item
            icon="raycast.png"
            title="Open Raycast Store"
            onAction={() => open("https://raycast.com/store")}
          />
        }
      />
    </MenuBarExtra>
  );
}
```

{% endtab %}

{% endtabs %}

#### Props

<PropsTableFromJSDoc component="MenuBarExtra.Item" />

### MenuBarExtra.Submenu

`MenuBarExtra.Submenu`s reveal their items when people interact with them. They're a good way to group items that naturally belong together, but keep in mind that submenus add complexity to your interface - so use them sparingly!

#### Example

{% tabs %}

{% tab title="Bookmarks.tsx" %}

```typescript
import { Icon, MenuBarExtra, open } from "@raycast/api";

export default function Command() {
  return (
    <MenuBarExtra icon={Icon.Bookmark}>
      <MenuBarExtra.Item icon="raycast.png" title="Raycast.com" onAction={() => open("https://raycast.com")} />
      <MenuBarExtra.Submenu icon="github.png" title="GitHub">
        <MenuBarExtra.Item title="Pull Requests" onAction={() => open("https://github.com/pulls")} />
        <MenuBarExtra.Item title="Issues" onAction={() => open("https://github.com/issues")} />
      </MenuBarExtra.Submenu>
      <MenuBarExtra.Submenu title="Disabled"></MenuBarExtra.Submenu>
    </MenuBarExtra>
  );
}
```

{% endtab %}

{% tab title="DisabledSubmenu.tsx" %}

Submenus with no children will show up as disabled.

```typescript
import { Icon, MenuBarExtra, open } from "@raycast/api";

export default function Command() {
  return (
    <MenuBarExtra icon={Icon.Bookmark}>
      <MenuBarExtra.Submenu title="Disabled"></MenuBarExtra.Submenu>
    </MenuBarExtra>
  );
}
```

{% endtab %}

{% endtabs %}

#### Props

<PropsTableFromJSDoc component="MenuBarExtra.Submenu" />

### MenuBarExtra.Section

An item to group related menu items. It has an optional title and a separator is added automatically between sections.

#### Example

```typescript
import { Icon, MenuBarExtra, open } from "@raycast/api";

const data = {
  archivedBookmarks: [{ name: "Google Search", url: "www.google.com" }],
  newBookmarks: [{ name: "Raycast", url: "www.raycast.com" }],
};

export default function Command() {
  return (
    <MenuBarExtra icon={Icon.Bookmark}>
      <MenuBarExtra.Section title="New">
        {data?.newBookmarks.map((bookmark) => (
          <MenuBarExtra.Item key={bookmark.url} title={bookmark.name} onAction={() => open(bookmark.url)} />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Archived">
        {data?.archivedBookmarks.map((bookmark) => (
          <MenuBarExtra.Item key={bookmark.url} title={bookmark.name} onAction={() => open(bookmark.url)} />
        ))}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
```

#### Props

<PropsTableFromJSDoc component="MenuBarExtra.Section" />

## Types

### MenuBarExtra.ActionEvent

An interface describing Action events in callbacks.

#### Properties

<InterfaceTableFromJSDoc name="MenuBarExtra.ActionEvent" />

#### Example

```typescript
import { MenuBarExtra } from "@raycast/api";

export default function Command() {
  return (
    <MenuBarExtra>
      <MenuBarExtra.Item
        title="Log Action Event Type"
        onAction={(event: MenuBarExtra.ActionEvent) => console.log("Action Event Type", event.type)}
      />
    </MenuBarExtra>
  );
}
```


# OAuth

## Prerequisites

A Raycast extension can use OAuth for authorizing access to a provider's resources on the user's behalf. Since Raycast is a desktop app and the extensions are considered "public", we only support the [PKCE flow](https://datatracker.ietf.org/doc/html/rfc7636) (Proof Key for Code Exchange, pronounced “pixy”). This flow is the official recommendation for native clients that cannot keep a client secret. With PKCE, the client dynamically creates a secret and uses the secret again during code exchange, ensuring that only the client that performed the initial request can exchange the code for the access token (”proof of possession”).

{% hint style="info" %}
Providers such as Google, Twitter, GitLab, Spotify, Zoom, Asana or Dropbox are all PKCE-ready.

However, if your provider doesn't support PKCE, you can use our [PKCE proxy](https://oauth.raycast.com). It allows extensions to securely use an OAuth flow without exposing any secret.
{% endhint %}

## OAuth Flow

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/oauth-overlay-twitter.webp)

The OAuth flow from an extension looks like this:

1. The extension initiates the OAuth flow and starts authorization
2. Raycast shows the OAuth overlay ("Connect to provider…")
3. The user opens the provider's consent page in the web browser
4. After the user consent, the provider redirects back to Raycast
5. Raycast opens the extension where authorization is completed

When the flow is complete, the extension has received an access token from the provider and can perform API calls.
The API provides functions for securely storing and retrieving token sets, so that an extension can check whether the user is already logged in and whether an expired access token needs to be refreshed. Raycast also automatically shows a logout preference.

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/oauth-overlay-twitter-success.webp)

## OAuth App

You first need to register a new OAuth app with your provider. This is usually done in the provider's developer portal. After registering, you will receive a client ID. You also need to configure a redirect URI, see the next section.

Note: Make sure to choose an app type that supports PKCE. Some providers still show you a client secret, which you don't need and should _not_ hardcode in the extension, or support PKCE only for certain types such as "desktop", "native" or "mobile" app types.

## Authorizing

An extension can initiate the OAuth flow and authorize by using the methods on [OAuth.PKCEClient](#oauth.pkceclient).

You can create a new client and configure it with a provider name, icon and description that will be shown in the OAuth overlay. You can also choose between different redirect methods; depending on which method you choose, you need to configure this value as redirect URI in your provider's registered OAuth app. (See the [OAuth.RedirectMethod](#oauth.redirectmethod) docs for each method to get concrete examples for supported redirect URI.) If you can choose, use `OAuth.RedirectMethod.Web` and enter `https://raycast.com/redirect?packageName=Extension` (whether you have to add the `?packageName=Extension` depends on the provider).

```typescript
import { OAuth } from "@raycast/api";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Twitter",
  providerIcon: "twitter-logo.png",
  description: "Connect your Twitter account…",
});
```

Next you create an authorization request with the authorization endpoint, client ID, and scope values. You receive all values from your provider's docs and when you register a new OAuth app.

The returned [AuthorizationRequest](#oauth.authorizationrequest) contains parameters such as the code challenge, verifier, state and redirect URI as standard OAuth authorization request. You can also customize the authorization URL through [OAuth.AuthorizationOptions](#oauth.authorizationoptions) if you need to.

```typescript
const authRequest = await client.authorizationRequest({
  endpoint: "https://twitter.com/i/oauth2/authorize",
  clientId: "YourClientId",
  scope: "tweet.read users.read follows.read",
});
```

To get the authorization code needed for the token exchange, you call [authorize](#oauth.pkceclient-authorize) with the request from the previous step.
This call shows the Raycast OAuth overlay and provides the user with an option to open the consent page in the web browser.
The authorize promise is resolved after the redirect back to Raycast and into the extension:

```typescript
const { authorizationCode } = await client.authorize(authRequest);
```

{% hint style="info" %}
When in development mode, make sure not to trigger auto-reloading (e.g. by saving a file) while you're testing an active OAuth authorization and redirect. This would cause an OAuth state mismatch when you're redirected back into the extension since the client would be reinitialized on reload.
{% endhint %}

Now that you have received the authorization code, you can exchange this code for an access token using your provider's token endpoint. This token exchange (and the following API calls) can be done with your preferred Node HTTP client library. Example using `node-fetch`:

```typescript
async function fetchTokens(authRequest: OAuth.AuthorizationRequest, authCode: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", "YourClientId");
  params.append("code", authCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    body: params,
  });
  if (!response.ok) {
    console.error("fetch tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  return (await response.json()) as OAuth.TokenResponse;
}
```

## Token Storage

The PKCE client exposes methods for storing, retrieving and deleting token sets. A [TokenSet](#oauth.tokenset) contains an access token and typically also a refresh token, expires value, and the current scope. Since this data is returned by the provider's token endpoint as standard OAuth JSON response, you can directly store the response ([OAuth.TokenResponse](#oauth.tokenresponse)) or alternatively use [OAuth.TokenSetOptions](#oauth.tokensetoptions):

```typescript
await client.setTokens(tokenResponse);
```

Once the token set is stored, Raycast will automatically show a logout preference for the extension. When the user logs out, the token set gets removed.

The [TokenSet](#oauth.tokenset) also enables you to check whether the user is logged in before starting the authorization flow:

```typescript
const tokenSet = await client.getTokens();
```

## Token Refresh

Since access tokens usually expire, an extension should provide a way to refresh the access token, otherwise users would be logged out or see errors.
Some providers require you to add an offline scope so that you get a refresh token. (Twitter, for example, needs the scope `offline.access` or it only returns an access token.)
A basic refresh flow could look like this:

```typescript
const tokenSet = await client.getTokens();
if (tokenSet?.accessToken) {
  if (tokenSet.refreshToken && tokenSet.isExpired()) {
    await client.setTokens(await refreshTokens(tokenSet.refreshToken));
  }
  return;
}
// authorize...
```

This code would run before starting the authorization flow. It checks the presence of a token set to see whether the user is logged in and then checks whether there is a refresh token and the token set is expired (through the convenience method `isExpired()` on the [TokenSet](#oauth.tokenset)). If it is expired, the token is refreshed and updated in the token set. Example using `node-fetch`:

```typescript
async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", "YourClientId");
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const response = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    body: params,
  });
  if (!response.ok) {
    console.error("refresh tokens error:", await response.text());
    throw new Error(response.statusText);
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}
```

## Examples

We've provided [OAuth example integrations for Google, Twitter, and Dropbox](https://github.com/raycast/extensions/tree/main/examples/api-examples) that demonstrate the entire flow shown above.

## API Reference

### OAuth.PKCEClient

Use [OAuth.PKCEClient.Options](#oauth.pkceclient.options) to configure what's shown on the OAuth overlay.

#### Signature

```typescript
constructor(options: OAuth.PKCEClient.Options): OAuth.PKCEClient
```

#### Example

```typescript
import { OAuth } from "@raycast/api";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Twitter",
  providerIcon: "twitter-logo.png",
  description: "Connect your Twitter account…",
});
```

#### Methods

| Method                                                                                                                                           |
| :----------------------------------------------------------------------------------------------------------------------------------------------- |
| <code>[authorizationRequest(options: AuthorizationRequestOptions): Promise<AuthorizationRequest>](#oauth.pkceclient-authorizationrequest)</code> |
| <code>[authorize(options: AuthorizationRequest \| AuthorizationOptions): Promise<AuthorizationResponse>](#oauth.pkceclient-authorize)</code>     |
| <code>[setTokens(options: TokenSetOptions \| TokenResponse): Promise<void>](#oauth.pkceclient-settokens)</code>                                  |
| <code>[getTokens(): Promise<TokenSet \| undefined>](#oauth.pkceclient-gettokens)</code>                                                          |
| <code>[removeTokens(): Promise<void>](#oauth.pkceclient-removetokens)</code>                                                                     |

### OAuth.PKCEClient#authorizationRequest

Creates an authorization request for the provided authorization endpoint, client ID, and scopes. You need to first create the authorization request before calling [authorize](#oauth.pkceclient-authorize).

The generated code challenge for the PKCE request uses the S256 method.

#### Signature

```typescript
authorizationRequest(options: AuthorizationRequestOptions): Promise<AuthorizationRequest>;
```

#### Example

```typescript
const authRequest = await client.authorizationRequest({
  endpoint: "https://twitter.com/i/oauth2/authorize",
  clientId: "YourClientId",
  scope: "tweet.read users.read follows.read",
});
```

#### Parameters

| Name                                      | Type                                                                           | Description                                           |
| :---------------------------------------- | :----------------------------------------------------------------------------- | :---------------------------------------------------- |
| options<mark style="color:red;">\*</mark> | <code>[AuthorizationRequestOptions](#oauth.authorizationrequestoptions)</code> | The options used to create the authorization request. |

#### Return

A promise for an [AuthorizationRequest](#oauth.authorizationrequest) that you can use as input for [authorize](#oauth.pkceclient-authorize).

### OAuth.PKCEClient#authorize

Starts the authorization and shows the OAuth overlay in Raycast. As parameter you can either directly use the returned request from [authorizationRequest](#oauth.authorizationrequest), or customize the URL by extracting parameters from [AuthorizationRequest](#oauth.authorizationrequest) and providing your own URL via [AuthorizationOptions](#oauth.authorizationoptions). Eventually the URL will be used to open the authorization page of the provider in the web browser.

#### Signature

```typescript
authorize(options: AuthorizationRequest | AuthorizationOptions): Promise<AuthorizationResponse>;
```

#### Example

```typescript
const { authorizationCode } = await client.authorize(authRequest);
```

#### Parameters

| Name                                      | Type                                                                                                                    | Description                    |
| :---------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :----------------------------- |
| options<mark style="color:red;">\*</mark> | <code>[AuthorizationRequest](#oauth.authorizationrequest) \| [AuthorizationOptions](#oauth.authorizationoptions)</code> | The options used to authorize. |

#### Return

A promise for an [AuthorizationResponse](#oauth.authorizationresponse), which contains the authorization code needed for the token exchange. The promise is resolved when the user was redirected back from the provider's authorization page to the Raycast extension.

### OAuth.PKCEClient#setTokens

Securely stores a [TokenSet](#oauth.tokenset) for the provider. Use this after fetching the access token from the provider. If the provider returns a a standard OAuth JSON token response, you can directly pass the [TokenResponse](#oauth.tokenresponse).
At a minimum, you need to set the `accessToken`, and typically you also set `refreshToken` and `isExpired`.

Raycast automatically shows a logout preference for the extension when a token set was saved.

If you want to make use of the convenience `isExpired()` method, the property `expiresIn` must be configured.

#### Signature

```typescript
setTokens(options: TokenSetOptions | TokenResponse): Promise<void>;
```

#### Example

```typescript
await client.setTokens(tokenResponse);
```

#### Parameters

| Name                                      | Type                                                                                            | Description                              |
| :---------------------------------------- | :---------------------------------------------------------------------------------------------- | :--------------------------------------- |
| options<mark style="color:red;">\*</mark> | <code>[TokenSetOptions](#oauth.tokensetoptions) \| [TokenResponse](#oauth.tokenresponse)</code> | The options used to store the token set. |

#### Return

A promise that resolves when the token set has been stored.

### OAuth.PKCEClient#getTokens

Retrieves the stored [TokenSet](#oauth.tokenset) for the client. You can use this to initially check whether the authorization flow should be initiated or the user is already logged in and you might have to refresh the access token.

#### Signature

```typescript
getTokens(): Promise<TokenSet | undefined>;
```

#### Example

```typescript
const tokenSet = await client.getTokens();
```

#### Return

A promise that resolves when the token set has been retrieved.

### OAuth.PKCEClient#removeTokens

Removes the stored [TokenSet](#oauth.tokenset) for the client.
Raycast automatically shows a logout preference that removes the token set. Use this method only if you need to provide an additional logout option in your extension or you want to remove the token set because of a migration.

#### Signature

```typescript
removeTokens(): Promise<void>;
```

#### Example

```typescript
await client.removeTokens();
```

#### Return

A promise that resolves when the token set has been removed.

## Types

### OAuth.PKCEClient.Options

The options for creating a new [PKCEClient](#oauth.pkceclient).

#### Properties

<InterfaceTableFromJSDoc name="OAuth.PKCEClient.Options" />

### OAuth.RedirectMethod

Defines the supported redirect methods for the OAuth flow. You can choose between web and app-scheme redirect methods, depending on what the provider requires when setting up the OAuth app. For examples on what redirect URI you need to configure, see the docs for each method.

#### Enumeration members

| Name   | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| :----- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web    | Use this type for a redirect back to the Raycast website, which will then open the extension. In the OAuth app, configure `https://raycast.com/redirect?packageName=Extension`<br>(This is a static redirect URL for all extensions.)<br>If the provider does not accept query parameters in redirect URLs, you can alternatively use `https://raycast.com/redirect/extension` and then customize the [AuthorizationRequest](#oauth.authorizationrequest) via its `extraParameters` property. For example add: `extraParameters: { "redirect_uri": "https://raycast.com/redirect/extension" }` |
| App    | Use this type for an app-scheme based redirect that directly opens Raycast. In the OAuth app, configure `raycast://oauth?package_name=Extension`                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| AppURI | Use this type for a URI-style app scheme that directly opens Raycast. In the OAuth app, configure `com.raycast:/oauth?package_name=Extension`<br>(Note the single slash – Google, for example, would require this flavor for an OAuth app where the Bundle ID is `com.raycast`)                                                                                                                                                                                                                                                                                                                |

### OAuth.AuthorizationRequestOptions

The options for an authorization request via [authorizationRequest](#oauth.authorizationrequest).

<InterfaceTableFromJSDoc name="OAuth.AuthorizationRequestOptions" />

### OAuth.AuthorizationRequestURLParams

Values of [AuthorizationRequest](#oauth.authorizationrequest).
The PKCE client automatically generates the values for you and returns them for [authorizationRequest](#oauth.authorizationrequest)

<InterfaceTableFromJSDoc name="OAuth.AuthorizationRequestURLParams" />

### OAuth.AuthorizationRequest

The request returned by [authorizationRequest](#oauth.authorizationrequest).
Can be used as direct input to [authorize](#oauth.pkceclient-authorize), or to extract parameters for constructing a custom URL in [AuthorizationOptions](#oauth.authorizationoptions).

<InterfaceTableFromJSDoc name="OAuth.AuthorizationRequest" />

#### Methods

| Name    | Type                      | Description                            |
| :------ | :------------------------ | :------------------------------------- |
| toURL() | <code>() => string</code> | Constructs the full authorization URL. |

### OAuth.AuthorizationOptions

Options for customizing [authorize](#oauth.pkceclient-authorize).
You can use values from [AuthorizationRequest](#oauth.authorizationrequest) to build your own URL.

<InterfaceTableFromJSDoc name="OAuth.AuthorizationOptions" />

### OAuth.AuthorizationResponse

The response returned by [authorize](#oauth.pkceclient-authorize), containing the authorization code after the provider redirect. You can then exchange the authorization code for an access token using the provider's token endpoint.

<InterfaceTableFromJSDoc name="OAuth.AuthorizationResponse" />

### OAuth.TokenSet

Describes the TokenSet created from an OAuth provider's token response. The `accessToken` is the only required parameter but typically OAuth providers also return a refresh token, an expires value, and the scope.
Securely store a token set via [setTokens](#oauth.pkceclient-settokens) and retrieve it via [getTokens](#oauth.pkceclient-gettokens).

<InterfaceTableFromJSDoc name="OAuth.TokenSet" />

#### Methods

| Name        | Type                       | Description                                                                                                                                                                                                                                          |
| :---------- | :------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| isExpired() | <code>() => boolean</code> | A convenience method for checking whether the access token has expired. The method factors in some seconds of "buffer", so it returns true a couple of seconds before the actual expiration time. This requires the `expiresIn` parameter to be set. |

### OAuth.TokenSetOptions

Options for a [TokenSet](#oauth.tokenset) to store via [setTokens](#oauth.pkceclient-settokens).

<InterfaceTableFromJSDoc name="OAuth.TokenSetOptions" />

### OAuth.TokenResponse

Defines the standard JSON response for an OAuth token request.
The response can be directly used to store a [TokenSet](#oauth.tokenset) via [setTokens](#oauth.pkceclient-settokens).

<InterfaceTableFromJSDoc name="OAuth.TokenResponse" />


# Preferences

Use the Preferences API to make your extension configurable.

Preferences are configured in the [manifest](../information/manifest.md#preference-properties) per command or shared in the context of an extension.

Required preferences need to be set by the user before a command opens. They are a great way to make sure that the user of your extension has everything set up properly.

## API Reference

### getPreferenceValues

A function to access the preference values that have been passed to the command.

Each preference name is mapped to its value, and the defined default values are used as fallback values.

#### Signature

```typescript
function getPreferenceValues(): { [preferenceName: string]: any };
```

#### Example

```typescript
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  name: string;
  bodyWeight?: string;
  bodyHeight?: string;
}

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();
  console.log(preferences);
}
```

#### Return

An object with the preference names as property key and the typed value as property value.

Depending on the type of the preference, the type of its value will be different.

| Preference type        | Value type                                             |
| :--------------------- | :----------------------------------------------------- |
| <code>textfield</code> | <code>string</code>                                    |
| <code>password</code>  | <code>string</code>                                    |
| <code>checkbox</code>  | <code>boolean</code>                                   |
| <code>dropdown</code>  | <code>string</code>                                    |
| <code>appPicker</code> | <code>[Application](./utilities.md#application)</code> |
| <code>file</code>      | <code>string</code>                                    |
| <code>directory</code> | <code>string</code>                                    |

### openExtensionPreferences

Opens the extension's preferences screen.

#### Signature

```typescript
export declare function openExtensionPreferences(): Promise<void>;
```

#### Example

```typescript
import { ActionPanel, Action, Detail, openExtensionPreferences } from "@raycast/api";

export default function Command() {
  const markdown = "API key incorrect. Please update it in extension preferences and try again.";

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
```

#### Return

A Promise that resolves when the extensions preferences screen is opened.

### openCommandPreferences

Opens the command's preferences screen.

#### Signature

```typescript
export declare function openCommandPreferences(): Promise<void>;
```

#### Example

```typescript
import { ActionPanel, Action, Detail, openCommandPreferences } from "@raycast/api";

export default function Command() {
  const markdown = "API key incorrect. Please update it in command preferences and try again.";

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openCommandPreferences} />
        </ActionPanel>
      }
    />
  );
}
```

#### Return

A Promise that resolves when the command's preferences screen is opened.

## Types

### Preferences

A command receives the values of its preferences via the [`getPreferenceValues`](#getpreferencevalues) function. It is an object with the preferences' `name` as keys and their values as the property's values.

Depending on the type of the preference, the type of its value will be different.

| Preference type        | Value type                                             |
| :--------------------- | :----------------------------------------------------- |
| <code>textfield</code> | <code>string</code>                                    |
| <code>password</code>  | <code>string</code>                                    |
| <code>checkbox</code>  | <code>boolean</code>                                   |
| <code>dropdown</code>  | <code>string</code>                                    |
| <code>appPicker</code> | <code>[Application](./utilities.md#application)</code> |
| <code>file</code>      | <code>string</code>                                    |
| <code>directory</code> | <code>string</code>                                    |

{% hint style="info" %}
Raycast provides a global TypeScript namespace called `Preferences` which contains the types of the preferences of all the commands of the extension.

For example, if a command named `show-todos` has some preferences, its `getPreferenceValues`'s return type can be specified with `getPreferenceValues<Preferences.ShowTodos>()`. This will make sure that the types used in the command stay in sync with the manifest.
{% endhint %}


# Storage

The storage APIs can be used to store data in Raycast's [local encrypted database](../information/security.md#data-storage).

All commands in an extension have shared access to the stored data. Extensions can _not_ access the storage of other extensions.

Values can be managed through functions such as [`LocalStorage.getItem`](storage.md#localstorage.getitem), [`LocalStorage.setItem`](storage.md#localstorage.setitem), or [`LocalStorage.removeItem`](storage.md#localstorage.removeitem). A typical use case is storing user-related data, for example entered todos.

{% hint style="info" %}
The API is not meant to store large amounts of data. For this, use [Node's built-in APIs to write files](https://nodejs.org/en/learn/manipulating-files/writing-files-with-nodejs), e.g. to the extension's [support directory](environment.md#environment).
{% endhint %}

## API Reference

### LocalStorage.getItem

Retrieve the stored value for the given key.

#### Signature

```typescript
async function getItem(key: string): Promise<Value | undefined>;
```

#### Example

```typescript
import { LocalStorage } from "@raycast/api";

export default async function Command() {
  await LocalStorage.setItem("favorite-fruit", "apple");
  const item = await LocalStorage.getItem<string>("favorite-fruit");
  console.log(item);
}
```

#### Parameters

<FunctionParametersTableFromJSDoc name="LocalStorage.getItem" />

#### Return

A Promise that resolves with the stored value for the given key. If the key does not exist, `undefined` is returned.

### LocalStorage.setItem

Stores a value for the given key.

#### Signature

```typescript
async function setItem(key: string, value: Value): Promise<void>;
```

#### Example

```typescript
import { LocalStorage } from "@raycast/api";

export default async function Command() {
  await LocalStorage.setItem("favorite-fruit", "apple");
  const item = await LocalStorage.getItem<string>("favorite-fruit");
  console.log(item);
}
```

#### Parameters

<FunctionParametersTableFromJSDoc name="LocalStorage.setItem" />

#### Return

A Promise that resolves when the value is stored.

### LocalStorage.removeItem

Removes the stored value for the given key.

#### Signature

```typescript
async function removeItem(key: string): Promise<void>;
```

#### Example

```typescript
import { LocalStorage } from "@raycast/api";

export default async function Command() {
  await LocalStorage.setItem("favorite-fruit", "apple");
  console.log(await LocalStorage.getItem<string>("favorite-fruit"));
  await LocalStorage.removeItem("favorite-fruit");
  console.log(await LocalStorage.getItem<string>("favorite-fruit"));
}
```

#### Parameters

<FunctionParametersTableFromJSDoc name="LocalStorage.removeItem" />

#### Return

A Promise that resolves when the value is removed.

### LocalStorage.allItems

Retrieve all stored values in the local storage of an extension.

#### Signature

```typescript
async function allItems(): Promise<Values>;
```

#### Example

```typescript
import { LocalStorage } from "@raycast/api";

interface Values {
  todo: string;
  priority: number;
}

export default async function Command() {
  const items = await LocalStorage.allItems<Values>();
  console.log(`Local storage item count: ${Object.entries(items).length}`);
}
```

#### Return

A Promise that resolves with an object containing all [Values](#localstorage.values).

### LocalStorage.clear

Removes all stored values of an extension.

#### Signature

```typescript
async function clear(): Promise<void>;
```

#### Example

```typescript
import { LocalStorage } from "@raycast/api";

export default async function Command() {
  await LocalStorage.clear();
}
```

#### Return

A Promise that resolves when all values are removed.

## Types

### LocalStorage.Values

Values of local storage items.

For type-safe values, you can define your own interface. Use the keys of the local storage items as the property names.

#### Properties

| Name          | Type             | Description                             |
| :------------ | :--------------- | :-------------------------------------- |
| [key: string] | <code>any</code> | The local storage value of a given key. |

### LocalStorage.Value

```typescript
Value: string | number | boolean;
```

Supported storage value types.

#### Example

```typescript
import { LocalStorage } from "@raycast/api";

export default async function Command() {
  // String
  await LocalStorage.setItem("favorite-fruit", "cherry");

  // Number
  await LocalStorage.setItem("fruit-basket-count", 3);

  // Boolean
  await LocalStorage.setItem("fruit-eaten-today", true);
}
```


# User Interface

Raycast uses React for its user interface declaration and renders the supported elements to our native UI. The API comes with a set of UI components that you can use to build your extensions. Think of it as a design system. The high-level components are the following:

- [List](list.md) to show multiple similar items, f.e. a list of your open todos.
- [Grid](grid.md) similar to a List but with more legroom to show an image for each item, f.e. a collection of icons.
- [Detail](detail.md) to present more information, f.e. the details of a GitHub pull request.
- [Form](form.md) to create new content, f.e. filing a bug report.

Each component can provide interaction via an [ActionPanel](action-panel.md). The panel has a list of [Actions](actions.md) where each one can be associated with a [keyboard shortcut](../keyboard.md). Shortcuts allow users to use Raycast without using their mouse.

## Rendering

To render a user interface, you need to do the following:

- Set the `mode` to `view` in the [`package.json` manifest file](../../information/manifest.md#command-properties)
- Export a React component from your command entry file

As a general rule of thumb, you should render something as quickly as possible. This guarantees that your command feels responsive. If you don't have data available to show, you can set the `isLoading` prop to `true` on top-level components such as [`<Detail>`](detail.md), [`<Form>`](form.md), or [`<List>`](list.md). It shows a loading indicator at the top of Raycast.

Here is an example that shows a loading indicator for 2 seconds after the command got launched:

```typescript
import { List } from "@raycast/api";
import { useEffect, useState } from "react";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 2000);
  }, []);

  return <List isLoading={isLoading}>{/* Render your data */}</List>;
}
```


# Action Panel

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/action-panel.webp)

## API Reference

### ActionPanel

Exposes a list of [actions](./actions.md) that can be performed by the user.

Often items are context-aware, e.g., based on the selected list item. Actions can be grouped into semantic
sections and can have keyboard shortcuts assigned.

The first and second action become the primary and secondary action. They automatically get the default keyboard shortcuts assigned.
In [List](./list.md), [Grid](./grid.md), and [Detail](./detail.md), this is `↵` for the primary and `⌘` `↵` for the secondary action. In [Form](./form.md) it's `⌘` `↵` for the primary and `⌘` `⇧` `↵` for the secondary.
Keep in mind that while you can specify an alternative shortcut for the primary and secondary actions, it won't be displayed in the Action Panel.

#### Example

```typescript
import { ActionPanel, Action, List } from "@raycast/api";

export default function Command() {
  return (
    <List navigationTitle="Open Pull Requests">
      <List.Item
        title="Docs: Update API Reference"
        subtitle="#1"
        actions={
          <ActionPanel title="#1 in raycast/extensions">
            <Action.OpenInBrowser url="https://github.com/raycast/extensions/pull/1" />
            <Action.CopyToClipboard
              title="Copy Pull Request URL"
              content="https://github.com/raycast/extensions/pull/1"
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
```

#### Props

<PropsTableFromJSDoc component="ActionPanel" />

### ActionPanel.Section

A group of visually separated items.

Use sections when the [ActionPanel](#actionpanel) contains a lot of actions to help guide the user to related actions.
For example, create a section for all copy actions.

#### Example

```typescript
import { ActionPanel, Action, List } from "@raycast/api";

export default function Command() {
  return (
    <List navigationTitle="Open Pull Requests">
      <List.Item
        title="Docs: Update API Reference"
        subtitle="#1"
        actions={
          <ActionPanel title="#1 in raycast/extensions">
            <ActionPanel.Section title="Copy">
              <Action.CopyToClipboard title="Copy Pull Request Number" content="#1" />
              <Action.CopyToClipboard
                title="Copy Pull Request URL"
                content="https://github.com/raycast/extensions/pull/1"
              />
              <Action.CopyToClipboard title="Copy Pull Request Title" content="Docs: Update API Reference" />
            </ActionPanel.Section>
            <ActionPanel.Section title="Danger zone">
              <Action title="Close Pull Request" onAction={() => console.log("Close PR #1")} />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    </List>
  );
}
```

#### Props

<PropsTableFromJSDoc component="ActionPanel.Section" />

### ActionPanel.Submenu

A very specific action that replaces the current [ActionPanel](#actionpanel) with its children when selected.

This is handy when an action needs to select from a range of options. For example, to add a label to a GitHub pull request or an assignee to a todo.

#### Example

```typescript
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";

export default function Command() {
  return (
    <List navigationTitle="Open Pull Requests">
      <List.Item
        title="Docs: Update API Reference"
        subtitle="#1"
        actions={
          <ActionPanel title="#1 in raycast/extensions">
            <ActionPanel.Submenu title="Add Label">
              <Action
                icon={{ source: Icon.Circle, tintColor: Color.Red }}
                title="Bug"
                onAction={() => console.log("Add bug label")}
              />
              <Action
                icon={{ source: Icon.Circle, tintColor: Color.Yellow }}
                title="Enhancement"
                onAction={() => console.log("Add enhancement label")}
              />
              <Action
                icon={{ source: Icon.Circle, tintColor: Color.Blue }}
                title="Help Wanted"
                onAction={() => console.log("Add help wanted label")}
              />
            </ActionPanel.Submenu>
          </ActionPanel>
        }
      />
    </List>
  );
}
```

#### Props

<PropsTableFromJSDoc component="ActionPanel.Submenu" />

## Types

### ActionPanel.Children

```typescript
ActionPanel.Children: ActionPanel.Section | ActionPanel.Section[] | ActionPanel.Section.Children | null
```

Supported children for the [ActionPanel](#actionpanel) component.

### ActionPanel.Section.Children

```typescript
ActionPanel.Section.Children: Action | Action[] | ReactElement<ActionPanel.Submenu.Props> | ReactElement<ActionPanel.Submenu.Props>[] | null
```

Supported children for the [ActionPanel.Section](#actionpanel.section) component.

### ActionPanel.Submenu.Children

```typescript
ActionPanel.Children: ActionPanel.Section | ActionPanel.Section[] | ActionPanel.Section.Children | null
```

Supported children for the [ActionPanel.Submenu](#actionpanel.submenu) component.


# Actions

Our API includes a few built-in actions that can be used for common interactions, such as opening a link or copying some content to the clipboard. By using them, you make sure to follow our human interface guidelines. If you need something custom, use the [`Action`](#action) component. All built-in actions are just abstractions on top of it.

## API Reference

### Action

A context-specific action that can be performed by the user.

Assign keyboard shortcuts to items to make it easier for users to perform frequently used actions.

#### Example

```typescript
import { ActionPanel, Action, List } from "@raycast/api";

export default function Command() {
  return (
    <List navigationTitle="Open Pull Requests">
      <List.Item
        title="Docs: Update API Reference"
        subtitle="#1"
        actions={
          <ActionPanel title="#1 in raycast/extensions">
            <Action.OpenInBrowser url="https://github.com/raycast/extensions/pull/1" />
            <Action.CopyToClipboard title="Copy Pull Request Number" content="#1" />
            <Action title="Close Pull Request" onAction={() => console.log("Close PR #1")} />
          </ActionPanel>
        }
      />
    </List>
  );
}
```

#### Props

<PropsTableFromJSDoc component="Action" />

### Action.CopyToClipboard

Action that copies the content to the clipboard.

The main window is closed, and a HUD is shown after the content was copied to the clipboard.

#### Example

```typescript
import { ActionPanel, Action, Detail } from "@raycast/api";

export default function Command() {
  return (
    <Detail
      markdown="Press `⌘ + .` and share some love."
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content="I ❤️ Raycast" shortcut={{ modifiers: ["cmd"], key: "." }} />
        </ActionPanel>
      }
    />
  );
}
```

#### Props

<PropsTableFromJSDoc component="Action.CopyToClipboard" />

### Action.Open

An action to open a file or folder with a specific application, just as if you had double-clicked the
file's icon.

The main window is closed after the file is opened.

#### Example

```typescript
import { ActionPanel, Detail, Action } from "@raycast/api";

export default function Command() {
  return (
    <Detail
      markdown="Check out your extension code."
      actions={
        <ActionPanel>
          <Action.Open title="Open Folder" target={__dirname} />
        </ActionPanel>
      }
    />
  );
}
```

#### Props

<PropsTableFromJSDoc component="Action.Open" />

### Action.OpenInBrowser

Action that opens a URL in the default browser.

The main window is closed after the URL is opened in the browser.

#### Example

```typescript
import { ActionPanel, Detail, Action } from "@raycast/api";

export default function Command() {
  return (
    <Detail
      markdown="Join the gang!"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url="https://raycast.com/jobs" />
        </ActionPanel>
      }
    />
  );
}
```

#### Props

<PropsTableFromJSDoc component="Action.OpenInBrowser" />

### Action.OpenWith

Action that opens a file or URL with a specific application.

The action opens a sub-menu with all applications that can open the file or URL.
The main window is closed after the item is opened in the specified application.

#### Example

```typescript
import { ActionPanel, Detail, Action } from "@raycast/api";
import { homedir } from "os";

const DESKTOP_DIR = `${homedir()}/Desktop`;

export default function Command() {
  return (
    <Detail
      markdown="What do you want to use to open your desktop with?"
      actions={
        <ActionPanel>
          <Action.OpenWith path={DESKTOP_DIR} />
        </ActionPanel>
      }
    />
  );
}
```

#### Props

<PropsTableFromJSDoc component="Action.OpenWith" />

### Action.Paste

Action that pastes the content to the front-most applications.

The main window is closed after the content is pasted to the front-most application.

#### Example

```typescript
import { ActionPanel, Detail, Action } from "@raycast/api";

export default function Command() {
  return (
    <Detail
      markdown="Let us know what you think about the Raycast API?"
      actions={
        <ActionPanel>
          <Action.Paste content="api@raycast.com" />
        </ActionPanel>
      }
    />
  );
}
```

#### Props

<PropsTableFromJSDoc component="Action.Paste" />

### Action.Push

Action that pushes a new view to the navigation stack.

#### Example

```typescript
import { ActionPanel, Detail, Action } from "@raycast/api";

function Ping() {
  return (
    <Detail
      markdown="Ping"
      actions={
        <ActionPanel>
          <Action.Push title="Push Pong" target={<Pong />} />
        </ActionPanel>
      }
    />
  );
}

function Pong() {
  return <Detail markdown="Pong" />;
}

export default function Command() {
  return <Ping />;
}
```

#### Props

<PropsTableFromJSDoc component="Action.Push" />

### Action.ShowInFinder

Action that shows a file or folder in the Finder.

The main window is closed after the file or folder is revealed in the Finder.

#### Example

```typescript
import { ActionPanel, Detail, Action } from "@raycast/api";
import { homedir } from "os";

const DOWNLOADS_DIR = `${homedir()}/Downloads`;

export default function Command() {
  return (
    <Detail
      markdown="Are your downloads pilling up again?"
      actions={
        <ActionPanel>
          <Action.ShowInFinder path={DOWNLOADS_DIR} />
        </ActionPanel>
      }
    />
  );
}
```

#### Props

<PropsTableFromJSDoc component="Action.ShowInFinder" />

### Action.SubmitForm

Action that adds a submit handler for capturing form values.

#### Example

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Answer" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.Checkbox id="answer" label="Are you happy?" defaultValue={true} />
    </Form>
  );
}
```

#### Props

<PropsTableFromJSDoc component="Action.SubmitForm" />

### Action.Trash

Action that moves a file or folder to the Trash.

#### Example

```typescript
import { ActionPanel, Detail, Action } from "@raycast/api";
import { homedir } from "os";

const FILE = `${homedir()}/Downloads/get-rid-of-me.txt`;

export default function Command() {
  return (
    <Detail
      markdown="Some spring cleaning?"
      actions={
        <ActionPanel>
          <Action.Trash paths={FILE} />
        </ActionPanel>
      }
    />
  );
}
```

#### Props

<PropsTableFromJSDoc component="Action.Trash" />

### Action.CreateSnippet

Action that navigates to the the Create Snippet command with some or all of the fields prefilled.

#### Example

```typescript
import { ActionPanel, Detail, Action } from "@raycast/api";

export default function Command() {
  return (
    <Detail
      markdown="Test out snippet creation"
      actions={
        <ActionPanel>
          <Action.CreateSnippet snippet={{ text: "DE75512108001245126199" }} />
        </ActionPanel>
      }
    />
  );
}
```

#### Props

<PropsTableFromJSDoc component="Action.CreateSnippet" />

### Action.CreateQuicklink

Action that navigates to the the Create Quicklink command with some or all of the fields prefilled.

#### Example

```typescript
import { ActionPanel, Detail, Action } from "@raycast/api";

export default function Command() {
  return (
    <Detail
      markdown="Test out quicklink creation"
      actions={
        <ActionPanel>
          <Action.CreateQuicklink quicklink={{ link: "https://duckduckgo.com/?q={Query}" }} />
        </ActionPanel>
      }
    />
  );
}
```

#### Props

<PropsTableFromJSDoc component="Action.CreateQuicklink" />

### Action.ToggleQuickLook

Action that toggles the Quick Look to preview a file.

#### Example

```typescript
import { ActionPanel, List, Action } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        title="Preview me"
        quickLook={{ path: "~/Downloads/Raycast.dmg", name: "Some file" }}
        actions={
          <ActionPanel>
            <Action.ToggleQuickLook shortcut={{ modifiers: ["cmd"], key: "y" }} />
          </ActionPanel>
        }
      />
    </List>
  );
}
```

#### Props

<PropsTableFromJSDoc component="Action.ToggleQuickLook" />

### Action.PickDate

Action to pick a date.

#### Example

```typescript
import { ActionPanel, List, Action } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        title="Todo"
        actions={
          <ActionPanel>
            <Action.PickDate title="Set Due Date…" />
          </ActionPanel>
        }
      />
    </List>
  );
}
```

#### Props

<PropsTableFromJSDoc component="Action.PickDate" />

## Types

### Snippet

#### Properties

<InterfaceTableFromJSDoc name="Snippet" />

### Quicklink

#### Properties

<InterfaceTableFromJSDoc name="Quicklink" />

### Action.Style

Defines the visual style of the Action.

Use [Action.Style.Regular](#action.style) for displaying a regular actions.
Use [Action.Style.Destructive](#action.style) when your action has something that user should be careful about.
Use the confirmation [Alert](../feedback/alert.md) if the action is doing something that user cannot revert.

### Action.PickDate.Type

The types of date components the user can pick with an `Action.PickDate`.

#### Enumeration members

| Name     | Description                                                      |
| -------- | ---------------------------------------------------------------- |
| DateTime | Hour and second can be picked in addition to year, month and day |
| Date     | Only year, month, and day can be picked                          |

### Action.PickDate.isFullDay

A method that determines if a given date represents a full day or a specific time.

```tsx
import { ActionPanel, List, Action } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        title="Todo"
        actions={
          <ActionPanel>
            <Action.PickDate
              title="Set Due Date…"
              onChange={(date) => {
                if (Action.PickDate.isFullDay(values.reminderDate)) {
                  // the event is for a full day
                } else {
                  // the event is at a specific time
                }
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
```


# Colors

Anywhere you can pass a color in a component prop, you can pass either:

- A standard [Color](#color)
- A [Dynamic](#color.dynamic) Color
- A [Raw](#color.raw) Color

## API Reference

### Color

The standard colors. Use those colors for consistency.

The colors automatically adapt to the Raycast theme (light or dark).

#### Example

```typescript
import { Color, Icon, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item title="Blue" icon={{ source: Icon.Circle, tintColor: Color.Blue }} />
      <List.Item title="Green" icon={{ source: Icon.Circle, tintColor: Color.Green }} />
      <List.Item title="Magenta" icon={{ source: Icon.Circle, tintColor: Color.Magenta }} />
      <List.Item title="Orange" icon={{ source: Icon.Circle, tintColor: Color.Orange }} />
      <List.Item title="Purple" icon={{ source: Icon.Circle, tintColor: Color.Purple }} />
      <List.Item title="Red" icon={{ source: Icon.Circle, tintColor: Color.Red }} />
      <List.Item title="Yellow" icon={{ source: Icon.Circle, tintColor: Color.Yellow }} />
      <List.Item title="PrimaryText" icon={{ source: Icon.Circle, tintColor: Color.PrimaryText }} />
      <List.Item title="SecondaryText" icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }} />
    </List>
  );
}
```

#### Enumeration members

| Name          | Dark Theme                                                | Light Theme                                          |
| :------------ | :-------------------------------------------------------- | :--------------------------------------------------- |
| Blue          | ![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/color-dark-blue.webp)           | ![](../../.gitbook/assets/color-blue.webp)           |
| Green         | ![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/color-dark-green.webp)          | ![](../../.gitbook/assets/color-green.webp)          |
| Magenta       | ![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/color-dark-magenta.webp)        | ![](../../.gitbook/assets/color-magenta.webp)        |
| Orange        | ![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/color-dark-orange.webp)         | ![](../../.gitbook/assets/color-orange.webp)         |
| Purple        | ![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/color-dark-purple.webp)         | ![](../../.gitbook/assets/color-purple.webp)         |
| Red           | ![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/color-dark-red.webp)            | ![](../../.gitbook/assets/color-red.webp)            |
| Yellow        | ![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/color-dark-yellow.webp)         | ![](../../.gitbook/assets/color-yellow.webp)         |
| PrimaryText   | ![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/color-dark-primary-text.webp)   | ![](../../.gitbook/assets/color-primary-text.webp)   |
| SecondaryText | ![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/color-dark-secondary-text.webp) | ![](../../.gitbook/assets/color-secondary-text.webp) |

## Types

### Color.ColorLike

```typescript
ColorLike: Color | Color.Dynamic | Color.Raw;
```

Union type for the supported color types.

When using a [Raw Color](#color.raw), it will be adjusted to achieve high contrast with the Raycast user interface. To disable color adjustment, you need to switch to using a [Dynamic Color](#color.dynamic). However, we recommend leaving color adjustment on, unless your extension depends on exact color reproduction.

#### Example

```typescript
import { Color, Icon, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item title="Built-in color" icon={{ source: Icon.Circle, tintColor: Color.Red }} />
      <List.Item title="Raw color" icon={{ source: Icon.Circle, tintColor: "#FF0000" }} />
      <List.Item
        title="Dynamic color"
        icon={{
          source: Icon.Circle,
          tintColor: {
            light: "#FF01FF",
            dark: "#FFFF50",
            adjustContrast: true,
          },
        }}
      />
    </List>
  );
}
```

### Color.Dynamic

A dynamic color applies different colors depending on the active Raycast theme.

When using a [Dynamic Color](#color.dynamic), it will be adjusted to achieve high contrast with the Raycast user interface. To disable color adjustment, you can set the `adjustContrast` property to `false`. However, we recommend leaving color adjustment on, unless your extension depends on exact color reproduction.

#### Example

```typescript
import { Icon, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        title="Dynamic Tint Color"
        icon={{
          source: Icon.Circle,
          tintColor: {
            light: "#FF01FF",
            dark: "#FFFF50",
            adjustContrast: false,
          },
        }}
      />
      <List.Item
        title="Dynamic Tint Color"
        icon={{
          source: Icon.Circle,
          tintColor: { light: "#FF01FF", dark: "#FFFF50" },
        }}
      />
    </List>
  );
}
```

#### Properties

<InterfaceTableFromJSDoc name="Color.Dynamic" />

### Color.Raw

A color can also be a simple string. You can use any of the following color formats:

- HEX, e.g `#FF0000`
- Short HEX, e.g. `#F00`
- RGBA, e.g. `rgb(255, 0, 0)`
- RGBA Percentage, e.g. `rgb(255, 0, 0, 1.0)`
- HSL, e.g. `hsla(200, 20%, 33%, 0.2)`
- Keywords, e.g. `red`


# Detail

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/detail.webp)

## API Reference

### Detail

Renders a markdown ([CommonMark](https://commonmark.org)) string with an optional metadata panel.

Typically used as a standalone view or when navigating from a [List](list.md).

#### Example

{% tabs %}
{% tab title="Render a markdown string" %}

```typescript
import { Detail } from "@raycast/api";

export default function Command() {
  return <Detail markdown="**Hello** _World_!" />;
}
```

{% endtab %}

{% tab title="Render an image from the assets directory" %}

```typescript
import { Detail } from "@raycast/api";

export default function Command() {
  return <Detail markdown={`![Image Title](/Users/tanerilyazov/Downloads/extensions-main/docs/api-reference/user-interface/example.png)`} />;
}
```

{% endtab %}
{% endtabs %}

#### Props

<PropsTableFromJSDoc component="Detail" />

{% hint style="info" %}
You can specify custom image dimensions by adding a `raycast-width` and `raycast-height` query string to the markdown image. For example: `![Image Title](/Users/tanerilyazov/Downloads/extensions-main/docs/api-reference/user-interface/example.png?raycast-width=250&raycast-height=250)`

You can also specify a tint color to apply to an markdown image by adding a `raycast-tint-color` query string. For example: `![Image Title](/Users/tanerilyazov/Downloads/extensions-main/docs/api-reference/user-interface/example.png?raycast-tintColor=blue)`
{% endhint %}

{% hint style="info" %}
You can now render [LaTeX](https://www.latex-project.org) in the markdown. We support the following delimiters:

- Inline math: `\(...\)` and `\begin{math}...\end{math}`
- Display math: `\[...\]`, `$$...$$` and `\begin{equation}...\end{equation}`

{% endhint %}

### Detail.Metadata

A Metadata view that will be shown in the right-hand-side of the `Detail`.

Use it to display additional structured data about the main content shown in the `Detail` view.

![Detail-metadata illustration](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/detail-metadata.webp)

#### Example

```typescript
import { Detail } from "@raycast/api";

// Define markdown here to prevent unwanted indentation.
const markdown = `
# Pikachu

![](https://assets.pokemon.com/assets/cms2/img/pokedex/full/025.png)

Pikachu that can generate powerful electricity have cheek sacs that are extra soft and super stretchy.
`;

export default function Main() {
  return (
    <Detail
      markdown={markdown}
      navigationTitle="Pikachu"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Height" text={`1' 04"`} />
          <Detail.Metadata.Label title="Weight" text="13.2 lbs" />
          <Detail.Metadata.TagList title="Type">
            <Detail.Metadata.TagList.Item text="Electric" color={"#eed535"} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Evolution" target="https://www.pokemon.com/us/pokedex/pikachu" text="Raichu" />
        </Detail.Metadata>
      }
    />
  );
}
```

#### Props

<PropsTableFromJSDoc component="Detail.Metadata" />

### Detail.Metadata.Label

A single value with an optional icon.

![Detail-metadata-label illustration](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/detail-metadata-label.webp)

#### Example

```typescript
import { Detail } from "@raycast/api";

// Define markdown here to prevent unwanted indentation.
const markdown = `
# Pikachu

![](https://assets.pokemon.com/assets/cms2/img/pokedex/full/025.png)

Pikachu that can generate powerful electricity have cheek sacs that are extra soft and super stretchy.
`;

export default function Main() {
  return (
    <Detail
      markdown={markdown}
      navigationTitle="Pikachu"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Height" text={`1' 04"`} icon="weight.svg" />
        </Detail.Metadata>
      }
    />
  );
}
```

#### Props

<PropsTableFromJSDoc component="Detail.Metadata.Label" />

### Detail.Metadata.Link

An item to display a link.

![Detail-metadata-link illustration](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/detail-metadata-link.webp)

#### Example

```typescript
import { Detail } from "@raycast/api";

// Define markdown here to prevent unwanted indentation.
const markdown = `
# Pikachu

![](https://assets.pokemon.com/assets/cms2/img/pokedex/full/025.png)

Pikachu that can generate powerful electricity have cheek sacs that are extra soft and super stretchy.
`;

export default function Main() {
  return (
    <Detail
      markdown={markdown}
      navigationTitle="Pikachu"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link title="Evolution" target="https://www.pokemon.com/us/pokedex/pikachu" text="Raichu" />
        </Detail.Metadata>
      }
    />
  );
}
```

#### Props

<PropsTableFromJSDoc component="Detail.Metadata.Link" />

### Detail.Metadata.TagList

A list of [`Tags`](detail.md#detail.metadata.taglist.item) displayed in a row.

![Detail-metadata-taglist illustration](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/detail-metadata-taglist.webp)

#### Example

```typescript
import { Detail } from "@raycast/api";

// Define markdown here to prevent unwanted indentation.
const markdown = `
# Pikachu

![](https://assets.pokemon.com/assets/cms2/img/pokedex/full/025.png)

Pikachu that can generate powerful electricity have cheek sacs that are extra soft and super stretchy.
`;

export default function Main() {
  return (
    <Detail
      markdown={markdown}
      navigationTitle="Pikachu"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Type">
            <Detail.Metadata.TagList.Item text="Electric" color={"#eed535"} />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
    />
  );
}
```

#### Props

<PropsTableFromJSDoc component="Detail.Metadata.TagList" />

### Detail.Metadata.TagList.Item

A Tag in a `Detail.Metadata.TagList`.

#### Props

<PropsTableFromJSDoc component="Detail.Metadata.TagList.Item" />

### Detail.Metadata.Separator

A metadata item that shows a separator line. Use it for grouping and visually separating metadata items.

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/detail-metadata-separator.webp)

```typescript
import { Detail } from "@raycast/api";

// Define markdown here to prevent unwanted indentation.
const markdown = `
# Pikachu

![](https://assets.pokemon.com/assets/cms2/img/pokedex/full/025.png)

Pikachu that can generate powerful electricity have cheek sacs that are extra soft and super stretchy.
`;

export default function Main() {
  return (
    <Detail
      markdown={markdown}
      navigationTitle="Pikachu"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Height" text={`1' 04"`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Weight" text="13.2 lbs" />
        </Detail.Metadata>
      }
    />
  );
}
```


# Form

Our `Form` component provides great user experience to collect some data from a user and submit it for extensions needs.

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/example-doppler-share-secrets.webp)

## Two Types of Items: Controlled vs. Uncontrolled

Items in React can be one of two types: controlled or uncontrolled.

An uncontrolled item is the simpler of the two. It's the closest to a plain HTML input. React puts it on the page, and Raycast keeps track of the rest. Uncontrolled inputs require less code, but make it harder to do certain things.

With a controlled item, YOU explicitly control the `value` that the item displays. You have to write code to respond to changes with defining `onChange` callback, store the current `value` somewhere, and pass that value back to the item to be displayed. It's a feedback loop with your code in the middle. It's more manual work to wire these up, but they offer the most control.

You can take look at these two styles below under each of the supported items.

## Validation

Before submitting data, it is important to ensure all required form controls are filled out, in the correct format.

In Raycast, validation can be fully controlled from the API. To keep the same behavior as we have natively, the proper way of usage is to validate a `value` in the `onBlur` callback, update the `error` of the item and keep track of updates with the `onChange` callback to drop the `error` value. The [useForm](../../utils-reference/react-hooks/useForm.md) utils hook nicely wraps this behaviour and is the recommended way to do deal with validations.

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/form-validation.webp)

{% hint style="info" %}
Keep in mind that if the Form has any errors, the [`Action.SubmitForm`](./actions.md#action.submitform) `onSubmit` callback won't be triggered.
{% endhint %}

#### Example

{% tabs %}

{% tab title="FormValidationWithUtils.tsx" %}

```tsx
import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";

interface SignUpFormValues {
  name: string;
  password: string;
}

export default function Command() {
  const { handleSubmit, itemProps } = useForm<SignUpFormValues>({
    onSubmit(values) {
      showToast({
        style: Toast.Style.Success,
        title: "Yay!",
        message: `${values.name} account created`,
      });
    },
    validation: {
      name: FormValidation.Required,
      password: (value) => {
        if (value && value.length < 8) {
          return "Password must be at least 8 symbols";
        } else if (!value) {
          return "The item is required";
        }
      },
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Full Name" placeholder="Tim Cook" {...itemProps.name} />
      <Form.PasswordField title="New Password" {...itemProps.password} />
    </Form>
  );
}
```

{% endtab %}

{% tab title="FormValidationWithoutUtils.tsx" %}

```typescript
import { Form } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [nameError, setNameError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();

  function dropNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  function dropPasswordErrorIfNeeded() {
    if (passwordError && passwordError.length > 0) {
      setPasswordError(undefined);
    }
  }

  return (
    <Form>
      <Form.TextField
        id="nameField"
        title="Full Name"
        placeholder="Tim Cook"
        error={nameError}
        onChange={dropNameErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setNameError("The field should't be empty!");
          } else {
            dropNameErrorIfNeeded();
          }
        }}
      />
      <Form.PasswordField
        id="password"
        title="New Password"
        error={passwordError}
        onChange={dropPasswordErrorIfNeeded}
        onBlur={(event) => {
          const value = event.target.value;
          if (value && value.length > 0) {
            if (!validatePassword(value)) {
              setPasswordError("Password should be at least 8 characters!");
            } else {
              dropPasswordErrorIfNeeded();
            }
          } else {
            setPasswordError("The field should't be empty!");
          }
        }}
      />
      <Form.TextArea id="bioTextArea" title="Add Bio" placeholder="Describe who you are" />
      <Form.DatePicker id="birthDate" title="Date of Birth" />
    </Form>
  );
}

function validatePassword(value: string): boolean {
  return value.length >= 8;
}
```

{% endtab %}

{% endtabs %}

## Drafts

Drafts are a mechanism to preserve filled-in inputs (but not yet submitted) when an end-user exits the command. To enable this mechanism, set the `enableDrafts` prop on your Form and populate the initial values of the Form with the [top-level prop `draftValues`](../../information/lifecycle/README.md#launchprops).

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/form-drafts.webp)

{% hint style="info" %}

- Drafts for forms nested in navigation are not supported yet. In this case, you will see a warning about it.
- Drafts won't preserve the [`Form.Password`](form.md#form.passwordfield)'s values.
- Drafts will be dropped once [`Action.SubmitForm`](./actions.md#action.submitform) is triggered.
- If you call [`popToRoot()`](../window-and-search-bar.md#poptoroot), drafts won't be preserved or updated.

{% endhint %}

#### Example

{% tabs %}
{% tab title="Uncontrolled Form" %}

```typescript
import { Form, ActionPanel, Action, popToRoot, LaunchProps } from "@raycast/api";

interface TodoValues {
  title: string;
  description?: string;
  dueDate?: Date;
}

export default function Command(props: LaunchProps<{ draftValues: TodoValues }>) {
  const { draftValues } = props;

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values: TodoValues) => {
              console.log("onSubmit", values);
              popToRoot();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" defaultValue={draftValues?.title} />
      <Form.TextArea id="description" title="Description" defaultValue={draftValues?.description} />
      <Form.DatePicker id="dueDate" title="Due Date" defaultValue={draftValues?.dueDate} />
    </Form>
  );
}
```

{% endtab %}

{% tab title="Controlled Form" %}

```typescript
import { Form, ActionPanel, Action, popToRoot, LaunchProps } from "@raycast/api";
import { useState } from "react";

interface TodoValues {
  title: string;
  description?: string;
  dueDate?: Date;
}

export default function Command(props: LaunchProps<{ draftValues: TodoValues }>) {
  const { draftValues } = props;

  const [title, setTitle] = useState<string>(draftValues?.title || "");
  const [description, setDescription] = useState<string>(draftValues?.description || "");
  const [dueDate, setDueDate] = useState<Date | null>(draftValues?.dueDate || null);

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values: TodoValues) => {
              console.log("onSubmit", values);
              popToRoot();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" value={title} onChange={setTitle} />
      <Form.TextArea id="description" title="Description" value={description} onChange={setDescription} />
      <Form.DatePicker id="dueDate" title="Due Date" value={dueDate} onChange={setDueDate} />
    </Form>
  );
}
```

{% endtab %}
{% endtabs %}

## API Reference

### Form

Shows a list of form items such as [Form.TextField](form.md#form.textfield), [Form.Checkbox](form.md#form.checkbox) or [Form.Dropdown](form.md#form.dropdown).

Optionally add a [Form.LinkAccessory](form.md#form.linkaccessory) in the right-hand side of the navigation bar.

#### Props

<PropsTableFromJSDoc component="Form" />

### Form.TextField

A form item with a text field for input.

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/form-textfield.webp)

#### Example

{% tabs %}
{% tab title="Uncontrolled text field" %}

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Name" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" defaultValue="Steve" />
    </Form>
  );
}
```

{% endtab %}

{% tab title="Controlled text field" %}

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [name, setName] = useState<string>("");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Name" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" value={name} onChange={setName} />
    </Form>
  );
}
```

{% endtab %}
{% endtabs %}

#### Props

<PropsTableFromJSDoc component="Form.TextField" />

#### Methods (Imperative API)

| Name  | Signature               | Description                                                                |
| ----- | ----------------------- | -------------------------------------------------------------------------- |
| focus | <code>() => void</code> | Makes the item request focus.                                              |
| reset | <code>() => void</code> | Resets the form item to its initial value, or `defaultValue` if specified. |

### Form.PasswordField

A form item with a secure text field for password-entry in which the entered characters must be kept secret.

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/form-password.webp)

#### Example

{% tabs %}
{% tab title="Uncontrolled password field" %}

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Password" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.PasswordField id="password" title="Enter Password" />
    </Form>
  );
}
```

{% endtab %}

{% tab title="Controlled password field" %}

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [password, setPassword] = useState<string>("");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Password" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.PasswordField id="password" value={password} onChange={setPassword} />
    </Form>
  );
}
```

{% endtab %}
{% endtabs %}

#### Props

<PropsTableFromJSDoc component="Form.PasswordField" />

#### Methods (Imperative API)

| Name  | Signature               | Description                                                                |
| ----- | ----------------------- | -------------------------------------------------------------------------- |
| focus | <code>() => void</code> | Makes the item request focus.                                              |
| reset | <code>() => void</code> | Resets the form item to its initial value, or `defaultValue` if specified. |

### Form.TextArea

A form item with a text area for input. The item supports multiline text entry.

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/form-textarea.webp)

#### Example

{% tabs %}
{% tab title="Uncontrolled text area" %}

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";

const DESCRIPTION =
  "We spend too much time staring at loading indicators. The Raycast team is dedicated to make everybody interact faster with their computers.";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Description" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="description" defaultValue={DESCRIPTION} />
    </Form>
  );
}
```

{% endtab %}

{% tab title="Controlled text area" %}

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [description, setDescription] = useState<string>("");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Description" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="description" value={description} onChange={setDescription} />
    </Form>
  );
}
```

{% endtab %}
{% endtabs %}

#### Props

<PropsTableFromJSDoc component="Form.TextArea" />

#### Methods (Imperative API)

| Name  | Signature               | Description                                                                |
| ----- | ----------------------- | -------------------------------------------------------------------------- |
| focus | <code>() => void</code> | Makes the item request focus.                                              |
| reset | <code>() => void</code> | Resets the form item to its initial value, or `defaultValue` if specified. |

### Form.Checkbox

A form item with a checkbox.

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/form-checkbox.webp)

#### Example

{% tabs %}
{% tab title="Uncontrolled checkbox" %}

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Answer" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.Checkbox id="answer" label="Are you happy?" defaultValue={true} />
    </Form>
  );
}
```

{% endtab %}

{% tab title="Controlled checkbox" %}

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [checked, setChecked] = useState(true);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Answer" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.Checkbox id="answer" label="Do you like orange juice?" value={checked} onChange={setChecked} />
    </Form>
  );
}
```

{% endtab %}
{% endtabs %}

#### Props

<PropsTableFromJSDoc component="Form.Checkbox" />

#### Methods (Imperative API)

| Name  | Signature               | Description                                                                |
| ----- | ----------------------- | -------------------------------------------------------------------------- |
| focus | <code>() => void</code> | Makes the item request focus.                                              |
| reset | <code>() => void</code> | Resets the form item to its initial value, or `defaultValue` if specified. |

### Form.DatePicker

A form item with a date picker.

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/form-datepicker.webp)

#### Example

{% tabs %}
{% tab title="Uncontrolled date picker" %}

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Form" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.DatePicker id="dateOfBirth" title="Date of Birth" defaultValue={new Date(1955, 1, 24)} />
    </Form>
  );
}
```

{% endtab %}

{% tab title="Controlled date picker" %}

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [date, setDate] = useState<Date | null>(null);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Form" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.DatePicker id="launchDate" title="Launch Date" value={date} onChange={setDate} />
    </Form>
  );
}
```

{% endtab %}
{% endtabs %}

#### Props

<PropsTableFromJSDoc component="Form.DatePicker" />

#### Methods (Imperative API)

| Name  | Signature               | Description                                                                |
| ----- | ----------------------- | -------------------------------------------------------------------------- |
| focus | <code>() => void</code> | Makes the item request focus.                                              |
| reset | <code>() => void</code> | Resets the form item to its initial value, or `defaultValue` if specified. |

#### Form.DatePicker.isFullDay

A method that determines if a given date represents a full day or a specific time.

```ts
import { ActionPanel, Form, Action } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Event"
            onSubmit={(values) => {
              if (Form.DatePicker.isFullDay(values.reminderDate)) {
                // the event is for a full day
              } else {
                // the event is at a specific time
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.DatePicker id="eventTitle" title="Title" />
      <Form.DatePicker id="eventDate" title="Date" />
    </Form>
  );
}
```

### Form.Dropdown

A form item with a dropdown menu.

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/form-dropdown.webp)

#### Example

{% tabs %}
{% tab title="Uncontrolled dropdown" %}

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Favorite" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="emoji" title="Favorite Emoji" defaultValue="lol">
        <Form.Dropdown.Item value="poop" title="Pile of poop" icon="💩" />
        <Form.Dropdown.Item value="rocket" title="Rocket" icon="🚀" />
        <Form.Dropdown.Item value="lol" title="Rolling on the floor laughing face" icon="🤣" />
      </Form.Dropdown>
    </Form>
  );
}
```

{% endtab %}

{% tab title="Controlled dropdown" %}

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [programmingLanguage, setProgrammingLanguage] = useState<string>("typescript");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Favorite" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="dropdown"
        title="Favorite Language"
        value={programmingLanguage}
        onChange={setProgrammingLanguage}
      >
        <Form.Dropdown.Item value="cpp" title="C++" />
        <Form.Dropdown.Item value="javascript" title="JavaScript" />
        <Form.Dropdown.Item value="ruby" title="Ruby" />
        <Form.Dropdown.Item value="python" title="Python" />
        <Form.Dropdown.Item value="swift" title="Swift" />
        <Form.Dropdown.Item value="typescript" title="TypeScript" />
      </Form.Dropdown>
    </Form>
  );
}
```

{% endtab %}
{% endtabs %}

#### Props

<PropsTableFromJSDoc component="Form.Dropdown" />

#### Methods (Imperative API)

| Name  | Signature               | Description                                                                |
| ----- | ----------------------- | -------------------------------------------------------------------------- |
| focus | <code>() => void</code> | Makes the item request focus.                                              |
| reset | <code>() => void</code> | Resets the form item to its initial value, or `defaultValue` if specified. |

### Form.Dropdown.Item

A dropdown item in a [Form.Dropdown](form.md#form.dropdown)

#### Example

```typescript
import { Action, ActionPanel, Form, Icon } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Icon" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="icon" title="Icon">
        <Form.Dropdown.Item value="circle" title="Cirlce" icon={Icon.Circle} />
      </Form.Dropdown>
    </Form>
  );
}
```

#### Props

<PropsTableFromJSDoc component="Form.Dropdown.Item" />

### Form.Dropdown.Section

Visually separated group of dropdown items.

Use sections to group related menu items together.

#### Example

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Favorite" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="food" title="Favorite Food">
        <Form.Dropdown.Section title="Fruits">
          <Form.Dropdown.Item value="apple" title="Apple" icon="🍎" />
          <Form.Dropdown.Item value="banana" title="Banana" icon="🍌" />
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title="Vegetables">
          <Form.Dropdown.Item value="broccoli" title="Broccoli" icon="🥦" />
          <Form.Dropdown.Item value="carrot" title="Carrot" icon="🥕" />
        </Form.Dropdown.Section>
      </Form.Dropdown>
    </Form>
  );
}
```

#### Props

<PropsTableFromJSDoc component="Form.Dropdown.Section" />

### Form.TagPicker

A form item with a tag picker that allows the user to select multiple items.

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/form-tagpicker.webp)

#### Example

{% tabs %}
{% tab title="Uncontrolled tag picker" %}

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Favorite" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.TagPicker id="sports" title="Favorite Sports" defaultValue={["football"]}>
        <Form.TagPicker.Item value="basketball" title="Basketball" icon="🏀" />
        <Form.TagPicker.Item value="football" title="Football" icon="⚽️" />
        <Form.TagPicker.Item value="tennis" title="Tennis" icon="🎾" />
      </Form.TagPicker>
    </Form>
  );
}
```

{% endtab %}

{% tab title="Controlled tag picker" %}

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [countries, setCountries] = useState<string[]>(["ger", "ned", "pol"]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Countries" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.TagPicker id="countries" title="Visited Countries" value={countries} onChange={setCountries}>
        <Form.TagPicker.Item value="ger" title="Germany" icon="🇩🇪" />
        <Form.TagPicker.Item value="ind" title="India" icon="🇮🇳" />
        <Form.TagPicker.Item value="ned" title="Netherlands" icon="🇳🇱" />
        <Form.TagPicker.Item value="nor" title="Norway" icon="🇳🇴" />
        <Form.TagPicker.Item value="pol" title="Poland" icon="🇵🇱" />
        <Form.TagPicker.Item value="rus" title="Russia" icon="🇷🇺" />
        <Form.TagPicker.Item value="sco" title="Scotland" icon="🏴󠁧󠁢󠁳󠁣󠁴󠁿" />
      </Form.TagPicker>
    </Form>
  );
}
```

{% endtab %}
{% endtabs %}

#### Props

<PropsTableFromJSDoc component="Form.TagPicker" />

#### Methods (Imperative API)

| Name  | Signature               | Description                                                                |
| ----- | ----------------------- | -------------------------------------------------------------------------- |
| focus | <code>() => void</code> | Makes the item request focus.                                              |
| reset | <code>() => void</code> | Resets the form item to its initial value, or `defaultValue` if specified. |

### Form.TagPicker.Item

A tag picker item in a [Form.TagPicker](form.md#form.tagpicker).

#### Example

```typescript
import { ActionPanel, Color, Form, Icon, Action } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Color" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.TagPicker id="color" title="Color">
        <Form.TagPicker.Item value="red" title="Red" icon={{ source: Icon.Circle, tintColor: Color.Red }} />
        <Form.TagPicker.Item value="green" title="Green" icon={{ source: Icon.Circle, tintColor: Color.Green }} />
        <Form.TagPicker.Item value="blue" title="Blue" icon={{ source: Icon.Circle, tintColor: Color.Blue }} />
      </Form.TagPicker>
    </Form>
  );
}
```

#### Props

<PropsTableFromJSDoc component="Form.TagPicker.Item" />

### Form.Separator

A form item that shows a separator line. Use for grouping and visually separating form items.

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/form-separator.webp)

#### Example

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Form" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.TextField id="textfield" />
      <Form.Separator />
      <Form.TextArea id="textarea" />
    </Form>
  );
}
```

### Form.FilePicker

A form item with a button to open a dialog to pick some files and/or some directories (depending on its props).

{% hint style="info" %}
While the user picked some items that existed, it might be possible for them to be deleted or changed when the `onSubmit` callback is called. Hence you should always make sure that the items exist before acting on them!
{% endhint %}

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/form-filepicker-multiple.webp)

![Single Selection](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/form-filepicker-single.webp)

#### Example

{% tabs %}
{% tab title="Uncontrolled file picker" %}

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";
import fs from "fs";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit Name"
            onSubmit={(values: { files: string[] }) => {
              const files = values.files.filter((file: any) => fs.existsSync(file) && fs.lstatSync(file).isFile());
              console.log(files);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" />
    </Form>
  );
}
```

{% endtab %}

{% tab title="Single selection file picker" %}

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";
import fs from "fs";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit Name"
            onSubmit={(values: { files: string[] }) => {
              const file = values.files[0];
              if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) {
                return false;
              }
              console.log(file);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" allowMultipleSelection={false} />
    </Form>
  );
}
```

{% endtab %}

{% tab title="Directory picker" %}

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";
import fs from "fs";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit Name"
            onSubmit={(values: { folders: string[] }) => {
              const folder = values.folders[0];
              if (!fs.existsSync(folder) || fs.lstatSync(folder).isDirectory()) {
                return false;
              }
              console.log(folder);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="folders" allowMultipleSelection={false} canChooseDirectories canChooseFiles={false} />
    </Form>
  );
}
```

{% endtab %}

{% tab title="Controlled file picker" %}

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [files, setFiles] = useState<string[]>([]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Name" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" value={files} onChange={setFiles} />
    </Form>
  );
}
```

{% endtab %}
{% endtabs %}

#### Props

<PropsTableFromJSDoc component="Form.FilePicker" />

#### Methods (Imperative API)

| Name  | Signature               | Description                                                                |
| ----- | ----------------------- | -------------------------------------------------------------------------- |
| focus | <code>() => void</code> | Makes the item request focus.                                              |
| reset | <code>() => void</code> | Resets the form item to its initial value, or `defaultValue` if specified. |

### Form.Description

A form item with a simple text label.

Do _not_ use this component to show validation messages for other form fields.

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/form-description.webp)

#### Example

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Import / Export"
        text="Exporting will back-up your preferences, quicklinks, snippets, floating notes, script-command folder paths, aliases, hotkeys, favorites and other data."
      />
    </Form>
  );
}
```

#### Props

<PropsTableFromJSDoc component="Form.Description" />

### Form.LinkAccessory

A link that will be shown in the right-hand side of the navigation bar.

#### Example

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";

export default function Command() {
  return (
    <Form
      searchBarAccessory={
        <Form.LinkAccessory
          target="https://developers.raycast.com/api-reference/user-interface/form"
          text="Open Documentation"
        />
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Name" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" defaultValue="Steve" />
    </Form>
  );
}
```

#### Props

<PropsTableFromJSDoc component="Form.LinkAccessory" />

## Types

#### Form.Event

Some Form.Item callbacks (like `onFocus` and `onBlur`) can return a `Form.Event` object that you can use in a different ways.

<InterfaceTableFromJSDoc name="Form.Event" />

#### Example

```typescript
import { Form } from "@raycast/api";

export default function Main() {
  return (
    <Form>
      <Form.TextField id="textField" title="Text Field" onBlur={logEvent} onFocus={logEvent} />
      <Form.TextArea id="textArea" title="Text Area" onBlur={logEvent} onFocus={logEvent} />
      <Form.Dropdown id="dropdown" title="Dropdown" onBlur={logEvent} onFocus={logEvent}>
        {[1, 2, 3, 4, 5, 6, 7].map((num) => (
          <Form.Dropdown.Item value={String(num)} title={String(num)} key={num} />
        ))}
      </Form.Dropdown>
      <Form.TagPicker id="tagPicker" title="Tag Picker" onBlur={logEvent} onFocus={logEvent}>
        {[1, 2, 3, 4, 5, 6, 7].map((num) => (
          <Form.TagPicker.Item value={String(num)} title={String(num)} key={num} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

function logEvent(event: Form.Event<string[] | string>) {
  console.log(`Event '${event.type}' has happened for '${event.target.id}'. Current 'value': '${event.target.value}'`);
}
```

#### Form.Event.Type

The different types of [`Form.Event`](form.md#form.event). Can be `"focus"` or `"blur"`.

### Form.Values

Values of items in the form.

For type-safe form values, you can define your own interface. Use the ID's of the form items as the property name.

#### Example

```typescript
import { Form, Action, ActionPanel } from "@raycast/api";

interface Values {
  todo: string;
  due?: Date;
}

export default function Command() {
  function handleSubmit(values: Values) {
    console.log(values);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="todo" title="Todo" />
      <Form.DatePicker id="due" title="Due Date" />
    </Form>
  );
}
```

#### Properties

| Name              | Type  | Required | Description                     |
| ----------------- | ----- | -------- | ------------------------------- |
| \[itemId: string] | `any` | Yes      | The form value of a given item. |

### Form.DatePicker.Type

The types of date components the user can pick with a `Form.DatePicker`.

#### Enumeration members

| Name     | Description                                                      |
| -------- | ---------------------------------------------------------------- |
| DateTime | Hour and second can be picked in addition to year, month and day |
| Date     | Only year, month, and day can be picked                          |

---

## Imperative API

You can use React's [useRef](https://reactjs.org/docs/hooks-reference.html#useref) hook to create variables which have access to imperative APIs (such as `.focus()` or `.reset()`) exposed by the native form items.

```typescript
import { useRef } from "react";
import { ActionPanel, Form, Action } from "@raycast/api";

interface FormValues {
  nameField: string;
  bioTextArea: string;
  datePicker: string;
}

export default function Command() {
  const textFieldRef = useRef<Form.TextField>(null);
  const textAreaRef = useRef<Form.TextArea>(null);
  const datePickerRef = useRef<Form.DatePicker>(null);
  const passwordFieldRef = useRef<Form.PasswordField>(null);
  const dropdownRef = useRef<Form.Dropdown>(null);
  const tagPickerRef = useRef<Form.TagPicker>(null);
  const firstCheckboxRef = useRef<Form.Checkbox>(null);
  const secondCheckboxRef = useRef<Form.Checkbox>(null);

  async function handleSubmit(values: FormValues) {
    console.log(values);
    datePickerRef.current?.focus();
    dropdownRef.current?.reset();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
          <ActionPanel.Section title="Focus">
            <Action title="Focus TextField" onAction={() => textFieldRef.current?.focus()} />
            <Action title="Focus TextArea" onAction={() => textAreaRef.current?.focus()} />
            <Action title="Focus DatePicker" onAction={() => datePickerRef.current?.focus()} />
            <Action title="Focus PasswordField" onAction={() => passwordFieldRef.current?.focus()} />
            <Action title="Focus Dropdown" onAction={() => dropdownRef.current?.focus()} />
            <Action title="Focus TagPicker" onAction={() => tagPickerRef.current?.focus()} />
            <Action title="Focus First Checkbox" onAction={() => firstCheckboxRef.current?.focus()} />
            <Action title="Focus Second Checkbox" onAction={() => secondCheckboxRef.current?.focus()} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Reset">
            <Action title="Reset TextField" onAction={() => textFieldRef.current?.reset()} />
            <Action title="Reset TextArea" onAction={() => textAreaRef.current?.reset()} />
            <Action title="Reset DatePicker" onAction={() => datePickerRef.current?.reset()} />
            <Action title="Reset PasswordField" onAction={() => passwordFieldRef.current?.reset()} />
            <Action title="Reset Dropdown" onAction={() => dropdownRef.current?.reset()} />
            <Action title="Reset TagPicker" onAction={() => tagPickerRef.current?.reset()} />
            <Action title="Reset First Checkbox" onAction={() => firstCheckboxRef.current?.reset()} />
            <Action title="Reset Second Checkbox" onAction={() => secondCheckboxRef.current?.reset()} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField id="textField" title="TextField" ref={textFieldRef} />
      <Form.TextArea id="textArea" title="TextArea" ref={textAreaRef} />
      <Form.DatePicker id="datePicker" title="DatePicker" ref={datePickerRef} />
      <Form.PasswordField id="passwordField" title="PasswordField" ref={passwordFieldRef} />
      <Form.Separator />
      <Form.Dropdown
        id="dropdown"
        title="Dropdown"
        defaultValue="first"
        onChange={(newValue) => {
          console.log(newValue);
        }}
        ref={dropdownRef}
      >
        <Form.Dropdown.Item value="first" title="First" />
        <Form.Dropdown.Item value="second" title="Second" />
      </Form.Dropdown>
      <Form.Separator />
      <Form.TagPicker
        id="tagPicker"
        title="TagPicker"
        ref={tagPickerRef}
        onChange={(t) => {
          console.log(t);
        }}
      >
        {["one", "two", "three"].map((tag) => (
          <Form.TagPicker.Item key={tag} value={tag} title={tag} />
        ))}
      </Form.TagPicker>
      <Form.Separator />
      <Form.Checkbox
        id="firstCheckbox"
        title="First Checkbox"
        label="First Checkbox"
        ref={firstCheckboxRef}
        onChange={(checked) => {
          console.log("first checkbox onChange ", checked);
        }}
      />
      <Form.Checkbox
        id="secondCheckbox"
        title="Second Checkbox"
        label="Second Checkbox"
        ref={secondCheckboxRef}
        onChange={(checked) => {
          console.log("second checkbox onChange ", checked);
        }}
      />
      <Form.Separator />
    </Form>
  );
}
```


# Grid

The `Grid` component is provided as an alternative to the [List](list.md#list) component when the defining characteristic of an item is an image.

{% hint style="info" %}
Because its API tries to stick as closely to [List](list.md#list)'s as possible, changing a view from [List](list.md#list) to [Grid](#grid) should be as simple as:

- making sure you're using at least version 1.36.0 of the `@raycast/api` package
- updating your imports from `import { List } from '@raycast/api'` to `import { Grid } from '@raycast/api'`;
- removing the `isShowingDetail` prop from the top-level `List` component, along with all [List.Item](list.md#list.item)s' `detail` prop
- renaming all [List.Item](list.md#list.item)s' h`icon` prop to `content`
- removing all [List.Item](list.md#list.item)s' `accessories`, `accessoryIcon` and `accessoryTitle props; [Grid.Item](#grid.item) does not _currently_ support accessories
- finally, replacing all usages of `List` with `Grid`.
  {% endhint %}

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/grid.webp)

## Search Bar

The search bar allows users to interact quickly with grid items. By default, [Grid.Items](#grid.item) are displayed if the user's input can be (fuzzy) matched to the item's `title` or `keywords`.

### Custom filtering

Sometimes, you may not want to rely on Raycast's filtering, but use/implement your own. If that's the case, you can set the `Grid`'s `filtering` [prop](#props) to false, and the items displayed will be independent of the search bar's text.
Note that `filtering` is also implicitly set to false if an `onSearchTextChange` listener is specified. If you want to specify a change listener and _still_ take advantage of Raycast's built-in filtering, you can explicitly set `filtering` to true.

```typescript
import { useEffect, useState } from "react";
import { Grid } from "@raycast/api";

const items = [
  { content: "🙈", keywords: ["see-no-evil", "monkey"] },
  { content: "🥳", keywords: ["partying", "face"] },
];

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filteredList, filterList] = useState(items);

  useEffect(() => {
    filterList(items.filter((item) => item.keywords.some((keyword) => keyword.includes(searchText))));
  }, [searchText]);

  return (
    <Grid
      columns={5}
      inset={Grid.Inset.Large}
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Emoji"
      searchBarPlaceholder="Search your favorite emoji"
    >
      {filteredList.map((item) => (
        <Grid.Item key={item.content} content={item.content} />
      ))}
    </Grid>
  );
}
```

### Programmatically updating the search bar

Other times, you may want the content of the search bar to be updated by the extension, for example, you may store a list of the user's previous searches and, on the next visit, allow them to "continue" where they left off.

To do so, you can use the `searchText` [prop](#props).

```typescript
import { useState } from "react";
import { Action, ActionPanel, Grid } from "@raycast/api";

const items = [
  { content: "🙈", keywords: ["see-no-evil", "monkey"] },
  { content: "🥳", keywords: ["partying", "face"] },
];

export default function Command() {
  const [searchText, setSearchText] = useState("");

  return (
    <Grid
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Emoji"
      searchBarPlaceholder="Search your favorite emoji"
    >
      {items.map((item) => (
        <Grid.Item
          key={item.content}
          content={item.content}
          actions={
            <ActionPanel>
              <Action title="Select" onAction={() => setSearchText(item.content)} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
```

### Dropdown

Some extensions may benefit from giving users a second filtering dimension. A media file management extension may allow users to view only videos or only images, an image-searching extension may allow switching ssearch engines, etc.

This is where the `searchBarAccessory` [prop](#props) is useful. Pass it a [Grid.Dropdown](#grid.dropdown) component, and it will be displayed on the right-side of the search bar. Invoke it either by using the global shortcut `⌘` `P` or by clicking on it.

### Pagination

{% hint style="info" %}
Pagination requires version 1.69.0 or higher of the `@raycast/api` package.
{% endhint %}

`Grid`s have built-in support for pagination. To opt in to pagination, you need to pass it a `pagination` prop, which is an object providing 3 pieces of information:

- `onLoadMore` - will be called by Raycast when the user reaches the end of the grid, either using the keyboard or the mouse. When it gets called, the extension is expected to perform an async operation which eventually can result in items being appended to the end of the grid.
- `hasMore` - indicates to Raycast whether it _should_ call `onLoadMore` when the user reaches the end of the grid.
- `pageSize` - indicates how many placeholder items Raycast should add to the end of the grid when it calls `onLoadMore`. Once `onLoadMore` finishes executing, the placeholder items will be replaced by the newly-added grid items.

Note that extensions have access to a limited amount of memory. As your extension paginates, its memory usage will increase. Paginating extensively could lead to the extension eventually running out of memory and crashing. To protect against the extension crashing due to memory exhaustion, Raycast monitors the extension's memory usage and employs heuristics to determine whether it's safe to paginate further. If it's deemed unsafe to continue paginating, `onLoadMore` will not be triggered when the user scrolls to the bottom, regardless of the `hasMore` value. Additionally, during development, a warning will be printed in the terminal.

For convenience, most of the [hooks](../../utils-reference/getting-started.md) that we provide have built-in pagination support. Here's an example of how to add pagination support to a simple command using [usePromise](../../utils-reference/react-hooks/usePromise.md), and one "from scratch".

{% tabs %}

{% tab title="GridWithUsePromisePagination.tsx" %}

```typescript
import { setTimeout } from "node:timers/promises";
import { useState } from "react";
import { Grid } from "@raycast/api";
import { usePromise } from "@raycast/utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { isLoading, data, pagination } = usePromise(
    (searchText: string) => async (options: { page: number }) => {
      await setTimeout(200);
      const newData = Array.from({ length: 25 }, (_v, index) => ({ index, page: options.page, text: searchText }));
      return { data: newData, hasMore: options.page < 10 };
    },
    [searchText]
  );

  return (
    <Grid isLoading={isLoading} onSearchTextChange={setSearchText} pagination={pagination}>
      {data?.map((item) => (
        <Grid.Item
          key={`${item.index} ${item.page} ${item.text}`}
          content=""
          title={`Page: ${item.page} Item ${item.index}`}
          subtitle={item.text}
        />
      ))}
    </Grid>
  );
}
```

{% endtab %}

{% tab title="GridWithPagination.tsx" %}

```typescript
import { setTimeout } from "node:timers/promises";
import { useCallback, useEffect, useRef, useState } from "react";
import { Grid } from "@raycast/api";

type State = {
  searchText: string;
  isLoading: boolean;
  hasMore: boolean;
  data: {
    index: number;
    page: number;
    text: string;
  }[];
  nextPage: number;
};
const pageSize = 20;
export default function Command() {
  const [state, setState] = useState<State>({ searchText: "", isLoading: true, hasMore: true, data: [], nextPage: 0 });
  const cancelRef = useRef<AbortController | null>(null);

  const loadNextPage = useCallback(async (searchText: string, nextPage: number, signal?: AbortSignal) => {
    setState((previous) => ({ ...previous, isLoading: true }));
    await setTimeout(200);
    const newData = Array.from({ length: pageSize }, (_v, index) => ({
      index,
      page: nextPage,
      text: searchText,
    }));
    if (signal?.aborted) {
      return;
    }
    setState((previous) => ({
      ...previous,
      data: [...previous.data, ...newData],
      isLoading: false,
      hasMore: nextPage < 10,
    }));
  }, []);

  const onLoadMore = useCallback(() => {
    setState((previous) => ({ ...previous, nextPage: previous.nextPage + 1 }));
  }, []);

  const onSearchTextChange = useCallback(
    (searchText: string) => {
      if (searchText === state.searchText) return;
      setState((previous) => ({
        ...previous,
        data: [],
        nextPage: 0,
        searchText,
      }));
    },
    [state.searchText]
  );

  useEffect(() => {
    cancelRef.current?.abort();
    cancelRef.current = new AbortController();
    loadNextPage(state.searchText, state.nextPage, cancelRef.current?.signal);
    return () => {
      cancelRef.current?.abort();
    };
  }, [loadNextPage, state.searchText, state.nextPage]);

  return (
    <Grid
      isLoading={state.isLoading}
      onSearchTextChange={onSearchTextChange}
      pagination={{ onLoadMore, hasMore: state.hasMore, pageSize }}
    >
      {state.data.map((item) => (
        <Grid.Item
          key={`${item.index} ${item.page} ${item.text}`}
          content=""
          title={`Page: ${item.page} Item ${item.index}`}
          subtitle={item.text}
        />
      ))}
    </Grid>
  );
}
```

{% endtab %}

{% endtabs %}

{% hint style="warning" %}
Pagination might not work properly if all grid items are rendered and visible at once, as `onLoadMore` won't be triggered. This typically happens when an API returns 10 results by default, all fitting within the Raycast window. To fix this, try displaying more items, like 20.
{% endhint %}

## Examples

{% tabs %}
{% tab title="Grid.tsx" %}

```jsx
import { Grid } from "@raycast/api";

export default function Command() {
  return (
    <Grid columns={8} inset={Grid.Inset.Large}>
      <Grid.Item content="🥳" />
      <Grid.Item content="🙈" />
    </Grid>
  );
}
```

{% endtab %}

{% tab title="GridWithSections.tsx" %}

```typescript
import { Grid } from "@raycast/api";

export default function Command() {
  return (
    <Grid>
      <Grid.Section title="Section 1">
        <Grid.Item content="https://placekitten.com/400/400" title="Item 1" />
      </Grid.Section>
      <Grid.Section title="Section 2" subtitle="Optional subtitle">
        <Grid.Item content="https://placekitten.com/400/400" title="Item 1" />
      </Grid.Section>
    </Grid>
  );
}
```

{% endtab %}

{% tab title="GridWithActions.tsx" %}

```typescript
import { ActionPanel, Action, Grid } from "@raycast/api";

export default function Command() {
  return (
    <Grid>
      <Grid.Item
        content="https://placekitten.com/400/400"
        title="Item 1"
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content="👋" />
          </ActionPanel>
        }
      />
    </Grid>
  );
}
```

{% endtab %}

{% tab title="GridWithEmptyView.tsx" %}

```typescript
import { useEffect, useState } from "react";
import { Grid, Image } from "@raycast/api";

export default function CommandWithCustomEmptyView() {
  const [state, setState] = useState<{
    searchText: string;
    items: { content: Image.ImageLike; title: string }[];
  }>({ searchText: "", items: [] });

  useEffect(() => {
    console.log("Running effect after state.searchText changed. Current value:", JSON.stringify(state.searchText));
    // perform an API call that eventually populates `items`.
  }, [state.searchText]);

  return (
    <Grid onSearchTextChange={(newValue) => setState((previous) => ({ ...previous, searchText: newValue }))}>
      {state.searchText === "" && state.items.length === 0 ? (
        <Grid.EmptyView icon={{ source: "https://placekitten.com/500/500" }} title="Type something to get started" />
      ) : (
        state.items.map((item, index) => <Grid.Item key={index} content={item.content} title={item.title} />)
      )}
    </Grid>
  );
}
```

{% endtab %}

{% endtabs %}

## API Reference

### Grid

Displays [Grid.Section](#grid.section)s or [Grid.Item](#grid.item)s.

The grid uses built-in filtering by indexing the title & keywords of its items.

#### Example

```typescript
import { Grid } from "@raycast/api";

const items = [
  { content: "🙈", keywords: ["see-no-evil", "monkey"] },
  { content: "🥳", keywords: ["partying", "face"] },
];

export default function Command() {
  return (
    <Grid
      columns={5}
      inset={Grid.Inset.Large}
      navigationTitle="Search Emoji"
      searchBarPlaceholder="Search your favorite emoji"
    >
      {items.map((item) => (
        <Grid.Item key={item.content} content={item.content} keywords={item.keywords} />
      ))}
    </Grid>
  );
}
```

#### Props

<PropsTableFromJSDoc component="Grid" />

### Grid.Dropdown

A dropdown menu that will be shown in the right-hand-side of the search bar.

#### Example

```typescript
import { Grid, Image } from "@raycast/api";
import { useState } from "react";

const types = [
  { id: 1, name: "Smileys", value: "smileys" },
  { id: 2, name: "Animals & Nature", value: "animals-and-nature" },
];

const items: { [key: string]: { content: Image.ImageLike; keywords: string[] }[] } = {
  smileys: [{ content: "🥳", keywords: ["partying", "face"] }],
  "animals-and-nature": [{ content: "🙈", keywords: ["see-no-evil", "monkey"] }],
};

export default function Command() {
  const [type, setType] = useState<string>("smileys");

  return (
    <Grid
      navigationTitle="Search Beers"
      searchBarPlaceholder="Search your favorite drink"
      searchBarAccessory={
        <Grid.Dropdown tooltip="Select Emoji Category" storeValue={true} onChange={(newValue) => setType(newValue)}>
          <Grid.Dropdown.Section title="Emoji Categories">
            {types.map((type) => (
              <Grid.Dropdown.Item key={type.id} title={type.name} value={type.value} />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {(items[type] || []).map((item) => (
        <Grid.Item key={`${item.content}`} content={item.content} keywords={item.keywords} />
      ))}
    </Grid>
  );
}
```

#### Props

<PropsTableFromJSDoc component="Grid.Dropdown" />

### Grid.Dropdown.Item

A dropdown item in a [Grid.Dropdown](#grid.dropdown)

#### Example

```typescript
import { Grid } from "@raycast/api";

export default function Command() {
  return (
    <Grid
      searchBarAccessory={
        <Grid.Dropdown tooltip="Dropdown With Items">
          <Grid.Dropdown.Item title="One" value="one" />
          <Grid.Dropdown.Item title="Two" value="two" />
          <Grid.Dropdown.Item title="Three" value="three" />
        </Grid.Dropdown>
      }
    >
      <Grid.Item content="https://placekitten.com/400/400" title="Item in the Main Grid" />
    </Grid>
  );
}
```

#### Props

<PropsTableFromJSDoc component="Grid.Dropdown.Item" />

### Grid.Dropdown.Section

Visually separated group of dropdown items.

Use sections to group related menu items together.

#### Example

```typescript
import { Grid } from "@raycast/api";

export default function Command() {
  return (
    <Grid
      searchBarAccessory={
        <Grid.Dropdown tooltip="Dropdown With Sections">
          <Grid.Dropdown.Section title="First Section">
            <Grid.Dropdown.Item title="One" value="one" />
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Second Section">
            <Grid.Dropdown.Item title="Two" value="two" />
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      <Grid.Item content="https://placekitten.com/400/400" title="Item in the Main Grid" />
    </Grid>
  );
}
```

#### Props

<PropsTableFromJSDoc component="Grid.Dropdown.Section" />

### Grid.EmptyView

A view to display when there aren't any items available. Use to greet users with a friendly message if the
extension requires user input before it can show any items e.g. when searching for an image, a gif etc.

Raycast provides a default `EmptyView` that will be displayed if the Grid component either has no children,
or if it has children, but none of them match the query in the search bar. This too can be overridden by passing an
empty view alongside the other `Grid.Item`s.

Note that the `EmptyView` is _never_ displayed if the `Grid`'s `isLoading` property is true and the search bar is empty.

![Grid EmptyView illustration](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/grid-empty-view.webp)

#### Example

```typescript
import { useEffect, useState } from "react";
import { Grid, Image } from "@raycast/api";

export default function CommandWithCustomEmptyView() {
  const [state, setState] = useState<{
    searchText: string;
    items: { content: Image.ImageLike; title: string }[];
  }>({ searchText: "", items: [] });

  useEffect(() => {
    console.log("Running effect after state.searchText changed. Current value:", JSON.stringify(state.searchText));
    // perform an API call that eventually populates `items`.
  }, [state.searchText]);

  return (
    <Grid onSearchTextChange={(newValue) => setState((previous) => ({ ...previous, searchText: newValue }))}>
      {state.searchText === "" && state.items.length === 0 ? (
        <Grid.EmptyView icon={{ source: "https://placekitten.com/500/500" }} title="Type something to get started" />
      ) : (
        state.items.map((item, index) => <Grid.Item key={index} content={item.content} title={item.title} />)
      )}
    </Grid>
  );
}
```

#### Props

<PropsTableFromJSDoc component="Grid.EmptyView" />

### Grid.Item

A item in the [Grid](#grid).

This is one of the foundational UI components of Raycast. A grid item represents a single entity. It can be an image, an emoji, a GIF etc. You most likely want to perform actions on this item, so make it clear
to the user what this item is about.

#### Example

```typescript
import { Grid } from "@raycast/api";

export default function Command() {
  return (
    <Grid>
      <Grid.Item content="🥳" title="Partying Face" subtitle="Smiley" />
    </Grid>
  );
}
```

#### Props

<PropsTableFromJSDoc component="Grid.Item" />

### Grid.Section

A group of related [Grid.Item](#grid.item).

Sections are a great way to structure your grid. For example, you can group photos taken in the same place or in the same day. This way, the user can quickly access what is most relevant.

Sections can specify their own `columns`, `fit`, `aspectRatio` and `inset` props, separate from what is defined on the main [Grid](#grid) component.

#### Example

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/grid-styled-sections.webp)

{% tabs %}
{% tab title="GridWithSection.tsx" %}

```typescript
import { Grid } from "@raycast/api";

export default function Command() {
  return (
    <Grid>
      <Grid.Section title="Section 1">
        <Grid.Item content="https://placekitten.com/400/400" title="Item 1" />
      </Grid.Section>
      <Grid.Section title="Section 2" subtitle="Optional subtitle">
        <Grid.Item content="https://placekitten.com/400/400" title="Item 1" />
      </Grid.Section>
    </Grid>
  );
}
```

{% endtab %}
{% tab title="GridWithStyledSection.tsx" %}

```typescript
import { Grid, Color } from "@raycast/api";

export default function Command() {
  return (
    <Grid columns={6}>
      <Grid.Section aspectRatio="2/3" title="Movies">
        <Grid.Item content="https://api.lorem.space/image/movie?w=150&h=220" />
        <Grid.Item content="https://api.lorem.space/image/movie?w=150&h=220" />
        <Grid.Item content="https://api.lorem.space/image/movie?w=150&h=220" />
        <Grid.Item content="https://api.lorem.space/image/movie?w=150&h=220" />
        <Grid.Item content="https://api.lorem.space/image/movie?w=150&h=220" />
        <Grid.Item content="https://api.lorem.space/image/movie?w=150&h=220" />
      </Grid.Section>
      <Grid.Section columns={8} title="Colors">
        {Object.entries(Color).map(([key, value]) => (
          <Grid.Item key={key} content={{ color: value }} title={key} />
        ))}
      </Grid.Section>
    </Grid>
  );
}
```

{% endtab %}

{% endtabs %}

#### Props

<PropsTableFromJSDoc component="Grid.Section" />

## Types

### Grid.Item.Accessory

An interface describing an accessory view in a `Grid.Item`.

![Grid.Item accessories illustration](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/grid-item-accessories.webp)

### Grid.Inset

An enum representing the amount of space there should be between a Grid Item's content and its borders. The absolute value depends on the value of [Grid](#grid)'s or [Grid.Section](#grid.section)'s `columns` prop.

#### Enumeration members

| Name   | Description   |
| ------ | ------------- |
| Small  | Small insets  |
| Medium | Medium insets |
| Large  | Large insets  |

### Grid.ItemSize (deprecated)

An enum representing the size of the Grid's child [Grid.Item](#grid.item)s.

#### Enumeration members

| Name   | Description           |
| ------ | --------------------- |
| Small  | Fits 8 items per row. |
| Medium | Fits 5 items per row. |
| Large  | Fits 3 items per row. |

### Grid.Fit

An enum representing how [Grid.Item](#grid.item)'s content should be fit.

#### Enumeration members

| Name    | Description                                                                                                                     |
| ------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Contain | The content will be contained within the grid cell, with vertical/horizontal bars if its aspect ratio differs from the cell's.  |
| Fill    | The content will be scaled proportionally so that it fill the entire cell; parts of the content could end up being cropped out. |


# Icons & Images

## API Reference

### Icon

List of built-in icons that can be used for actions or list items.

#### Example

```typescript
import { Icon, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item title="Icon" icon={Icon.Circle} />
    </List>
  );
}
```

#### Enumeration members

| <p><picture><source srcset="../../.gitbook/assets/icon-add-person-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-add-person-16@light.svg" alt=""></picture><br>AddPerson</p> | <p><picture><source srcset="../../.gitbook/assets/icon-airplane-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-airplane-16@light.svg" alt=""></picture><br>Airplane</p> | <p><picture><source srcset="../../.gitbook/assets/icon-airplane-filled-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-airplane-filled-16@light.svg" alt=""></picture><br>AirplaneFilled</p> |
| :---: | :---: | :---: |
| <p><picture><source srcset="../../.gitbook/assets/icon-airplane-landing-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-airplane-landing-16@light.svg" alt=""></picture><br>AirplaneLanding</p> | <p><picture><source srcset="../../.gitbook/assets/icon-airplane-takeoff-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-airplane-takeoff-16@light.svg" alt=""></picture><br>AirplaneTakeoff</p> | <p><picture><source srcset="../../.gitbook/assets/icon-airpods-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-airpods-16@light.svg" alt=""></picture><br>Airpods</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-alarm-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-alarm-16@light.svg" alt=""></picture><br>Alarm</p> | <p><picture><source srcset="../../.gitbook/assets/icon-alarm-ringing-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-alarm-ringing-16@light.svg" alt=""></picture><br>AlarmRinging</p> | <p><picture><source srcset="../../.gitbook/assets/icon-align-centre-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-align-centre-16@light.svg" alt=""></picture><br>AlignCentre</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-align-left-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-align-left-16@light.svg" alt=""></picture><br>AlignLeft</p> | <p><picture><source srcset="../../.gitbook/assets/icon-align-right-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-align-right-16@light.svg" alt=""></picture><br>AlignRight</p> | <p><picture><source srcset="../../.gitbook/assets/icon-american-football-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-american-football-16@light.svg" alt=""></picture><br>AmericanFootball</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-anchor-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-anchor-16@light.svg" alt=""></picture><br>Anchor</p> | <p><picture><source srcset="../../.gitbook/assets/icon-app-window-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-app-window-16@light.svg" alt=""></picture><br>AppWindow</p> | <p><picture><source srcset="../../.gitbook/assets/icon-app-window-grid-2x2-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-app-window-grid-2x2-16@light.svg" alt=""></picture><br>AppWindowGrid2x2</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-app-window-grid-3x3-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-app-window-grid-3x3-16@light.svg" alt=""></picture><br>AppWindowGrid3x3</p> | <p><picture><source srcset="../../.gitbook/assets/icon-app-window-list-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-app-window-list-16@light.svg" alt=""></picture><br>AppWindowList</p> | <p><picture><source srcset="../../.gitbook/assets/icon-app-window-sidebar-left-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-app-window-sidebar-left-16@light.svg" alt=""></picture><br>AppWindowSidebarLeft</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-app-window-sidebar-right-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-app-window-sidebar-right-16@light.svg" alt=""></picture><br>AppWindowSidebarRight</p> | <p><picture><source srcset="../../.gitbook/assets/icon-arrow-clockwise-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-arrow-clockwise-16@light.svg" alt=""></picture><br>ArrowClockwise</p> | <p><picture><source srcset="../../.gitbook/assets/icon-arrow-counter-clockwise-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-arrow-counter-clockwise-16@light.svg" alt=""></picture><br>ArrowCounterClockwise</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-arrow-down-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-arrow-down-16@light.svg" alt=""></picture><br>ArrowDown</p> | <p><picture><source srcset="../../.gitbook/assets/icon-arrow-down-circle-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-arrow-down-circle-16@light.svg" alt=""></picture><br>ArrowDownCircle</p> | <p><picture><source srcset="../../.gitbook/assets/icon-arrow-down-circle-filled-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-arrow-down-circle-filled-16@light.svg" alt=""></picture><br>ArrowDownCircleFilled</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-arrow-left-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-arrow-left-16@light.svg" alt=""></picture><br>ArrowLeft</p> | <p><picture><source srcset="../../.gitbook/assets/icon-arrow-left-circle-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-arrow-left-circle-16@light.svg" alt=""></picture><br>ArrowLeftCircle</p> | <p><picture><source srcset="../../.gitbook/assets/icon-arrow-left-circle-filled-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-arrow-left-circle-filled-16@light.svg" alt=""></picture><br>ArrowLeftCircleFilled</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-arrow-ne-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-arrow-ne-16@light.svg" alt=""></picture><br>ArrowNe</p> | <p><picture><source srcset="../../.gitbook/assets/icon-arrow-right-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-arrow-right-16@light.svg" alt=""></picture><br>ArrowRight</p> | <p><picture><source srcset="../../.gitbook/assets/icon-arrow-right-circle-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-arrow-right-circle-16@light.svg" alt=""></picture><br>ArrowRightCircle</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-arrow-right-circle-filled-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-arrow-right-circle-filled-16@light.svg" alt=""></picture><br>ArrowRightCircleFilled</p> | <p><picture><source srcset="../../.gitbook/assets/icon-arrow-up-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-arrow-up-16@light.svg" alt=""></picture><br>ArrowUp</p> | <p><picture><source srcset="../../.gitbook/assets/icon-arrow-up-circle-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-arrow-up-circle-16@light.svg" alt=""></picture><br>ArrowUpCircle</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-arrow-up-circle-filled-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-arrow-up-circle-filled-16@light.svg" alt=""></picture><br>ArrowUpCircleFilled</p> | <p><picture><source srcset="../../.gitbook/assets/icon-arrows-contract-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-arrows-contract-16@light.svg" alt=""></picture><br>ArrowsContract</p> | <p><picture><source srcset="../../.gitbook/assets/icon-arrows-expand-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-arrows-expand-16@light.svg" alt=""></picture><br>ArrowsExpand</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-at-symbol-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-at-symbol-16@light.svg" alt=""></picture><br>AtSymbol</p> | <p><picture><source srcset="../../.gitbook/assets/icon-band-aid-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-band-aid-16@light.svg" alt=""></picture><br>BandAid</p> | <p><picture><source srcset="../../.gitbook/assets/icon-bank-note-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-bank-note-16@light.svg" alt=""></picture><br>BankNote</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-bar-chart-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-bar-chart-16@light.svg" alt=""></picture><br>BarChart</p> | <p><picture><source srcset="../../.gitbook/assets/icon-bar-code-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-bar-code-16@light.svg" alt=""></picture><br>BarCode</p> | <p><picture><source srcset="../../.gitbook/assets/icon-bath-tub-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-bath-tub-16@light.svg" alt=""></picture><br>BathTub</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-battery-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-battery-16@light.svg" alt=""></picture><br>Battery</p> | <p><picture><source srcset="../../.gitbook/assets/icon-battery-charging-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-battery-charging-16@light.svg" alt=""></picture><br>BatteryCharging</p> | <p><picture><source srcset="../../.gitbook/assets/icon-battery-disabled-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-battery-disabled-16@light.svg" alt=""></picture><br>BatteryDisabled</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-bell-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-bell-16@light.svg" alt=""></picture><br>Bell</p> | <p><picture><source srcset="../../.gitbook/assets/icon-bell-disabled-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-bell-disabled-16@light.svg" alt=""></picture><br>BellDisabled</p> | <p><picture><source srcset="../../.gitbook/assets/icon-bike-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-bike-16@light.svg" alt=""></picture><br>Bike</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-binoculars-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-binoculars-16@light.svg" alt=""></picture><br>Binoculars</p> | <p><picture><source srcset="../../.gitbook/assets/icon-bird-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-bird-16@light.svg" alt=""></picture><br>Bird</p> | <p><picture><source srcset="../../.gitbook/assets/icon-blank-document-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-blank-document-16@light.svg" alt=""></picture><br>BlankDocument</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-bluetooth-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-bluetooth-16@light.svg" alt=""></picture><br>Bluetooth</p> | <p><picture><source srcset="../../.gitbook/assets/icon-boat-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-boat-16@light.svg" alt=""></picture><br>Boat</p> | <p><picture><source srcset="../../.gitbook/assets/icon-bold-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-bold-16@light.svg" alt=""></picture><br>Bold</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-bolt-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-bolt-16@light.svg" alt=""></picture><br>Bolt</p> | <p><picture><source srcset="../../.gitbook/assets/icon-bolt-disabled-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-bolt-disabled-16@light.svg" alt=""></picture><br>BoltDisabled</p> | <p><picture><source srcset="../../.gitbook/assets/icon-book-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-book-16@light.svg" alt=""></picture><br>Book</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-bookmark-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-bookmark-16@light.svg" alt=""></picture><br>Bookmark</p> | <p><picture><source srcset="../../.gitbook/assets/icon-box-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-box-16@light.svg" alt=""></picture><br>Box</p> | <p><picture><source srcset="../../.gitbook/assets/icon-brush-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-brush-16@light.svg" alt=""></picture><br>Brush</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-speech-bubble-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-speech-bubble-16@light.svg" alt=""></picture><br>Bubble</p> | <p><picture><source srcset="../../.gitbook/assets/icon-bug-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-bug-16@light.svg" alt=""></picture><br>Bug</p> | <p><picture><source srcset="../../.gitbook/assets/icon-building-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-building-16@light.svg" alt=""></picture><br>Building</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-bullet-points-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-bullet-points-16@light.svg" alt=""></picture><br>BulletPoints</p> | <p><picture><source srcset="../../.gitbook/assets/icon-bulls-eye-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-bulls-eye-16@light.svg" alt=""></picture><br>BullsEye</p> | <p><picture><source srcset="../../.gitbook/assets/icon-bulls-eye-missed-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-bulls-eye-missed-16@light.svg" alt=""></picture><br>BullsEyeMissed</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-buoy-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-buoy-16@light.svg" alt=""></picture><br>Buoy</p> | <p><picture><source srcset="../../.gitbook/assets/icon-calculator-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-calculator-16@light.svg" alt=""></picture><br>Calculator</p> | <p><picture><source srcset="../../.gitbook/assets/icon-calendar-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-calendar-16@light.svg" alt=""></picture><br>Calendar</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-camera-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-camera-16@light.svg" alt=""></picture><br>Camera</p> | <p><picture><source srcset="../../.gitbook/assets/icon-car-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-car-16@light.svg" alt=""></picture><br>Car</p> | <p><picture><source srcset="../../.gitbook/assets/icon-cart-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-cart-16@light.svg" alt=""></picture><br>Cart</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-cd-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-cd-16@light.svg" alt=""></picture><br>Cd</p> | <p><picture><source srcset="../../.gitbook/assets/icon-center-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-center-16@light.svg" alt=""></picture><br>Center</p> | <p><picture><source srcset="../../.gitbook/assets/icon-check-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-check-16@light.svg" alt=""></picture><br>Check</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-check-circle-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-check-circle-16@light.svg" alt=""></picture><br>CheckCircle</p> | <p><picture><source srcset="../../.gitbook/assets/icon-check-list-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-check-list-16@light.svg" alt=""></picture><br>CheckList</p> | <p><picture><source srcset="../../.gitbook/assets/icon-check-rosette-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-check-rosette-16@light.svg" alt=""></picture><br>CheckRosette</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-checkmark-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-checkmark-16@light.svg" alt=""></picture><br>Checkmark</p> | <p><picture><source srcset="../../.gitbook/assets/icon-chess-piece-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-chess-piece-16@light.svg" alt=""></picture><br>ChessPiece</p> | <p><picture><source srcset="../../.gitbook/assets/icon-chevron-down-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-chevron-down-16@light.svg" alt=""></picture><br>ChevronDown</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-chevron-down-small-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-chevron-down-small-16@light.svg" alt=""></picture><br>ChevronDownSmall</p> | <p><picture><source srcset="../../.gitbook/assets/icon-chevron-left-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-chevron-left-16@light.svg" alt=""></picture><br>ChevronLeft</p> | <p><picture><source srcset="../../.gitbook/assets/icon-chevron-left-small-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-chevron-left-small-16@light.svg" alt=""></picture><br>ChevronLeftSmall</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-chevron-right-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-chevron-right-16@light.svg" alt=""></picture><br>ChevronRight</p> | <p><picture><source srcset="../../.gitbook/assets/icon-chevron-right-small-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-chevron-right-small-16@light.svg" alt=""></picture><br>ChevronRightSmall</p> | <p><picture><source srcset="../../.gitbook/assets/icon-chevron-up-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-chevron-up-16@light.svg" alt=""></picture><br>ChevronUp</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-chevron-up-down-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-chevron-up-down-16@light.svg" alt=""></picture><br>ChevronUpDown</p> | <p><picture><source srcset="../../.gitbook/assets/icon-chevron-up-small-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-chevron-up-small-16@light.svg" alt=""></picture><br>ChevronUpSmall</p> | <p><picture><source srcset="../../.gitbook/assets/icon-circle-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-circle-16@light.svg" alt=""></picture><br>Circle</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-circle-disabled-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-circle-disabled-16@light.svg" alt=""></picture><br>CircleDisabled</p> | <p><picture><source srcset="../../.gitbook/assets/icon-circle-ellipsis-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-circle-ellipsis-16@light.svg" alt=""></picture><br>CircleEllipsis</p> | <p><picture><source srcset="../../.gitbook/assets/icon-circle-filled-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-circle-filled-16@light.svg" alt=""></picture><br>CircleFilled</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-circle-progress-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-circle-progress-16@light.svg" alt=""></picture><br>CircleProgress</p> | <p><picture><source srcset="../../.gitbook/assets/icon-circle-progress-100-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-circle-progress-100-16@light.svg" alt=""></picture><br>CircleProgress100</p> | <p><picture><source srcset="../../.gitbook/assets/icon-circle-progress-25-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-circle-progress-25-16@light.svg" alt=""></picture><br>CircleProgress25</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-circle-progress-50-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-circle-progress-50-16@light.svg" alt=""></picture><br>CircleProgress50</p> | <p><picture><source srcset="../../.gitbook/assets/icon-circle-progress-75-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-circle-progress-75-16@light.svg" alt=""></picture><br>CircleProgress75</p> | <p><picture><source srcset="../../.gitbook/assets/icon-clear-formatting-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-clear-formatting-16@light.svg" alt=""></picture><br>ClearFormatting</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-copy-clipboard-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-copy-clipboard-16@light.svg" alt=""></picture><br>Clipboard</p> | <p><picture><source srcset="../../.gitbook/assets/icon-clock-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-clock-16@light.svg" alt=""></picture><br>Clock</p> | <p><picture><source srcset="../../.gitbook/assets/icon-cloud-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-cloud-16@light.svg" alt=""></picture><br>Cloud</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-cloud-lightning-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-cloud-lightning-16@light.svg" alt=""></picture><br>CloudLightning</p> | <p><picture><source srcset="../../.gitbook/assets/icon-cloud-rain-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-cloud-rain-16@light.svg" alt=""></picture><br>CloudRain</p> | <p><picture><source srcset="../../.gitbook/assets/icon-cloud-snow-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-cloud-snow-16@light.svg" alt=""></picture><br>CloudSnow</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-cloud-sun-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-cloud-sun-16@light.svg" alt=""></picture><br>CloudSun</p> | <p><picture><source srcset="../../.gitbook/assets/icon-code-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-code-16@light.svg" alt=""></picture><br>Code</p> | <p><picture><source srcset="../../.gitbook/assets/icon-code-block-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-code-block-16@light.svg" alt=""></picture><br>CodeBlock</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-cog-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-cog-16@light.svg" alt=""></picture><br>Cog</p> | <p><picture><source srcset="../../.gitbook/assets/icon-coin-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-coin-16@light.svg" alt=""></picture><br>Coin</p> | <p><picture><source srcset="../../.gitbook/assets/icon-coins-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-coins-16@light.svg" alt=""></picture><br>Coins</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-command-symbol-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-command-symbol-16@light.svg" alt=""></picture><br>CommandSymbol</p> | <p><picture><source srcset="../../.gitbook/assets/icon-compass-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-compass-16@light.svg" alt=""></picture><br>Compass</p> | <p><picture><source srcset="../../.gitbook/assets/icon-computer-chip-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-computer-chip-16@light.svg" alt=""></picture><br>ComputerChip</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-contrast-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-contrast-16@light.svg" alt=""></picture><br>Contrast</p> | <p><picture><source srcset="../../.gitbook/assets/icon-copy-clipboard-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-copy-clipboard-16@light.svg" alt=""></picture><br>CopyClipboard</p> | <p><picture><source srcset="../../.gitbook/assets/icon-credit-card-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-credit-card-16@light.svg" alt=""></picture><br>CreditCard</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-cricket-ball-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-cricket-ball-16@light.svg" alt=""></picture><br>CricketBall</p> | <p><picture><source srcset="../../.gitbook/assets/icon-crop-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-crop-16@light.svg" alt=""></picture><br>Crop</p> | <p><picture><source srcset="../../.gitbook/assets/icon-crown-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-crown-16@light.svg" alt=""></picture><br>Crown</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-crypto-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-crypto-16@light.svg" alt=""></picture><br>Crypto</p> | <p><picture><source srcset="../../.gitbook/assets/icon-delete-document-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-delete-document-16@light.svg" alt=""></picture><br>DeleteDocument</p> | <p><picture><source srcset="../../.gitbook/assets/icon-desktop-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-desktop-16@light.svg" alt=""></picture><br>Desktop</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-devices-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-devices-16@light.svg" alt=""></picture><br>Devices</p> | <p><picture><source srcset="../../.gitbook/assets/icon-dna-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-dna-16@light.svg" alt=""></picture><br>Dna</p> | <p><picture><source srcset="../../.gitbook/assets/icon-blank-document-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-blank-document-16@light.svg" alt=""></picture><br>Document</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-dot-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-dot-16@light.svg" alt=""></picture><br>Dot</p> | <p><picture><source srcset="../../.gitbook/assets/icon-download-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-download-16@light.svg" alt=""></picture><br>Download</p> | <p><picture><source srcset="../../.gitbook/assets/icon-droplets-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-droplets-16@light.svg" alt=""></picture><br>Droplets</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-duplicate-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-duplicate-16@light.svg" alt=""></picture><br>Duplicate</p> | <p><picture><source srcset="../../.gitbook/assets/icon-edit-shape-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-edit-shape-16@light.svg" alt=""></picture><br>EditShape</p> | <p><picture><source srcset="../../.gitbook/assets/icon-eject-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-eject-16@light.svg" alt=""></picture><br>Eject</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-ellipsis-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-ellipsis-16@light.svg" alt=""></picture><br>Ellipsis</p> | <p><picture><source srcset="../../.gitbook/assets/icon-emoji-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-emoji-16@light.svg" alt=""></picture><br>Emoji</p> | <p><picture><source srcset="../../.gitbook/assets/icon-emoji-sad-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-emoji-sad-16@light.svg" alt=""></picture><br>EmojiSad</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-envelope-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-envelope-16@light.svg" alt=""></picture><br>Envelope</p> | <p><picture><source srcset="../../.gitbook/assets/icon-eraser-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-eraser-16@light.svg" alt=""></picture><br>Eraser</p> | <p><picture><source srcset="../../.gitbook/assets/icon-important-01-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-important-01-16@light.svg" alt=""></picture><br>ExclamationMark</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-exclamationmark-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-exclamationmark-16@light.svg" alt=""></picture><br>Exclamationmark</p> | <p><picture><source srcset="../../.gitbook/assets/icon-exclamationmark-2-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-exclamationmark-2-16@light.svg" alt=""></picture><br>Exclamationmark2</p> | <p><picture><source srcset="../../.gitbook/assets/icon-exclamationmark-3-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-exclamationmark-3-16@light.svg" alt=""></picture><br>Exclamationmark3</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-eye-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-eye-16@light.svg" alt=""></picture><br>Eye</p> | <p><picture><source srcset="../../.gitbook/assets/icon-eye-disabled-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-eye-disabled-16@light.svg" alt=""></picture><br>EyeDisabled</p> | <p><picture><source srcset="../../.gitbook/assets/icon-eye-dropper-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-eye-dropper-16@light.svg" alt=""></picture><br>EyeDropper</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-female-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-female-16@light.svg" alt=""></picture><br>Female</p> | <p><picture><source srcset="../../.gitbook/assets/icon-film-strip-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-film-strip-16@light.svg" alt=""></picture><br>FilmStrip</p> | <p><picture><source srcset="../../.gitbook/assets/icon-filter-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-filter-16@light.svg" alt=""></picture><br>Filter</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-finder-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-finder-16@light.svg" alt=""></picture><br>Finder</p> | <p><picture><source srcset="../../.gitbook/assets/icon-fingerprint-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-fingerprint-16@light.svg" alt=""></picture><br>Fingerprint</p> | <p><picture><source srcset="../../.gitbook/assets/icon-flag-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-flag-16@light.svg" alt=""></picture><br>Flag</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-folder-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-folder-16@light.svg" alt=""></picture><br>Folder</p> | <p><picture><source srcset="../../.gitbook/assets/icon-footprints-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-footprints-16@light.svg" alt=""></picture><br>Footprints</p> | <p><picture><source srcset="../../.gitbook/assets/icon-forward-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-forward-16@light.svg" alt=""></picture><br>Forward</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-forward-filled-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-forward-filled-16@light.svg" alt=""></picture><br>ForwardFilled</p> | <p><picture><source srcset="../../.gitbook/assets/icon-fountain-tip-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-fountain-tip-16@light.svg" alt=""></picture><br>FountainTip</p> | <p><picture><source srcset="../../.gitbook/assets/icon-full-signal-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-full-signal-16@light.svg" alt=""></picture><br>FullSignal</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-game-controller-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-game-controller-16@light.svg" alt=""></picture><br>GameController</p> | <p><picture><source srcset="../../.gitbook/assets/icon-gauge-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-gauge-16@light.svg" alt=""></picture><br>Gauge</p> | <p><picture><source srcset="../../.gitbook/assets/icon-cog-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-cog-16@light.svg" alt=""></picture><br>Gear</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-geopin-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-geopin-16@light.svg" alt=""></picture><br>Geopin</p> | <p><picture><source srcset="../../.gitbook/assets/icon-germ-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-germ-16@light.svg" alt=""></picture><br>Germ</p> | <p><picture><source srcset="../../.gitbook/assets/icon-gift-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-gift-16@light.svg" alt=""></picture><br>Gift</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-glasses-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-glasses-16@light.svg" alt=""></picture><br>Glasses</p> | <p><picture><source srcset="../../.gitbook/assets/icon-globe-01-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-globe-01-16@light.svg" alt=""></picture><br>Globe</p> | <p><picture><source srcset="../../.gitbook/assets/icon-goal-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-goal-16@light.svg" alt=""></picture><br>Goal</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-hammer-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-hammer-16@light.svg" alt=""></picture><br>Hammer</p> | <p><picture><source srcset="../../.gitbook/assets/icon-hard-drive-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-hard-drive-16@light.svg" alt=""></picture><br>HardDrive</p> | <p><picture><source srcset="../../.gitbook/assets/icon-hashtag-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-hashtag-16@light.svg" alt=""></picture><br>Hashtag</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-heading-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-heading-16@light.svg" alt=""></picture><br>Heading</p> | <p><picture><source srcset="../../.gitbook/assets/icon-headphones-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-headphones-16@light.svg" alt=""></picture><br>Headphones</p> | <p><picture><source srcset="../../.gitbook/assets/icon-heart-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-heart-16@light.svg" alt=""></picture><br>Heart</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-heart-disabled-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-heart-disabled-16@light.svg" alt=""></picture><br>HeartDisabled</p> | <p><picture><source srcset="../../.gitbook/assets/icon-heartbeat-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-heartbeat-16@light.svg" alt=""></picture><br>Heartbeat</p> | <p><picture><source srcset="../../.gitbook/assets/icon-highlight-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-highlight-16@light.svg" alt=""></picture><br>Highlight</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-hourglass-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-hourglass-16@light.svg" alt=""></picture><br>Hourglass</p> | <p><picture><source srcset="../../.gitbook/assets/icon-house-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-house-16@light.svg" alt=""></picture><br>House</p> | <p><picture><source srcset="../../.gitbook/assets/icon-humidity-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-humidity-16@light.svg" alt=""></picture><br>Humidity</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-image-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-image-16@light.svg" alt=""></picture><br>Image</p> | <p><picture><source srcset="../../.gitbook/assets/icon-important-01-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-important-01-16@light.svg" alt=""></picture><br>Important</p> | <p><picture><source srcset="../../.gitbook/assets/icon-info-01-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-info-01-16@light.svg" alt=""></picture><br>Info</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-italics-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-italics-16@light.svg" alt=""></picture><br>Italics</p> | <p><picture><source srcset="../../.gitbook/assets/icon-key-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-key-16@light.svg" alt=""></picture><br>Key</p> | <p><picture><source srcset="../../.gitbook/assets/icon-keyboard-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-keyboard-16@light.svg" alt=""></picture><br>Keyboard</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-layers-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-layers-16@light.svg" alt=""></picture><br>Layers</p> | <p><picture><source srcset="../../.gitbook/assets/icon-leaderboard-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-leaderboard-16@light.svg" alt=""></picture><br>Leaderboard</p> | <p><picture><source srcset="../../.gitbook/assets/icon-leaf-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-leaf-16@light.svg" alt=""></picture><br>Leaf</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-signal-2-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-signal-2-16@light.svg" alt=""></picture><br>LevelMeter</p> | <p><picture><source srcset="../../.gitbook/assets/icon-light-bulb-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-light-bulb-16@light.svg" alt=""></picture><br>LightBulb</p> | <p><picture><source srcset="../../.gitbook/assets/icon-light-bulb-off-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-light-bulb-off-16@light.svg" alt=""></picture><br>LightBulbOff</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-line-chart-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-line-chart-16@light.svg" alt=""></picture><br>LineChart</p> | <p><picture><source srcset="../../.gitbook/assets/icon-link-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-link-16@light.svg" alt=""></picture><br>Link</p> | <p><picture><source srcset="../../.gitbook/assets/icon-app-window-list-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-app-window-list-16@light.svg" alt=""></picture><br>List</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-livestream-01-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-livestream-01-16@light.svg" alt=""></picture><br>Livestream</p> | <p><picture><source srcset="../../.gitbook/assets/icon-livestream-disabled-01-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-livestream-disabled-01-16@light.svg" alt=""></picture><br>LivestreamDisabled</p> | <p><picture><source srcset="../../.gitbook/assets/icon-lock-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-lock-16@light.svg" alt=""></picture><br>Lock</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-lock-disabled-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-lock-disabled-16@light.svg" alt=""></picture><br>LockDisabled</p> | <p><picture><source srcset="../../.gitbook/assets/icon-lock-unlocked-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-lock-unlocked-16@light.svg" alt=""></picture><br>LockUnlocked</p> | <p><picture><source srcset="../../.gitbook/assets/icon-logout-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-logout-16@light.svg" alt=""></picture><br>Logout</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-lorry-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-lorry-16@light.svg" alt=""></picture><br>Lorry</p> | <p><picture><source srcset="../../.gitbook/assets/icon-lowercase-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-lowercase-16@light.svg" alt=""></picture><br>Lowercase</p> | <p><picture><source srcset="../../.gitbook/assets/icon-magnifying-glass-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-magnifying-glass-16@light.svg" alt=""></picture><br>MagnifyingGlass</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-male-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-male-16@light.svg" alt=""></picture><br>Male</p> | <p><picture><source srcset="../../.gitbook/assets/icon-map-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-map-16@light.svg" alt=""></picture><br>Map</p> | <p><picture><source srcset="../../.gitbook/assets/icon-mask-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-mask-16@light.svg" alt=""></picture><br>Mask</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-maximize-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-maximize-16@light.svg" alt=""></picture><br>Maximize</p> | <p><picture><source srcset="../../.gitbook/assets/icon-medical-support-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-medical-support-16@light.svg" alt=""></picture><br>MedicalSupport</p> | <p><picture><source srcset="../../.gitbook/assets/icon-megaphone-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-megaphone-16@light.svg" alt=""></picture><br>Megaphone</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-computer-chip-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-computer-chip-16@light.svg" alt=""></picture><br>MemoryChip</p> | <p><picture><source srcset="../../.gitbook/assets/icon-memory-stick-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-memory-stick-16@light.svg" alt=""></picture><br>MemoryStick</p> | <p><picture><source srcset="../../.gitbook/assets/icon-speech-bubble-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-speech-bubble-16@light.svg" alt=""></picture><br>Message</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-microphone-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-microphone-16@light.svg" alt=""></picture><br>Microphone</p> | <p><picture><source srcset="../../.gitbook/assets/icon-microphone-disabled-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-microphone-disabled-16@light.svg" alt=""></picture><br>MicrophoneDisabled</p> | <p><picture><source srcset="../../.gitbook/assets/icon-minimize-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-minimize-16@light.svg" alt=""></picture><br>Minimize</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-minus-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-minus-16@light.svg" alt=""></picture><br>Minus</p> | <p><picture><source srcset="../../.gitbook/assets/icon-minus-circle-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-minus-circle-16@light.svg" alt=""></picture><br>MinusCircle</p> | <p><picture><source srcset="../../.gitbook/assets/icon-minus-circle-filled-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-minus-circle-filled-16@light.svg" alt=""></picture><br>MinusCircleFilled</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-mobile-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-mobile-16@light.svg" alt=""></picture><br>Mobile</p> | <p><picture><source srcset="../../.gitbook/assets/icon-monitor-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-monitor-16@light.svg" alt=""></picture><br>Monitor</p> | <p><picture><source srcset="../../.gitbook/assets/icon-moon-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-moon-16@light.svg" alt=""></picture><br>Moon</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-moon-down-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-moon-down-16@light.svg" alt=""></picture><br>MoonDown</p> | <p><picture><source srcset="../../.gitbook/assets/icon-moon-up-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-moon-up-16@light.svg" alt=""></picture><br>MoonUp</p> | <p><picture><source srcset="../../.gitbook/assets/icon-moonrise-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-moonrise-16@light.svg" alt=""></picture><br>Moonrise</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-mountain-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-mountain-16@light.svg" alt=""></picture><br>Mountain</p> | <p><picture><source srcset="../../.gitbook/assets/icon-mouse-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-mouse-16@light.svg" alt=""></picture><br>Mouse</p> | <p><picture><source srcset="../../.gitbook/assets/icon-move-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-move-16@light.svg" alt=""></picture><br>Move</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-mug-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-mug-16@light.svg" alt=""></picture><br>Mug</p> | <p><picture><source srcset="../../.gitbook/assets/icon-mug-steam-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-mug-steam-16@light.svg" alt=""></picture><br>MugSteam</p> | <p><picture><source srcset="../../.gitbook/assets/icon-multiply-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-multiply-16@light.svg" alt=""></picture><br>Multiply</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-music-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-music-16@light.svg" alt=""></picture><br>Music</p> | <p><picture><source srcset="../../.gitbook/assets/icon-network-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-network-16@light.svg" alt=""></picture><br>Network</p> | <p><picture><source srcset="../../.gitbook/assets/icon-new-document-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-new-document-16@light.svg" alt=""></picture><br>NewDocument</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-new-folder-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-new-folder-16@light.svg" alt=""></picture><br>NewFolder</p> | <p><picture><source srcset="../../.gitbook/assets/icon-paperclip-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-paperclip-16@light.svg" alt=""></picture><br>Paperclip</p> | <p><picture><source srcset="../../.gitbook/assets/icon-paragraph-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-paragraph-16@light.svg" alt=""></picture><br>Paragraph</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-patch-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-patch-16@light.svg" alt=""></picture><br>Patch</p> | <p><picture><source srcset="../../.gitbook/assets/icon-pause-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-pause-16@light.svg" alt=""></picture><br>Pause</p> | <p><picture><source srcset="../../.gitbook/assets/icon-pause-filled-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-pause-filled-16@light.svg" alt=""></picture><br>PauseFilled</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-pencil-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-pencil-16@light.svg" alt=""></picture><br>Pencil</p> | <p><picture><source srcset="../../.gitbook/assets/icon-person-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-person-16@light.svg" alt=""></picture><br>Person</p> | <p><picture><source srcset="../../.gitbook/assets/icon-person-circle-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-person-circle-16@light.svg" alt=""></picture><br>PersonCircle</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-person-lines-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-person-lines-16@light.svg" alt=""></picture><br>PersonLines</p> | <p><picture><source srcset="../../.gitbook/assets/icon-phone-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-phone-16@light.svg" alt=""></picture><br>Phone</p> | <p><picture><source srcset="../../.gitbook/assets/icon-phone-ringing-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-phone-ringing-16@light.svg" alt=""></picture><br>PhoneRinging</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-pie-chart-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-pie-chart-16@light.svg" alt=""></picture><br>PieChart</p> | <p><picture><source srcset="../../.gitbook/assets/icon-pill-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-pill-16@light.svg" alt=""></picture><br>Pill</p> | <p><picture><source srcset="../../.gitbook/assets/icon-pin-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-pin-16@light.svg" alt=""></picture><br>Pin</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-pin-disabled-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-pin-disabled-16@light.svg" alt=""></picture><br>PinDisabled</p> | <p><picture><source srcset="../../.gitbook/assets/icon-play-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-play-16@light.svg" alt=""></picture><br>Play</p> | <p><picture><source srcset="../../.gitbook/assets/icon-play-filled-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-play-filled-16@light.svg" alt=""></picture><br>PlayFilled</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-plug-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-plug-16@light.svg" alt=""></picture><br>Plug</p> | <p><picture><source srcset="../../.gitbook/assets/icon-plus-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-plus-16@light.svg" alt=""></picture><br>Plus</p> | <p><picture><source srcset="../../.gitbook/assets/icon-plus-circle-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-plus-circle-16@light.svg" alt=""></picture><br>PlusCircle</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-plus-circle-filled-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-plus-circle-filled-16@light.svg" alt=""></picture><br>PlusCircleFilled</p> | <p><picture><source srcset="../../.gitbook/assets/icon-plus-minus-divide-multiply-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-plus-minus-divide-multiply-16@light.svg" alt=""></picture><br>PlusMinusDivideMultiply</p> | <p><picture><source srcset="../../.gitbook/assets/icon-plus-square-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-plus-square-16@light.svg" alt=""></picture><br>PlusSquare</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-plus-top-right-square-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-plus-top-right-square-16@light.svg" alt=""></picture><br>PlusTopRightSquare</p> | <p><picture><source srcset="../../.gitbook/assets/icon-power-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-power-16@light.svg" alt=""></picture><br>Power</p> | <p><picture><source srcset="../../.gitbook/assets/icon-print-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-print-16@light.svg" alt=""></picture><br>Print</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-question-mark-circle-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-question-mark-circle-16@light.svg" alt=""></picture><br>QuestionMark</p> | <p><picture><source srcset="../../.gitbook/assets/icon-question-mark-circle-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-question-mark-circle-16@light.svg" alt=""></picture><br>QuestionMarkCircle</p> | <p><picture><source srcset="../../.gitbook/assets/icon-quotation-marks-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-quotation-marks-16@light.svg" alt=""></picture><br>QuotationMarks</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-quote-block-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-quote-block-16@light.svg" alt=""></picture><br>QuoteBlock</p> | <p><picture><source srcset="../../.gitbook/assets/icon-racket-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-racket-16@light.svg" alt=""></picture><br>Racket</p> | <p><picture><source srcset="../../.gitbook/assets/icon-raindrop-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-raindrop-16@light.svg" alt=""></picture><br>Raindrop</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-raycast-logo-neg-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-raycast-logo-neg-16@light.svg" alt=""></picture><br>RaycastLogoNeg</p> | <p><picture><source srcset="../../.gitbook/assets/icon-raycast-logo-pos-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-raycast-logo-pos-16@light.svg" alt=""></picture><br>RaycastLogoPos</p> | <p><picture><source srcset="../../.gitbook/assets/icon-receipt-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-receipt-16@light.svg" alt=""></picture><br>Receipt</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-redo-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-redo-16@light.svg" alt=""></picture><br>Redo</p> | <p><picture><source srcset="../../.gitbook/assets/icon-remove-person-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-remove-person-16@light.svg" alt=""></picture><br>RemovePerson</p> | <p><picture><source srcset="../../.gitbook/assets/icon-repeat-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-repeat-16@light.svg" alt=""></picture><br>Repeat</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-reply-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-reply-16@light.svg" alt=""></picture><br>Reply</p> | <p><picture><source srcset="../../.gitbook/assets/icon-rewind-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-rewind-16@light.svg" alt=""></picture><br>Rewind</p> | <p><picture><source srcset="../../.gitbook/assets/icon-rewind-filled-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-rewind-filled-16@light.svg" alt=""></picture><br>RewindFilled</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-rocket-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-rocket-16@light.svg" alt=""></picture><br>Rocket</p> | <p><picture><source srcset="../../.gitbook/assets/icon-rosette-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-rosette-16@light.svg" alt=""></picture><br>Rosette</p> | <p><picture><source srcset="../../.gitbook/assets/icon-rotate-anti-clockwise-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-rotate-anti-clockwise-16@light.svg" alt=""></picture><br>RotateAntiClockwise</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-rotate-clockwise-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-rotate-clockwise-16@light.svg" alt=""></picture><br>RotateClockwise</p> | <p><picture><source srcset="../../.gitbook/assets/icon-rss-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-rss-16@light.svg" alt=""></picture><br>Rss</p> | <p><picture><source srcset="../../.gitbook/assets/icon-ruler-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-ruler-16@light.svg" alt=""></picture><br>Ruler</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-save-document-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-save-document-16@light.svg" alt=""></picture><br>SaveDocument</p> | <p><picture><source srcset="../../.gitbook/assets/icon-shield-01-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-shield-01-16@light.svg" alt=""></picture><br>Shield</p> | <p><picture><source srcset="../../.gitbook/assets/icon-short-paragraph-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-short-paragraph-16@light.svg" alt=""></picture><br>ShortParagraph</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-shuffle-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-shuffle-16@light.svg" alt=""></picture><br>Shuffle</p> | <p><picture><source srcset="../../.gitbook/assets/icon-app-window-sidebar-right-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-app-window-sidebar-right-16@light.svg" alt=""></picture><br>Sidebar</p> | <p><picture><source srcset="../../.gitbook/assets/icon-signal-0-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-signal-0-16@light.svg" alt=""></picture><br>Signal0</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-signal-1-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-signal-1-16@light.svg" alt=""></picture><br>Signal1</p> | <p><picture><source srcset="../../.gitbook/assets/icon-signal-2-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-signal-2-16@light.svg" alt=""></picture><br>Signal2</p> | <p><picture><source srcset="../../.gitbook/assets/icon-signal-3-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-signal-3-16@light.svg" alt=""></picture><br>Signal3</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-snippets-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-snippets-16@light.svg" alt=""></picture><br>Snippets</p> | <p><picture><source srcset="../../.gitbook/assets/icon-snowflake-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-snowflake-16@light.svg" alt=""></picture><br>Snowflake</p> | <p><picture><source srcset="../../.gitbook/assets/icon-soccer-ball-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-soccer-ball-16@light.svg" alt=""></picture><br>SoccerBall</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-speaker-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-speaker-16@light.svg" alt=""></picture><br>Speaker</p> | <p><picture><source srcset="../../.gitbook/assets/icon-speaker-down-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-speaker-down-16@light.svg" alt=""></picture><br>SpeakerDown</p> | <p><picture><source srcset="../../.gitbook/assets/icon-speaker-high-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-speaker-high-16@light.svg" alt=""></picture><br>SpeakerHigh</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-speaker-low-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-speaker-low-16@light.svg" alt=""></picture><br>SpeakerLow</p> | <p><picture><source srcset="../../.gitbook/assets/icon-speaker-off-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-speaker-off-16@light.svg" alt=""></picture><br>SpeakerOff</p> | <p><picture><source srcset="../../.gitbook/assets/icon-speaker-on-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-speaker-on-16@light.svg" alt=""></picture><br>SpeakerOn</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-speaker-up-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-speaker-up-16@light.svg" alt=""></picture><br>SpeakerUp</p> | <p><picture><source srcset="../../.gitbook/assets/icon-speech-bubble-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-speech-bubble-16@light.svg" alt=""></picture><br>SpeechBubble</p> | <p><picture><source srcset="../../.gitbook/assets/icon-speech-bubble-active-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-speech-bubble-active-16@light.svg" alt=""></picture><br>SpeechBubbleActive</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-speech-bubble-important-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-speech-bubble-important-16@light.svg" alt=""></picture><br>SpeechBubbleImportant</p> | <p><picture><source srcset="../../.gitbook/assets/icon-square-ellipsis-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-square-ellipsis-16@light.svg" alt=""></picture><br>SquareEllipsis</p> | <p><picture><source srcset="../../.gitbook/assets/icon-stacked-bars-1-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-stacked-bars-1-16@light.svg" alt=""></picture><br>StackedBars1</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-stacked-bars-2-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-stacked-bars-2-16@light.svg" alt=""></picture><br>StackedBars2</p> | <p><picture><source srcset="../../.gitbook/assets/icon-stacked-bars-3-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-stacked-bars-3-16@light.svg" alt=""></picture><br>StackedBars3</p> | <p><picture><source srcset="../../.gitbook/assets/icon-stacked-bars-4-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-stacked-bars-4-16@light.svg" alt=""></picture><br>StackedBars4</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-star-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-star-16@light.svg" alt=""></picture><br>Star</p> | <p><picture><source srcset="../../.gitbook/assets/icon-star-circle-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-star-circle-16@light.svg" alt=""></picture><br>StarCircle</p> | <p><picture><source srcset="../../.gitbook/assets/icon-star-disabled-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-star-disabled-16@light.svg" alt=""></picture><br>StarDisabled</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-stars-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-stars-16@light.svg" alt=""></picture><br>Stars</p> | <p><picture><source srcset="../../.gitbook/assets/icon-stop-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-stop-16@light.svg" alt=""></picture><br>Stop</p> | <p><picture><source srcset="../../.gitbook/assets/icon-stop-filled-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-stop-filled-16@light.svg" alt=""></picture><br>StopFilled</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-stopwatch-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-stopwatch-16@light.svg" alt=""></picture><br>Stopwatch</p> | <p><picture><source srcset="../../.gitbook/assets/icon-store-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-store-16@light.svg" alt=""></picture><br>Store</p> | <p><picture><source srcset="../../.gitbook/assets/icon-strike-through-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-strike-through-16@light.svg" alt=""></picture><br>StrikeThrough</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-sun-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-sun-16@light.svg" alt=""></picture><br>Sun</p> | <p><picture><source srcset="../../.gitbook/assets/icon-sunrise-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-sunrise-16@light.svg" alt=""></picture><br>Sunrise</p> | <p><picture><source srcset="../../.gitbook/assets/icon-swatch-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-swatch-16@light.svg" alt=""></picture><br>Swatch</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-switch-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-switch-16@light.svg" alt=""></picture><br>Switch</p> | <p><picture><source srcset="../../.gitbook/assets/icon-syringe-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-syringe-16@light.svg" alt=""></picture><br>Syringe</p> | <p><picture><source srcset="../../.gitbook/assets/icon-tack-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-tack-16@light.svg" alt=""></picture><br>Tack</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-tack-disabled-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-tack-disabled-16@light.svg" alt=""></picture><br>TackDisabled</p> | <p><picture><source srcset="../../.gitbook/assets/icon-tag-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-tag-16@light.svg" alt=""></picture><br>Tag</p> | <p><picture><source srcset="../../.gitbook/assets/icon-temperature-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-temperature-16@light.svg" alt=""></picture><br>Temperature</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-tennis-ball-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-tennis-ball-16@light.svg" alt=""></picture><br>TennisBall</p> | <p><picture><source srcset="../../.gitbook/assets/icon-terminal-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-terminal-16@light.svg" alt=""></picture><br>Terminal</p> | <p><picture><source srcset="../../.gitbook/assets/icon-text-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-text-16@light.svg" alt=""></picture><br>Text</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-text-cursor-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-text-cursor-16@light.svg" alt=""></picture><br>TextCursor</p> | <p><picture><source srcset="../../.gitbook/assets/icon-text-input-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-text-input-16@light.svg" alt=""></picture><br>TextInput</p> | <p><picture><source srcset="../../.gitbook/assets/icon-text-selection-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-text-selection-16@light.svg" alt=""></picture><br>TextSelection</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-thumbs-down-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-thumbs-down-16@light.svg" alt=""></picture><br>ThumbsDown</p> | <p><picture><source srcset="../../.gitbook/assets/icon-thumbs-down-filled-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-thumbs-down-filled-16@light.svg" alt=""></picture><br>ThumbsDownFilled</p> | <p><picture><source srcset="../../.gitbook/assets/icon-thumbs-up-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-thumbs-up-16@light.svg" alt=""></picture><br>ThumbsUp</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-thumbs-up-filled-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-thumbs-up-filled-16@light.svg" alt=""></picture><br>ThumbsUpFilled</p> | <p><picture><source srcset="../../.gitbook/assets/icon-ticket-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-ticket-16@light.svg" alt=""></picture><br>Ticket</p> | <p><picture><source srcset="../../.gitbook/assets/icon-torch-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-torch-16@light.svg" alt=""></picture><br>Torch</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-train-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-train-16@light.svg" alt=""></picture><br>Train</p> | <p><picture><source srcset="../../.gitbook/assets/icon-trash-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-trash-16@light.svg" alt=""></picture><br>Trash</p> | <p><picture><source srcset="../../.gitbook/assets/icon-tray-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-tray-16@light.svg" alt=""></picture><br>Tray</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-tree-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-tree-16@light.svg" alt=""></picture><br>Tree</p> | <p><picture><source srcset="../../.gitbook/assets/icon-trophy-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-trophy-16@light.svg" alt=""></picture><br>Trophy</p> | <p><picture><source srcset="../../.gitbook/assets/icon-two-people-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-two-people-16@light.svg" alt=""></picture><br>TwoPeople</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-umbrella-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-umbrella-16@light.svg" alt=""></picture><br>Umbrella</p> | <p><picture><source srcset="../../.gitbook/assets/icon-underline-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-underline-16@light.svg" alt=""></picture><br>Underline</p> | <p><picture><source srcset="../../.gitbook/assets/icon-undo-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-undo-16@light.svg" alt=""></picture><br>Undo</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-upload-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-upload-16@light.svg" alt=""></picture><br>Upload</p> | <p><picture><source srcset="../../.gitbook/assets/icon-uppercase-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-uppercase-16@light.svg" alt=""></picture><br>Uppercase</p> | <p><picture><source srcset="../../.gitbook/assets/icon-video-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-video-16@light.svg" alt=""></picture><br>Video</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-wallet-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-wallet-16@light.svg" alt=""></picture><br>Wallet</p> | <p><picture><source srcset="../../.gitbook/assets/icon-wand-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-wand-16@light.svg" alt=""></picture><br>Wand</p> | <p><picture><source srcset="../../.gitbook/assets/icon-warning-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-warning-16@light.svg" alt=""></picture><br>Warning</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-waveform-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-waveform-16@light.svg" alt=""></picture><br>Waveform</p> | <p><picture><source srcset="../../.gitbook/assets/icon-weights-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-weights-16@light.svg" alt=""></picture><br>Weights</p> | <p><picture><source srcset="../../.gitbook/assets/icon-wifi-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-wifi-16@light.svg" alt=""></picture><br>Wifi</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-wifi-disabled-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-wifi-disabled-16@light.svg" alt=""></picture><br>WifiDisabled</p> | <p><picture><source srcset="../../.gitbook/assets/icon-wind-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-wind-16@light.svg" alt=""></picture><br>Wind</p> | <p><picture><source srcset="../../.gitbook/assets/icon-app-window-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-app-window-16@light.svg" alt=""></picture><br>Window</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-windsock-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-windsock-16@light.svg" alt=""></picture><br>Windsock</p> | <p><picture><source srcset="../../.gitbook/assets/icon-wrench-screwdriver-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-wrench-screwdriver-16@light.svg" alt=""></picture><br>WrenchScrewdriver</p> | <p><picture><source srcset="../../.gitbook/assets/icon-wrist-watch-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-wrist-watch-16@light.svg" alt=""></picture><br>WristWatch</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-x-mark-circle-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-x-mark-circle-16@light.svg" alt=""></picture><br>XMarkCircle</p> | <p><picture><source srcset="../../.gitbook/assets/icon-x-mark-circle-filled-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-x-mark-circle-filled-16@light.svg" alt=""></picture><br>XMarkCircleFilled</p> | <p><picture><source srcset="../../.gitbook/assets/icon-x-mark-circle-half-dash-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-x-mark-circle-half-dash-16@light.svg" alt=""></picture><br>XMarkCircleHalfDash</p> |
| <p><picture><source srcset="../../.gitbook/assets/icon-x-mark-top-right-square-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/icon-x-mark-top-right-square-16@light.svg" alt=""></picture><br>XMarkTopRightSquare</p> | <p><picture><source srcset="../../.gitbook/assets/icon-xmark-16@dark.svg" media="(prefers-color-scheme: dark)"><img src="../../.gitbook/assets/icon-xmark-16@light.svg" alt=""></picture><br>Xmark</p> |

### Image.Mask

Available masks that can be used to change the shape of an image.

Can be handy to shape avatars or other items in a list.

#### Example

```typescript
import { Image, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        title="Icon"
        icon={{
          source: "https://raycast.com/uploads/avatar.png",
          mask: Image.Mask.Circle,
        }}
      />
    </List>
  );
}
```

#### Enumeration members

| Name             | Value              |
| :--------------- | :----------------- |
| Circle           | "circle"           |
| RoundedRectangle | "roundedRectangle" |

## Types

### Image

Display different types of images, including network images or bundled assets.

Apply image transforms to the source, such as a `mask` or a `tintColor`.

{% hint style="info" %}
Tip: Suffix your local assets with `@dark` to automatically provide a dark theme option, eg: `icon.png` and `icon@dark.png`.
{% endhint %}

#### Example

```typescript
// Built-in icon
const icon = Icon.Eye;

// Built-in icon with tint color
const tintedIcon = { source: Icon.Bubble, tintColor: Color.Red };

// Bundled asset with circular mask
const avatar = { source: "avatar.png", mask: Image.Mask.Circle };

// Implicit theme-aware icon
// with 'icon.png' and 'icon@dark.png' in the `assets` folder
const icon = "icon.png";

// Explicit theme-aware icon
const icon = { source: { light: "https://example.com/icon-light.png", dark: "https://example.com/icon-dark.png" } };
```

#### Properties

<InterfaceTableFromJSDoc name="Image" />

### FileIcon

An icon as it's used in the Finder.

#### Example

```typescript
import { List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item title="File icon" icon={{ fileIcon: __filename }} />
    </List>
  );
}
```

#### Properties

<InterfaceTableFromJSDoc name="FileIcon" />

### Image.ImageLike

```typescript
ImageLike: URL | Asset | Icon | FileIcon | Image;
```

Union type for the supported image types.

#### Example

```typescript
import { Icon, Image, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item title="URL" icon="https://raycast.com/uploads/avatar.png" />
      <List.Item title="Asset" icon="avatar.png" />
      <List.Item title="Icon" icon={Icon.Circle} />
      <List.Item title="FileIcon" icon={{ fileIcon: __filename }} />
      <List.Item
        title="Image"
        icon={{
          source: "https://raycast.com/uploads/avatar.png",
          mask: Image.Mask.Circle,
        }}
      />
    </List>
  );
}
```

### Image.Source

```typescript
Image.Source: URL | Asset | Icon | { light: URL | Asset; dark: URL | Asset }
```

The source of an [Image](#image). Can be either a remote URL, a local file resource, a built-in [Icon](#icon) or
a single emoji.

For consistency, it's best to use the built-in [Icon](#icon) in lists, the Action Panel, and other places. If a
specific icon isn't built-in, you can reference custom ones from the `assets` folder of the extension by file name,
e.g. `my-icon.png`. Alternatively, you can reference an absolute HTTPS URL that points to an image or use an emoji.
You can also specify different remote or local assets for light and dark theme.

#### Example

```typescript
import { Icon, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item title="URL" icon={{ source: "https://raycast.com/uploads/avatar.png" }} />
      <List.Item title="Asset" icon={{ source: "avatar.png" }} />
      <List.Item title="Icon" icon={{ source: Icon.Circle }} />
      <List.Item
        title="Theme"
        icon={{
          source: {
            light: "https://raycast.com/uploads/avatar.png",
            dark: "https://raycast.com/uploads/avatar.png",
          },
        }}
      />
    </List>
  );
}
```

### Image.Fallback

```typescript
Image.Fallback: Asset | Icon | { light: Asset; dark: Asset }
```

A fallback [Image](#image) that will be displayed in case the source image cannot be loaded. Can be either a local file resource, a built-in [Icon](#icon), a single emoji, or a theme-aware asset. Any specified `mask` or `tintColor` will also apply to the fallback image.

#### Example

```typescript
import { List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        title="URL Source With Asset Fallback"
        icon={{
          source: "https://raycast.com/uploads/avatar.png",
          fallback: "default-avatar.png",
        }}
      />
    </List>
  );
}
```

### Image.URL

Image is a string representing a URL.

#### Example

```typescript
import { List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item title="URL" icon={{ source: "https://raycast.com/uploads/avatar.png" }} />
    </List>
  );
}
```

### Image.Asset

Image is a string representing an asset from the `assets/` folder

#### Example

```typescript
import { List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item title="Asset" icon={{ source: "avatar.png" }} />
    </List>
  );
}
```


---
description: >-
  The de-facto user interface in Raycast. Ideal to present similar data such as
  to-dos or files.
---

# List

Our `List` component provides great user experience out of the box:

- Use built-in filtering for best performance.
- Group-related items in sections with titles and subtitles.
- Show loading indicator for longer operations.
- Use the search query for typeahead experiences, optionally throttled.

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/list.webp)

## Search Bar

The search bar allows users to interact quickly with list items. By default, [List.Items](#list.item) are displayed if the user's input can be (fuzzy) matched to the item's `title` or `keywords`.

### Custom filtering

Sometimes, you may not want to rely on Raycast's filtering, but use/implement your own. If that's the case, you can set the `List`'s `filtering` [prop](#props) to false, and the items displayed will be independent of the search bar's text.
Note that `filtering` is also implicitly set to false if an `onSearchTextChange` listener is specified. If you want to specify a change listener and _still_ take advantage of Raycast's built-in filtering, you can explicitly set `filtering` to true.

```typescript
import { useEffect, useState } from "react";
import { Action, ActionPanel, List } from "@raycast/api";

const items = ["Augustiner Helles", "Camden Hells", "Leffe Blonde", "Sierra Nevada IPA"];

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filteredList, filterList] = useState(items);

  useEffect(() => {
    filterList(items.filter((item) => item.includes(searchText)));
  }, [searchText]);

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Beers"
      searchBarPlaceholder="Search your favorite beer"
    >
      {filteredList.map((item) => (
        <List.Item
          key={item}
          title={item}
          actions={
            <ActionPanel>
              <Action title="Select" onAction={() => console.log(`${item} selected`)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```

### Programmatically updating the search bar

Other times, you may want the content of the search bar to be updated by the extension, for example, you may store a list of the user's previous searches and, on the next visit, allow them to "continue" where they left off.

To do so, you can use the `searchText` [prop](#props).

```typescript
import { useEffect, useState } from "react";
import { Action, ActionPanel, List } from "@raycast/api";

const items = ["Augustiner Helles", "Camden Hells", "Leffe Blonde", "Sierra Nevada IPA"];

export default function Command() {
  const [searchText, setSearchText] = useState("");

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Beers"
      searchBarPlaceholder="Search your favorite beer"
    >
      {items.map((item) => (
        <List.Item
          key={item}
          title={item}
          actions={
            <ActionPanel>
              <Action title="Select" onAction={() => setSearchText(item)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```

### Dropdown

Some extensions may benefit from giving users a second filtering dimension. A todo extension may allow users to use different groups, a newspaper-reading extension may want to allow quickly switching categories, etc.

This is where the `searchBarAccessory` [prop](#props) is useful. Pass it a [List.Dropdown](#list.dropdown) component, and it will be displayed on the right-side of the search bar. Invoke it either by using the global shortcut `⌘` `P` or by clicking on it.

### Pagination

{% hint style="info" %}
Pagination requires version 1.69.0 or higher of the `@raycast/api` package.
{% endhint %}

`List`s have built-in support for pagination. To opt in to pagination, you need to pass it a `pagination` prop, which is an object providing 3 pieces of information:

- `onLoadMore` - will be called by Raycast when the user reaches the end of the list, either using the keyboard or the mouse. When it gets called, the extension is expected to perform an async operation which eventually can result in items being appended to the end of the list.
- `hasMore` - indicates to Raycast whether it _should_ call `onLoadMore` when the user reaches the end of the list.
- `pageSize` - indicates how many placeholder items Raycast should add to the end of the list when it calls `onLoadMore`. Once `onLoadMore` finishes executing, the placeholder items will be replaced by the newly-added list items.

Note that extensions have access to a limited amount of memory. As your extension paginates, its memory usage will increase. Paginating extensively could lead to the extension eventually running out of memory and crashing. To protect against the extension crashing due to memory exhaustion, Raycast monitors the extension's memory usage and employs heuristics to determine whether it's safe to paginate further. If it's deemed unsafe to continue paginating, `onLoadMore` will not be triggered when the user scrolls to the bottom, regardless of the `hasMore` value. Additionally, during development, a warning will be printed in the terminal.

For convenience, most of the [hooks](../../utils-reference/getting-started.md) that we provide have built-in pagination support. Here's an example of how to add pagination support to a simple command using [usePromise](../../utils-reference/react-hooks/usePromise.md), and one "from scratch".

{% tabs %}

{% tab title="ListWithUsePromisePagination.tsx" %}

```typescript
import { setTimeout } from "node:timers/promises";
import { useState } from "react";
import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { isLoading, data, pagination } = usePromise(
    (searchText: string) => async (options: { page: number }) => {
      await setTimeout(200);
      const newData = Array.from({ length: 25 }, (_v, index) => ({
        index,
        page: options.page,
        text: searchText,
      }));
      return { data: newData, hasMore: options.page < 10 };
    },
    [searchText]
  );

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} pagination={pagination}>
      {data?.map((item) => (
        <List.Item
          key={`${item.page} ${item.index} ${item.text}`}
          title={`Page ${item.page} Item ${item.index}`}
          subtitle={item.text}
        />
      ))}
    </List>
  );
}
```

{% endtab %}
{% tab title="ListWithPagination.tsx" %}

```typescript
import { setTimeout } from "node:timers/promises";
import { useCallback, useEffect, useRef, useState } from "react";
import { List } from "@raycast/api";

type State = {
  searchText: string;
  isLoading: boolean;
  hasMore: boolean;
  data: {
    index: number;
    page: number;
    text: string;
  }[];
  nextPage: number;
};
const pageSize = 20;
export default function Command() {
  const [state, setState] = useState<State>({ searchText: "", isLoading: true, hasMore: true, data: [], nextPage: 0 });
  const cancelRef = useRef<AbortController | null>(null);

  const loadNextPage = useCallback(async (searchText: string, nextPage: number, signal?: AbortSignal) => {
    setState((previous) => ({ ...previous, isLoading: true }));
    await setTimeout(500);
    const newData = Array.from({ length: pageSize }, (_v, index) => ({
      index,
      page: nextPage,
      text: searchText,
    }));
    if (signal?.aborted) {
      return;
    }
    setState((previous) => ({
      ...previous,
      data: [...previous.data, ...newData],
      isLoading: false,
      hasMore: nextPage < 10,
    }));
  }, []);

  const onLoadMore = useCallback(() => {
    setState((previous) => ({ ...previous, nextPage: previous.nextPage + 1 }));
  }, []);

  const onSearchTextChange = useCallback(
    (searchText: string) => {
      if (searchText === state.searchText) return;
      setState((previous) => ({
        ...previous,
        data: [],
        nextPage: 0,
        searchText,
      }));
    },
    [state.searchText]
  );

  useEffect(() => {
    cancelRef.current?.abort();
    cancelRef.current = new AbortController();
    loadNextPage(state.searchText, state.nextPage, cancelRef.current?.signal);
    return () => {
      cancelRef.current?.abort();
    };
  }, [loadNextPage, state.searchText, state.nextPage]);

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={onSearchTextChange}
      pagination={{ onLoadMore, hasMore: state.hasMore, pageSize }}
    >
      {state.data.map((item) => (
        <List.Item
          key={`${item.page} ${item.index} ${item.text}`}
          title={`Page ${item.page} Item ${item.index}`}
          subtitle={item.text}
        />
      ))}
    </List>
  );
}
```

{% endtab %}
{% endtabs %}

{% hint style="warning" %}
Pagination might not work properly if all list items are rendered and visible at once, as `onLoadMore` won't be triggered. This typically happens when an API returns 10 results by default, all fitting within the Raycast window. To fix this, try displaying more items, like 20.
{% endhint %}

## Examples

{% tabs %}
{% tab title="List.tsx" %}

```jsx
import { List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item title="Item 1" />
      <List.Item title="Item 2" subtitle="Optional subtitle" />
    </List>
  );
}
```

{% endtab %}

{% tab title="ListWithSections.tsx" %}

```jsx
import { List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Section title="Section 1">
        <List.Item title="Item 1" />
      </List.Section>
      <List.Section title="Section 2" subtitle="Optional subtitle">
        <List.Item title="Item 1" />
      </List.Section>
    </List>
  );
}
```

{% endtab %}

{% tab title="ListWithActions.tsx" %}

```jsx
import { ActionPanel, Action, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        title="Item 1"
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content="👋" />
          </ActionPanel>
        }
      />
    </List>
  );
}
```

{% endtab %}

{% tab title="ListWithDetail.tsx" %}

```jsx
import { useState } from "react";
import { Action, ActionPanel, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

interface Pokemon {
  name: string;
  height: number;
  weight: number;
  id: string;
  types: string[];
  abilities: Array<{ name: string; isMainSeries: boolean }>;
}

const pokemons: Pokemon[] = [
  {
    name: "bulbasaur",
    height: 7,
    weight: 69,
    id: "001",
    types: ["Grass", "Poison"],
    abilities: [
      { name: "Chlorophyll", isMainSeries: true },
      { name: "Overgrow", isMainSeries: true },
    ],
  },
  {
    name: "ivysaur",
    height: 10,
    weight: 130,
    id: "002",
    types: ["Grass", "Poison"],
    abilities: [
      { name: "Chlorophyll", isMainSeries: true },
      { name: "Overgrow", isMainSeries: true },
    ],
  },
];

export default function Command() {
  const [showingDetail, setShowingDetail] = useState(true);
  const { data, isLoading } = useCachedPromise(() => new Promise<Pokemon[]>((resolve) => resolve(pokemons)));

  return (
    <List isLoading={isLoading} isShowingDetail={showingDetail}>
      {data &&
        data.map((pokemon) => {
          const props: Partial<List.Item.Props> = showingDetail
            ? {
                detail: (
                  <List.Item.Detail
                    markdown={`![Illustration](https://assets.pokemon.com/assets/cms2/img/pokedex/full/${
                      pokemon.id
                    }.png)\n\n${pokemon.types.join(" ")}`}
                  />
                ),
              }
            : { accessories: [{ text: pokemon.types.join(" ") }] };
          return (
            <List.Item
              key={pokemon.id}
              title={pokemon.name}
              subtitle={`#${pokemon.id}`}
              {...props}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={`https://www.pokemon.com/us/pokedex/${pokemon.name}`} />
                  <Action title="Toggle Detail" onAction={() => setShowingDetail(!showingDetail)} />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}

```

{% endtab %}

{% tab title="ListWithEmptyView.tsx" %}

```typescript
import { useEffect, useState } from "react";
import { List } from "@raycast/api";

export default function CommandWithCustomEmptyView() {
  const [state, setState] = useState({ searchText: "", items: [] });

  useEffect(() => {
    // perform an API call that eventually populates `items`.
  }, [state.searchText]);

  return (
    <List onSearchTextChange={(newValue) => setState((previous) => ({ ...previous, searchText: newValue }))}>
      {state.searchText === "" && state.items.length === 0 ? (
        <List.EmptyView icon={{ source: "https://placekitten.com/500/500" }} title="Type something to get started" />
      ) : (
        state.items.map((item) => <List.Item key={item} title={item} />)
      )}
    </List>
  );
}
```

{% endtab %}

{% endtabs %}

## API Reference

### List

Displays [List.Section](#list.section) or [List.Item](#list.item).

The list uses built-in filtering by indexing the title of list items and additionally keywords.

#### Example

```typescript
import { List } from "@raycast/api";

export default function Command() {
  return (
    <List navigationTitle="Search Beers" searchBarPlaceholder="Search your favorite beer">
      <List.Item title="Augustiner Helles" />
      <List.Item title="Camden Hells" />
      <List.Item title="Leffe Blonde" />
      <List.Item title="Sierra Nevada IPA" />
    </List>
  );
}
```

#### Props

<PropsTableFromJSDoc component="List" />

### List.Dropdown

A dropdown menu that will be shown in the right-hand-side of the search bar.

#### Example

```typescript
import { List } from "@raycast/api";

type DrinkType = { id: string; name: string };

function DrinkDropdown(props: { drinkTypes: DrinkType[]; onDrinkTypeChange: (newValue: string) => void }) {
  const { drinkTypes, onDrinkTypeChange } = props;
  return (
    <List.Dropdown
      tooltip="Select Drink Type"
      storeValue={true}
      onChange={(newValue) => {
        onDrinkTypeChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Alcoholic Beverages">
        {drinkTypes.map((drinkType) => (
          <List.Dropdown.Item key={drinkType.id} title={drinkType.name} value={drinkType.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export default function Command() {
  const drinkTypes: DrinkType[] = [
    { id: "1", name: "Beer" },
    { id: "2", name: "Wine" },
  ];
  const onDrinkTypeChange = (newValue: string) => {
    console.log(newValue);
  };
  return (
    <List
      navigationTitle="Search Beers"
      searchBarPlaceholder="Search your favorite drink"
      searchBarAccessory={<DrinkDropdown drinkTypes={drinkTypes} onDrinkTypeChange={onDrinkTypeChange} />}
    >
      <List.Item title="Augustiner Helles" />
      <List.Item title="Camden Hells" />
      <List.Item title="Leffe Blonde" />
      <List.Item title="Sierra Nevada IPA" />
    </List>
  );
}
```

#### Props

<PropsTableFromJSDoc component="List.Dropdown" />

### List.Dropdown.Item

A dropdown item in a [List.Dropdown](#list.dropdown)

#### Example

```typescript
import { List } from "@raycast/api";

export default function Command() {
  return (
    <List
      searchBarAccessory={
        <List.Dropdown tooltip="Dropdown With Items">
          <List.Dropdown.Item title="One" value="one" />
          <List.Dropdown.Item title="Two" value="two" />
          <List.Dropdown.Item title="Three" value="three" />
        </List.Dropdown>
      }
    >
      <List.Item title="Item in the Main List" />
    </List>
  );
}
```

#### Props

<PropsTableFromJSDoc component="List.Dropdown.Item" />

### List.Dropdown.Section

Visually separated group of dropdown items.

Use sections to group related menu items together.

#### Example

```typescript
import { List } from "@raycast/api";

export default function Command() {
  return (
    <List
      searchBarAccessory={
        <List.Dropdown tooltip="Dropdown With Sections">
          <List.Dropdown.Section title="First Section">
            <List.Dropdown.Item title="One" value="one" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Second Section">
            <List.Dropdown.Item title="Two" value="two" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Item title="Item in the Main List" />
    </List>
  );
}
```

#### Props

<PropsTableFromJSDoc component="List.Dropdown.Section" />

### List.EmptyView

A view to display when there aren't any items available. Use to greet users with a friendly message if the
extension requires user input before it can show any list items e.g. when searching for a package, an article etc.

Raycast provides a default `EmptyView` that will be displayed if the List component either has no children,
or if it has children, but none of them match the query in the search bar. This too can be overridden by passing an
empty view alongside the other `List.Item`s.

Note that the `EmptyView` is _never_ displayed if the `List`'s `isLoading` property is true and the search bar is empty.

![List EmptyView illustration](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/list-empty-view.webp)

#### Example

```typescript
import { useEffect, useState } from "react";
import { List } from "@raycast/api";

export default function CommandWithCustomEmptyView() {
  const [state, setState] = useState({ searchText: "", items: [] });

  useEffect(() => {
    // perform an API call that eventually populates `items`.
  }, [state.searchText]);

  return (
    <List onSearchTextChange={(newValue) => setState((previous) => ({ ...previous, searchText: newValue }))}>
      {state.searchText === "" && state.items.length === 0 ? (
        <List.EmptyView icon={{ source: "https://placekitten.com/500/500" }} title="Type something to get started" />
      ) : (
        state.items.map((item) => <List.Item key={item} title={item} />)
      )}
    </List>
  );
}
```

#### Props

<PropsTableFromJSDoc component="List.EmptyView" />

### List.Item

A item in the [List](#list).

This is one of the foundational UI components of Raycast. A list item represents a single entity. It can be a
GitHub pull request, a file, or anything else. You most likely want to perform actions on this item, so make it clear
to the user what this list item is about.

#### Example

```typescript
import { Icon, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item icon={Icon.Star} title="Augustiner Helles" subtitle="0,5 Liter" accessories={[{ text: "Germany" }]} />
    </List>
  );
}
```

#### Props

<PropsTableFromJSDoc component="List.Item" />

### List.Item.Detail

A Detail view that will be shown in the right-hand-side of the `List`.

When shown, it is recommended not to show any accessories on the `List.Item` and instead bring those additional information in the `List.Item.Detail` view.

![List-detail illustration](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/list-detail.webp)

#### Example

```typescript
import { List } from "@raycast/api";

export default function Command() {
  return (
    <List isShowingDetail>
      <List.Item
        title="Pikachu"
        subtitle="Electric"
        detail={
          <List.Item.Detail markdown="![Illustration](https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png)" />
        }
      />
    </List>
  );
}
```

#### Props

<PropsTableFromJSDoc component="List.Item.Detail" />

### List.Item.Detail.Metadata

A Metadata view that will be shown in the bottom side of the `List.Item.Detail`.

Use it to display additional structured data about the content of the `List.Item`.

#### Example

{% tabs %}

{% tab title="Metadata + Markdown" %}

![List Detail-metadata illustration](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/list-detail-metadata-split.webp)

```typescript
import { List } from "@raycast/api";

export default function Metadata() {
  const markdown = `
![Illustration](https://assets.pokemon.com/assets/cms2/img/pokedex/full/001.png)
There is a plant seed on its back right from the day this Pokémon is born. The seed slowly grows larger.
`;
  return (
    <List isShowingDetail>
      <List.Item
        title="Bulbasaur"
        detail={
          <List.Item.Detail
            markdown={markdown}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Types" />
                <List.Item.Detail.Metadata.Label title="Grass" icon="pokemon_types/grass.svg" />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Poison" icon="pokemon_types/poison.svg" />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Chracteristics" />
                <List.Item.Detail.Metadata.Label title="Height" text="70cm" />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Weight" text="6.9 kg" />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Abilities" />
                <List.Item.Detail.Metadata.Label title="Chlorophyll" text="Main Series" />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Overgrow" text="Main Series" />
                <List.Item.Detail.Metadata.Separator />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    </List>
  );
}
```

{% endtab %}

{% tab title="Metadata Standalone" %}

![List Detail-metadata illustration](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/list-detail-metadata-standalone.webp)

```typescript
import { List } from "@raycast/api";

export default function Metadata() {
  return (
    <List isShowingDetail>
      <List.Item
        title="Bulbasaur"
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Types" />
                <List.Item.Detail.Metadata.Label title="Grass" icon="pokemon_types/grass.svg" />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Poison" icon="pokemon_types/poison.svg" />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Chracteristics" />
                <List.Item.Detail.Metadata.Label title="Height" text="70cm" />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Weight" text="6.9 kg" />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Abilities" />
                <List.Item.Detail.Metadata.Label title="Chlorophyll" text="Main Series" />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Overgrow" text="Main Series" />
                <List.Item.Detail.Metadata.Separator />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    </List>
  );
}
```

{% endtab %}

{% endtabs %}

#### Props

<PropsTableFromJSDoc component="List.Item.Detail.Metadata" />

### List.Item.Detail.Metadata.Label

A title with, optionally, an icon and/or text to its right.

![List Detail-metadata-label illustration](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/list-detail-metadata-label.webp)

#### Example

```typescript
import { List } from "@raycast/api";

export default function Metadata() {
  return (
    <List isShowingDetail>
      <List.Item
        title="Bulbasaur"
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Type" icon="pokemon_types/grass.svg" text="Grass" />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    </List>
  );
}
```

#### Props

<PropsTableFromJSDoc component="List.Item.Detail.Metadata.Label" />

### List.Item.Detail.Metadata.Link

An item to display a link.

![List Detail-metadata-link illustration](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/list-detail-metadata-link.webp)

#### Example

```typescript
import { List } from "@raycast/api";

export default function Metadata() {
  return (
    <List isShowingDetail>
      <List.Item
        title="Bulbasaur"
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Link
                  title="Evolution"
                  target="https://www.pokemon.com/us/pokedex/pikachu"
                  text="Raichu"
                />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    </List>
  );
}
```

#### Props

<PropsTableFromJSDoc component="List.Item.Detail.Metadata.Link" />

### List.Item.Detail.Metadata.TagList

A list of [`Tags`](list.md#list.item.detail.metadata.taglist.item) displayed in a row.

![List Detail-metadata-tag-list illustration](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/list-detail-metadata-tag-list.webp)

#### Example

```typescript
import { List } from "@raycast/api";

export default function Metadata() {
  return (
    <List isShowingDetail>
      <List.Item
        title="Bulbasaur"
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.TagList title="Type">
                  <List.Item.Detail.Metadata.TagList.Item text="Electric" color={"#eed535"} />
                </List.Item.Detail.Metadata.TagList>
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    </List>
  );
}
```

#### Props

<PropsTableFromJSDoc component="List.Item.Detail.Metadata.TagList" />

### List.Item.Detail.Metadata.TagList.Item

A Tag in a `List.Item.Detail.Metadata.TagList`.

#### Props

<PropsTableFromJSDoc component="List.Item.Detail.Metadata.TagList.Item" />

### List.Item.Detail.Metadata.Separator

A metadata item that shows a separator line. Use it for grouping and visually separating metadata items.

![List Detail-metadata-separator illustration](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/list-detail-metadata-separator.webp)

#### Example

```typescript
import { List } from "@raycast/api";

export default function Metadata() {
  return (
    <List isShowingDetail>
      <List.Item
        title="Bulbasaur"
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Type" icon="pokemon_types/grass.svg" text="Grass" />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Type" icon="pokemon_types/poison.svg" text="Poison" />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    </List>
  );
}
```

### List.Section

A group of related [List.Item](#list.item).

Sections are a great way to structure your list. For example, group GitHub issues with the same status and order them by priority.
This way, the user can quickly access what is most relevant.

#### Example

```typescript
import { List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Section title="Lager">
        <List.Item title="Camden Hells" />
      </List.Section>
      <List.Section title="IPA">
        <List.Item title="Sierra Nevada IPA" />
      </List.Section>
    </List>
  );
}
```

#### Props

<PropsTableFromJSDoc component="List.Section" />

## Types

### List.Item.Accessory

An interface describing an accessory view in a `List.Item`.

![List.Item accessories illustration](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/list-item-accessories.webp)

#### Properties

<InterfaceTableFromJSDoc name="List.Item.Accessory" />

#### Example

```typescript
import { Color, Icon, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        title="An Item with Accessories"
        accessories={[
          { text: `An Accessory Text`, icon: Icon.Hammer },
          { text: { value: `A Colored Accessory Text`, color: Color.Orange }, icon: Icon.Hammer },
          { icon: Icon.Person, tooltip: "A person" },
          { text: "Just Do It!" },
          { date: new Date() },
          { tag: new Date() },
          { tag: { value: new Date(), color: Color.Magenta } },
          { tag: { value: "User", color: Color.Magenta }, tooltip: "Tag with tooltip" },
        ]}
      />
    </List>
  );
}
```


# Navigation

## API Reference

### useNavigation

A hook that lets you push and pop view components in the navigation stack.

You most likely won't use this hook too often. To push a new component, use the [Push Action](./actions.md#action.push).
When a user presses `ESC`, we automatically pop to the previous component.

#### Signature

```typescript
function useNavigation(): Navigation;
```

#### Example

```typescript
import { Action, ActionPanel, Detail, useNavigation } from "@raycast/api";

function Ping() {
  const { push } = useNavigation();

  return (
    <Detail
      markdown="Ping"
      actions={
        <ActionPanel>
          <Action title="Push" onAction={() => push(<Pong />)} />
        </ActionPanel>
      }
    />
  );
}

function Pong() {
  const { pop } = useNavigation();

  return (
    <Detail
      markdown="Pong"
      actions={
        <ActionPanel>
          <Action title="Pop" onAction={pop} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  return <Ping />;
}
```

#### Return

A [Navigation](#navigation) object with [Navigation.push](#navigation) and [Navigation.pop](#navigation) functions.
Use the functions to alter the navigation stack.

## Types

### Navigation

Return type of the [useNavigation](#usenavigation) hook to perform push and pop actions.

#### Properties

<InterfaceTableFromJSDoc name="Navigation" />


# System Utilities

This set of utilities exposes some of Raycast's native functionality to allow deep integration into the user's setup. For example, you can use the Application APIs to check if a desktop application is installed and then provide an action to deep-link into it.

## API Reference

### getApplications

Returns all applications that can open the file or URL.

#### Signature

```typescript
async function getApplications(path?: PathLike): Promise<Application[]>;
```

#### Example

{% tabs %}
{% tab title="Find Application" %}

```typescript
import { getApplications, Application } from "@raycast/api";

// it is a lot more reliable to get an app by its bundle ID than its path
async function findApplication(bundleId: string): Application | undefined {
  const installedApplications = await getApplications();
  return installedApplications.filter((application) => application.bundleId == bundleId);
}
```

{% endtab %}

{% tab title="List Installed Applications" %}

```typescript
import { getApplications } from "@raycast/api";

export default async function Command() {
  const installedApplications = await getApplications();
  console.log("The following applications are installed on your Mac:");
  console.log(installedApplications.map((a) => a.name).join(", "));
}
```

{% endtab %}
{% endtabs %}

#### Parameters

<FunctionParametersTableFromJSDoc name="getApplications" />

#### Return

An array of [Application](#application).

### getDefaultApplication

Returns the default application that the file or URL would be opened with.

#### Signature

```typescript
async function getDefaultApplication(path: PathLike): Promise<Application>;
```

#### Example

```typescript
import { getDefaultApplication } from "@raycast/api";

export default async function Command() {
  const defaultApplication = await getDefaultApplication(__filename);
  console.log(`Default application for JavaScript is: ${defaultApplication.name}`);
}
```

#### Parameters

<FunctionParametersTableFromJSDoc name="getDefaultApplication" />

#### Return

A Promise that resolves with the default [Application](#application) that would open the file or URL. If no application was found, the promise will be rejected.

### getFrontmostApplication

Returns the frontmost application.

#### Signature

```typescript
async function getFrontmostApplication(): Promise<Application>;
```

#### Example

```typescript
import { getFrontmostApplication } from "@raycast/api";

export default async function Command() => {
  const frontmostApplication = await getFrontmostApplication();
  console.log(`The frontmost application is: ${frontmostApplication.name}`);
};
```

#### Return

A Promise that resolves with the frontmost [Application](#application). If no application was found, the promise will be rejected.

### showInFinder

Shows a file or directory in the Finder.

#### Signature

```typescript
async function showInFinder(path: PathLike): Promise<void>;
```

#### Example

```typescript
import { showInFinder } from "@raycast/api";
import { homedir } from "os";
import { join } from "path";

export default async function Command() {
  await showInFinder(join(homedir(), "Downloads"));
}
```

#### Parameters

<FunctionParametersTableFromJSDoc name="showInFinder" />

#### Return

A Promise that resolves when the item is revealed in the Finder.

### trash

Moves a file or directory to the Trash.

#### Signature

```typescript
async function trash(path: PathLike | PathLike[]): Promise<void>;
```

#### Example

```typescript
import { trash } from "@raycast/api";
import { writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

export default async function Command() {
  const file = join(homedir(), "Desktop", "yolo.txt");
  await writeFile(file, "I will be deleted soon!");
  await trash(file);
}
```

#### Parameters

<FunctionParametersTableFromJSDoc name="trash" />

#### Return

A Promise that resolves when all files are moved to the trash.

### open

Opens a target with the default application or specified application.

#### Signature

```typescript
async function open(target: string, application?: Application | string): Promise<void>;
```

#### Example

```typescript
import { open } from "@raycast/api";

export default async function Command() {
  await open("https://www.raycast.com", "com.google.Chrome");
}
```

#### Parameters

<FunctionParametersTableFromJSDoc name="open" />

#### Return

A Promise that resolves when the target has been opened.

### captureException

Report the provided exception to the Developer Hub.
This helps in handling failures gracefully while staying informed about the occurrence of the failure.

#### Signature

```typescript
function captureException(exception: unknown): void;
```

#### Example

```typescript
import { open, captureException, showToast, Toast } from "@raycast/api";

export default async function Command() {
  const url = "https://www.raycast.com";
  const app = "Google Chrome";
  try {
    await open(url, app);
  } catch (e: unknown) {
    captureException(e);
    await showToast({
      style: Toast.Style.Failure,
      title: `Could not open ${url} in ${app}.`,
    });
  }
}
```

#### Parameters

<FunctionParametersTableFromJSDoc name="open" />

## Types

### Application

An object that represents a locally installed application on the system.

It can be used to open files or folders in a specific application. Use [getApplications](#getapplications) or
[getDefaultApplication](#getdefaultapplication) to get applications that can open a specific file or folder.

#### Properties

<InterfaceTableFromJSDoc name="Application" />

### PathLike

```typescript
PathLike: string | Buffer | URL;
```

Supported path types.


# Raycast Window & Search Bar

## API Reference

### clearSearchBar

Clear the text in the search bar.

#### Signature

```typescript
async function clearSearchBar(options?: { forceScrollToTop?: boolean }): Promise<void>;
```

#### Parameters

<FunctionParametersTableFromJSDoc name="clearSearchBar" />

#### Return

A Promise that resolves when the search bar is cleared.

### closeMainWindow

Closes the main Raycast window.

#### Signature

```typescript
async function closeMainWindow(options?: { clearRootSearch?: boolean; popToRootType?: PopToRootType }): Promise<void>;
```

#### Example

```typescript
import { closeMainWindow } from "@raycast/api";
import { setTimeout } from "timers/promises";

export default async function Command() {
  await setTimeout(1000);
  await closeMainWindow({ clearRootSearch: true });
}
```

You can use the `popToRootType` parameter to temporarily prevent Raycast from applying the user's "Pop to Root Search" preference in Raycast; for example, when you need to interact with an external system utility and then allow the user to return back to the view command:

```typescript
import { closeMainWindow, PopToRootType } from "@raycast/api";

export default async () => {
  await closeMainWindow({ popToRootType: PopToRootType.Suspended });
};
```

#### Parameters

<FunctionParametersTableFromJSDoc name="closeMainWindow" />

#### Return

A Promise that resolves when the main window is closed.

### popToRoot

Pops the navigation stack back to root search.

#### Signature

```typescript
async function popToRoot(options?: { clearSearchBar?: boolean }): Promise<void>;
```

#### Example

```typescript
import { Detail, popToRoot } from "@raycast/api";
import { useEffect } from "react";
import { setTimeout } from "timers";

export default function Command() {
  useEffect(() => {
    setTimeout(() => {
      popToRoot({ clearSearchBar: true });
    }, 3000);
  }, []);

  return <Detail markdown="See you soon 👋" />;
}
```

#### Parameters

<FunctionParametersTableFromJSDoc name="popToRoot" />

#### Return

A Promise that resolves when Raycast popped to root.

## Types

### PopToRootType

Defines the pop to root behavior when the main window is closed.

#### Enumeration members

| Name      | Description                                                    |
| :-------- | :------------------------------------------------------------- |
| Default   | Respects the user's "Pop to Root Search" preference in Raycast |
| Immediate | Immediately pops back to root                                  |
| Suspended | Prevents Raycast from popping back to root                     |


# Window Management

The Window Management API provides developers with some functions to create commands with some advanced logic to move [Window](#windowmanagement.window)s around.

{% hint style="info" %}

Some users might not have access to this API. If a user doesn't have access to Raycast Pro, they will be asked if they want to get access when your extension calls the Window Management API. If the user doesn't wish to get access, the API call will throw an error.

You can check if a user has access to the API using [`environment.canAccess(WindowManagement)`](./environment.md).

{% endhint %}

## API Reference

### WindowManagement.getActiveWindow

Gets the active [Window](#windowmanagement.window).

#### Signature

```typescript
async function getActiveWindow(): Promise<Window>;
```

#### Example

```typescript
import { WindowManagement, showToast } from "@raycast/api";

export default async function Command() {
  try {
    const window = await WindowManagement.getActiveWindow();
    if (window.positionable) {
      WindowManagement.setWindowBounds({ id: window.id, bounds: { position: { x: 100 } } });
    }
  } catch (error) {
    showToast({ title: "Could not move window", message: error.message, style: Toast.Style.Failure });
  }
}
```

#### Return

A Promise that resolves with the active [Window](#windowmanagement.window). If no window is active, the promise will be rejected.

### WindowManagement.getWindowsOnActiveDesktop

Gets the list of [Window](#windowmanagement.window)s on the active [Desktop](#windowmanagement.desktop).

#### Signature

```typescript
async function getWindowsOnActiveDesktop(): Promise<Window[]>;
```

#### Example

```typescript
import { WindowManagement, showToast } from "@raycast/api";

export default async function Command() {
  const windows = await WindowManagement.getWindowsOnActiveDesktop();
  const chrome = windows.find((x) => x.application?.bundleId === "com.google.Chrome");
  if (!chrome) {
    showToast({ title: "Couldn't find chrome", style: Toast.Style.Failure });
    return;
  }
  WindowManagement.setWindowBounds({ id: chrome.id, bounds: { position: { x: 100 } } });
}
```

#### Return

A Promise that resolves with an array of Windows.

### WindowManagement.getDesktops

Gets the list of [Desktop](#windowmanagement.desktop)s available across all screens.

#### Signature

```typescript
async function getDesktops(): Promise<Desktop[]>;
```

#### Example

```typescript
import { WindowManagement, showToast } from "@raycast/api";

export default function Command() {
  const desktops = await WindowManagement.getDesktops();
  const screens = Set(desktops.map((desktop) => desktop.screenId));
  showToast({ title: `Found ${desktops.length} desktops on ${screens.size} screens.` });
}
```

#### Return

A Promise that resolves with the desktops.

### WindowManagement.setWindowBounds

Move a [Window](#windowmanagement.window) or make it fullscreen.

#### Signature

```typescript
async function setWindowBounds(
  options: { id: string } & (
    | {
        bounds: {
          position?: { x?: number; y?: number };
          size?: { width?: number; height?: number };
        };
        desktopId?: string;
      }
    | {
        bounds: "fullscreen";
      }
  )
): Promise<void>;
```

#### Example

```typescript
import { WindowManagement, showToast } from "@raycast/api";

export default async function Command() {
  try {
    const window = await WindowManagement.getActiveWindow();
    if (window.positionable) {
      WindowManagement.setWindowBounds({ id: window.id, bounds: { position: { x: 100 } } });
    }
  } catch (error) {
    showToast({ title: "Could not move window", message: error.message, style: Toast.Style.Failure });
  }
}
```

#### Parameters

<FunctionParametersTableFromJSDoc name="WindowManagement.setWindowBounds" />

#### Return

A Promise that resolves with the window was moved. If the move isn't possible (for example trying to make a window fullscreen that doesn't support it), the promise will be rejected.

## Types

### WindowManagement.Window

A Window from an [Application](./utilities.md#application) on a [Desktop](#windowmanagement.desktop).

#### Properties

<InterfaceTableFromJSDoc name="WindowManagement.Window" />

### WindowManagement.Desktop

A Desktop represents a virtual desktop on a Screen.

#### Properties

<InterfaceTableFromJSDoc name="WindowManagement.Desktop" />

### WindowManagement.DesktopType

The type of a [Desktop](#windowmanagement.desktop).

#### Enumeration members

| Name       | Description                                                                               |
| :--------- | :---------------------------------------------------------------------------------------- |
| User       | The default Desktop type. It can contain any number of [Window](#windowmanagement.window) |
| FullScreen | A Desktop made of a single fullscreen window                                              |


---
description: Learn how to import an extension to collaborate with others.
---

# Contribute to an Extension

All published extensions are open-source and can be found in [this repository](https://github.com/raycast/extensions). This makes it easy for multiple developers to collaborate. This guide explains how to import an extension in order to fix a bug, add a new feature or otherwise contribute to it.

## Get source code

First, you need to find the source code of the extension. The easiest way to do this is to use the `Fork Extension` action in the Raycast's root search.

![Fork an extension](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/fork-extension.webp)

## Develop the extension

After you have the source code locally, open the Terminal and navigate to the extension's folder. Once there, run `npm install && npm run dev` from the extension folder in your Terminal to start developing the extension.

![Open imported extension](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/basics-open-command.webp) ![Icon list command](../.gitbook/assets/basics-icon-list.webp)

You should see your forked extension at the top of your root search and can open its commands. When you're done editing the extension, make sure to add yourself to the contributors section of its [manifest](../information/manifest.md#extension-properties). Additionally, ensure the `CHANGELOG.md` file is updated with your changes; create it if it doesn't exist. Once everything is ready, [run](./publish-an-extension.md) `npx @raycast/api@latest publish`.


---
description: Learn how to build your first extension and use it in Raycast.
---

# Create Your First Extension

## Create a new extension

Open the Create Extension command, name your extension "Hello World" and select the "Detail" template. Pick a parent folder in the Location field and press `⌘` `↵` to continue.

![Create Extension command in Raycast](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/hello-world.webp)

{% hint style="info" %}
To create a private extension, select your organization in the first dropdown. You need to be logged in and part of an organization to see the dropdown. Learn more about Raycast for Teams [here](../teams/getting-started.md).
{% endhint %}

Next, you'll need to follow the on-screen instructions to build the extension.

## Build the extension

Open your terminal, navigate to your extension directory and run `npm install && npm run dev`. Open Raycast, and you'll notice your extension at the top of the root search. Press `↵` to open it.

![Your first extension](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/hello-world-2.webp)

## Develop your extension

To make changes to your extension, open the `./src/index.tsx` file in your extension directory, change the `markdown` text and save it. Then, open your command in Raycast again and see your changes.

{% hint style="info" %}
`npm run dev` starts the extension in development mode with hot reloading, error reporting and [more](../information/developer-tools/cli.md#development).
{% endhint %}

## Use your extension

Now, you can press `⌃` `C` in your terminal to stop `npm run dev`. The extension stays in Raycast, and you can find its commands in the root when searching for the extension name "Hello World" or the command name "Render Markdown".

![Find your extension in the root search](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/hello-world-2.webp)

🎉 Congratulations! You built your first extension. Off to many more.

{% hint style="info" %}
Don't forget to run [`npm run dev`](../information/developer-tools/cli.md#development) again when you want to change something in your extension.
{% endhint %}


---
description: This guide covers how to find and fix bugs in your extension.
---

# Debug an Extension

Bugs are unavoidable. Therefore it's important to have an easy way to discover and fix them. This guide shows you how to find problems in your extensions.

## Console

Use the `console` for simple debugging such as logging variables, function calls, or other helpful messages. All logs are shown in the terminal during [development mode](../information/developer-tools/cli.md#development). Here are a few examples:

```typescript
console.log("Hello World"); // Prints: Hello World

const name = "Thomas";
console.debug(`Hello ${name}`); // Prints: Hello Thomas

const error = new Error("Boom 💥");
console.error(error); // Prints: Boom 💥
```

For more, checkout the [Node.js documentation](https://nodejs.org/dist/latest-v16.x/docs/api/console.html).

We automatically disable console logging for store extensions.

## Visual Studio Code

For more complex debugging you can install the [VSCode extension](https://marketplace.visualstudio.com/items?itemName=tonka3000.raycast) to be able to attach a node.js debugger to the running Raycast session.

1. Activate your extension in dev mode via `npm run dev` or via the VSCode command `Raycast: Start Development Mode`
2. Start the VSCode command `Raycast: Attach Debugger`
3. Set your breakpoint like in any other node.js base project
4. Activate your command

## Unhandled exceptions and Promise rejections

All unhandled exceptions and Promise rejections are shown with an error overlay in Raycast.

![Unhandled exception in development mode](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/basics-unhandled-exception.webp)

During development, we show the stack trace and add an action to jump to the error to make it easy to fix it. In production, only the error message is shown. You should [show a toast](../api-reference/feedback/toast.md#showtoast) for all expected errors, e.g. a failing network request.

### Extension Issue Dashboard

When unhandled exceptions and Promise rejections occur in the production build of a public extension, Raycast tries to redact all potentially sensitive information they may include, and reports them to our error backend. As an extension author, or as the manager of an organisation, you can view and manage error reports for your public extensions by going to https://www.raycast.com/extension-issues, or by finding your extension in Raycast's root, `Store` command, or `Manage Extensions` command, and using the `View Issues` action.
The dashboard should give you an overview of what issues occurred, how many times, how many users were affected, and more. Each issue additionally has a detail view, including a stack trace, breadcrumbs (typically the actions performed before the crash), extension release date, Raycast version, macOS version.

![Extension Issues](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/extension-issues.webp)

## React Developer Tools

We support [React Developer Tools](https://github.com/facebook/react/tree/main/packages/react-devtools) out-of-the-box. Use the tools to inspect and change the props of your React components, and see the results immediately in Raycast. This is especially useful for complex commands with a lot of states.

![React Developer Tools](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/basics-react-developer-tools.webp)

To get started, add the `react-devtools` to your extension. Open a terminal, navigate to your extension directory and run the following command:

```typescript
npm install --save-dev react-devtools@5.2.0
```

Then re-build your extension with `npm run dev`, open the command you want to debug in Raycast, and launch the React Developer Tools with `⌘` `⌥` `D`. Now select one of the React components, change a prop in the right sidebar, and hit enter. You'll notice the change immediately in Raycast.

### Alternative: Global installation of React Developer Tools

If you prefer to install the `react-devtools` globally, you can do the following:

```bash
npm install -g react-devtools@5.2.0
```

Then you can run `react-devtools` from a terminal to launch the standalone DevTools app. Raycast connects automatically, and you can start debugging your component tree.

## Environments

By default, extensions installed from the store run in Node production mode and development extensions in development mode. In development mode, the CLI output shows you additional errors and warnings (e.g. the infamous warning when you're missing the React `key` property for your list items); performance is generally better when running in production mode. You can force development extensions to run in Node production mode by going to Raycast Preferences > Advanced > "Use Node production environment".

At runtime, you can check which Node environment you're running in:

```typescript
if (process.env.NODE_ENV === "development") {
  // running in development Node environment
}
```

To check whether you're running the store or local development version:

```typescript
import { environment } from "@raycast/api";

if (environment.isDevelopment) {
  // running the development version
}
```


---
description: This guide covers the prerequisites you need to start building extensions.
---

# Getting Started

## System Requirements

Before you can create your first extension, make sure you have the following prerequisites.

- You have Raycast 1.26.0 or higher installed.
- You have [Node.js](https://nodejs.org) 16.10 or higher installed. We recommend [nvm](https://github.com/nvm-sh/nvm) to install Node.
- You have [npm](http://npmjs.com) 7.x or 8.x
- You are familiar with [React](https://reactjs.org) and [TypeScript](https://www.typescriptlang.org). Don't worry, you don't need to be an expert. If you need some help with the basics, check out TypeScript's [Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) and React's [Getting Started](https://react.dev/learn) guide.

## Sign In

![Opening the "Store" command in Raycast](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/welcome.webp)

You need to be signed in to use the following extension development commands.

- **Store:** Search and install all published extensions
- **Create Extension:** Create new extensions from templates
- **Import Extension:** Import extensions from source code
- **Manage Extensions**: List and edit your published extensions


---
description: Learn how to find and use extensions from the Raycast Store.
---

# Install an Extension

All published extensions are discoverable in the Raycast Store. Use the [web interface](https://raycast.com/store) or the Store command to find what you're looking for.

## In-app Store

The easiest way to discover extensions is the in-app store. Open the Store command in Raycast and search for an extension. Press `⌘` `↵` to install the selected extension or press `↵` to see more details about it.

![Store in Raycast](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/basics-inapp-store.webp)

## Web Store

Alternatively, you can use our [web store](https://raycast.com/store). Press `⌘` `K` to open the command palette, search for an extension and open it.

![Web Store](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/basics-web-store.webp)

Then press the Install Extension button in the top right corner and follow the steps in Raycast.

![Install extension from the Web Store](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/basics-install-extension.webp)

## Use installed extensions

After an extension is installed, you can search for its commands in the root search. The extension can be further configured in the Extensions preferences tab.


---
description: Learn how to get through review process quickly
---

# Prepare an Extension for Store

Here you will find requirements and guidelines that you'll need to follow in order to get through the review before your extension becomes available in the Store. Please read it carefully because it will save time for you and for us. This document is constantly evolving so please do visit it from time to time.

## Metadata and Configuration

- Things to double-check in your `package.json`
  - Ensure you use your **Raycast** account username in the `author` field
  - Ensure you use `MIT` in the `license` field
  - Ensure you are using the latest Raycast API version
- Please use `npm` for installing dependencies and include `package-lock.json` in your pull request. We use `npm` on our Continuous Integration (CI) environment when building and publishing extensions so, by providing a `package-lock.json` file, we ensure that the dependencies on the server match the same versions as your local dependencies.
- Please check the terms of service of third-party services that your extension uses.
- Read the [Extension Guidelines](https://manual.raycast.com/extensions) and make sure that your Extension comply with it.
- Make sure to **run a distribution build** with `npm run build` locally before submitting the extension for review. This will perform additional type checking and create an optimized build. Open the extension in Raycast to check whether everything works as expected with the distribution build. In addition, you can perform linting and code style checks by running `npm run lint`. (Those checks will later also run via automated GitHub checks.)

## Extensions and Commands Naming

- Extension and command titles should follow [**Apple Style Guide**](https://help.apple.com/applestyleguide/#/apsgb744e4a3?sub=apdca93e113f1d64) convention
  - ✅ `Google Workplace`, `Doppler Share Secrets`, `Search in Database`
  - ❌ `Hacker news`, `my issues`
  - 🤔 It's okay to use lower case for names and trademarks that are canonically written with lower case letters. E.g. `iOS` , `macOS` , `npm`.
- **Extension title**
  - It will be used only in the Store and in the preferences
  - Make it easy for people to understand what it does when they see it in the Store
    - ✅ `Emoji Search`, `Airport - Discover Testflight Apps`, `Hacker News`
    - ❌ `Converter`, `Images`, `Code Review`, `Utils`
    - 🤔 In some cases, you can add additional information to the title similar to the Airport example above. Only do so if it adds context.
    - 💡 You can use more creative titles to differentiate your extension from other extensions with similar names.
  - Aim to use nouns rather than verbs
    - `Emoji Search` is better than `Search Emoji`
  - Avoid generic names for an extension when your extension doesn't provide a lot of commands
    - E.g. if your extension can only search pages in Notion, name it `Notion Search` instead of just `Notion`. This will help users to form the right expectations about your extension. If your extension covers a lot of functionality, it's okay to use a generic name like `Notion`. Example: [GitLab](https://www.raycast.com/tonka3000/gitlab).
    - **Rule of thumb:** If your extension has only one command, you probably need to name the extension close to what this command does. Example: [Visual Studio Code Recent Projects](https://www.raycast.com/thomas/visual-studio-code) instead of just `Visual Studio Code`.
- **Extension description**
  - In one sentence, what does your extension do? This will be shown in the list of extensions in the Store. Keep it short and descriptive. See how other approved extensions in the Store do it for inspiration.
- **Command title**
  - Usually it's `<verb> <noun>` structure or just `<noun>`
  - The best approach is to see how other commands are named in Raycast to get inspiration
    - ✅ `Search Recent Projects`, `Translate`, `Open Issues`, `Create Task`
    - ❌ `Recent Projects Search`, `Translation`, `New Task`
  - Avoid articles
    - ✅ `Search Emoji`, `Create Issue`
    - ❌ `Search an Emoji`, `Create an Issue`
  - Avoid just giving it a service name, be more specific about what the command does
    - ✅ `Search Packages`
    - ❌ `NPM`
- **Command subtitle**
  - Use subtitles to add context to your command. Usually, it's an app or service name that you integrate with. It makes command names more lightweight and removes the need to specify a service name in the command title.
  - The subtitle is indexed so you can still search using subtitle and title: `xcode recent projects` would return `Search Recent Projects` in the example above.
  - Don't use subtitles as descriptions for your command
    - ❌ `Quickly open Xcode recent projects`
  - Don't use a subtitle if it doesn't add context. Usually, this is the case with single command extensions.
    - There is no need for a subtitle for the `Search Emoji` command since it's self-explanatory
    - **Rule of thumb:** If your subtitle is almost a duplication of your command title, you probably don't need it

![Example of a good subtitle](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/good-subtitle.webp)

## Extension Icon

{% hint style="info" %}
We made a new icon generator tool to ease the process of creating icons for your extensions. You can find it [here](https://icon.ray.so/).
{% endhint %}

- The published extension in the Store should have a 512x512px icon in `png` format
- The icon should look good in both light and dark themes (you can switch the theme in Raycast Preferences → Appearance)
- If you have separate light and dark icons, refer to the `package.json` [manifest](https://developers.raycast.com/information/manifest#extension-properties) documentation on how to configure them
- Extensions that use the default Raycast icon will be rejected
- This [Icon Template](https://www.figma.com/community/file/1030764827259035122/Extensions-Icon-Template) can help you with making and exporting a proper icon
- Make sure to remove unused assets and icons
- 💡 If you feel like designing icons is not up to your alley, ask [community](https://raycast.com/community) for help (#extensions channel)

## Provide README if Additional Configuration Required

- If your extension requires additional setup, such as getting an API access token, enabling some preferences in other applications, or has non-trivial use cases, please provide a README file at the root folder of your extension. When a README is provided, users will see the "About This Extension" button on the preferences onboarding screen.
- Supporting README media: Put all linked media files in a top-level `media` folder inside your extension directory. (This is different from assets that are required at runtime in your extension: they go inside the assets folder and will be bundled into your extension.)

![Onboarding button linking to the README file](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/required-preference.webp)

## Categories

![Categories shown on an extension details screen](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/categories-focus.webp)

- All extensions should be published with at least one category
- Categories are case-sensitive and should follow the [Title Case](https://titlecaseconverter.com/rules/) convention
- Add categories in the `package.json` [manifest](https://developers.raycast.com/information/manifest) file or select the categories when you create a new extension using the **Create Extension** command

### All Categories

| Category        | Example                                                                                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Applications    | [Cleanshot X](https://www.raycast.com/Aayush9029/cleanshotx) – Capture and record your screen                                                                   |
| Communication   | [Slack Status](https://www.raycast.com/petr/slack-status) – Quickly change your Slack status.                                                                   |
| Data            | [Random Data Generator](https://www.raycast.com/loris/random) – Generate random data using Faker library.                                                       |
| Documentation   | [Tailwind CSS Documentation](https://www.raycast.com/vimtor/tailwindcss) – Quickly search Tailwind CSS documentation and open it in the browser.                |
| Design Tools    | [Figma File Search](https://www.raycast.com/michaelschultz/figma-files-raycast-extension) – Lists Figma files allowing you to search and navigate to them.      |
| Developer Tools | [Brew](https://www.raycast.com/nhojb/brew) – Search and install Homebrew formulae.                                                                              |
| Finance         | [Coinbase Pro](https://www.raycast.com/farisaziz12/coinbase-pro) – View your Coinbase Pro portfolio.                                                            |
| Fun             | [8 Ball](https://www.raycast.com/rocksack/8-ball) – Returns an 8 ball like answer to questions.                                                                 |
| Media           | [Unsplash](https://www.raycast.com/eggsy/unsplash) – Search images or collections on Unsplash, download, copy or set them as wallpaper without leaving Raycast. |
| News            | [Hacker News](https://www.raycast.com/thomas/hacker-news) – Read the latest stories of Hacker News.                                                             |
| Productivity    | [Todoist](https://www.raycast.com/thomaslombart/todoist) – Check your Todoist tasks and quickly create new ones.                                                |
| Security        | [1Password 7](https://www.raycast.com/khasbilegt/1password7) – Search, open or edit your 1Password 7 passwords from Raycast.                                    |
| System          | [Coffee](https://www.raycast.com/mooxl/coffee) – Prevent the sleep function on your mac.                                                                        |
| Web             | [Wikipedia](https://www.raycast.com/vimtor/wikipedia) – Search Wikipedia articles and view them.                                                                |
| Other           | To be used if you think your extension doesn’t fit in any of the above categories.                                                                              |

## Screenshots

![An example of an extension with screenshot metadata](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/hn-store.webp)

- Screenshots are displayed in the metadata of an extension details screen, where users can click and browse through them to understand what your extension does in greater detail, before installing
- You can add a maximum of six screenshots. We recommend adding at least three, so your extensions detail screen looks beautiful.

### Adding Screenshots

In Raycast 1.37.0+ we made it easy for you to take beautiful pixel perfect screenshots of your extension with an ease.

#### How to use it?

1. Set up Window Capture in Advanced Preferences (Hotkey e.g.: `⌘⇧⌥+M`)
2. Ensure your extension is opened in development mode (Window Capture eliminates dev-related menus/icons).
3. Open the command
4. Press the hotkey, remember to tick `Save to Metadata`

{% hint style="info" %}
This tool will use your current background. Choose a background image with a good contrast that makes it clear and easy to see the app and extension you've made.

You can use [Raycast Wallpapers](https://www.raycast.com/wallpapers) to make your background look pretty
{% endhint %}

### Specifications

| Screenshot size                | Aspect ratio | Format | Dark mode support |
| ------------------------------ | ------------ | ------ | ----------------- |
| 2000 x 1250 pixels (landscape) | 16:10        | PNG    | No                |

### Do's & Dont's

- ✅ Choose a background with good contrast, that makes it clear and easy to see the app and extension you’ve made
- ✅ Select the most informative commands to showcase what your extension does – focus on giving the user as much detail as possible
- ❌ Do not use multiple backgrounds for different screenshots – be consistent and use the same across all screenshots
- ❌ Do not share sensitive data in your screenshots – these will be visible in the Store, as well as the Extension repository on GitHub
- ❌ Avoid using screenshots in different themes (light and dark), unless it is to demonstrate what your extension does

## Version History

![A CHANGELOG.md file displayed in the app](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/version-history.webp)

- Make it easier for users to see exactly what notable changes have been made between each release of your extension with a `CHANGELOG.md` file in your extension metadata
  - To add Version History to your extension, add a `CHANGELOG.md` file to the root folder of your extension
- See an extension files structure with [screenshots and a changelog file](prepare-an-extension-for-store.md#adding-screenshots)
- With each modification, provide clear and descriptive details regarding the latest update, accompanied by a title formatted as an h2 header followed by `{PR_MERGE_DATE}`. This placeholder will be automatically replaced when the pull request is merged. While you may still use the date timestamp format YYYY-MM-DD, it is often more practical to use `{PR_MERGE_DATE}` since merging of a pull request can take several days (depending on the review comments, etc.).
  - Make sure your change title is within square brackets
  - Separate your title and date with a hyphen `-` and spaces either side of the hyphen
- Below is an example of a changelog that follows the correct format

```markdown
# Brew Changelog

## [Added a bunch of new feedback] - {PR_MERGE_DATE}

- Improve reliability of `outdated` command
- Add action to copy formula/cask name
- Add cask name & tap to cask details
- Add Toast action to cancel current action
- Add Toast action to copy error log after failure

## [New Additions] - 2022-12-13

- Add greedy upgrade preference
- Add `upgrade` command

## [Fixes & Bits] - 2021-11-19

- Improve discovery of brew prefix
- Update Cask.installed correctly after installation
- Fix installed state after uninstalling search result
- Fix cache check after installing/uninstalling cask
- Add uninstall action to outdated action panel

## [New Commands] - 2021-11-04

Add support for searching and managing casks

## [Added Brew] - 2021-10-26

Initial version code
```

![An extensions version history on raycast.com/store](https://user-images.githubusercontent.com/17166544/159987128-1e9f22a6-506b-4edd-bb40-e121bfdc46f8.png)

{% hint style="info" %}
You can use [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) to help you format your changelog correctly
{% endhint %}

## Contributing to Existing Extensions vs Creating a New One

- **When you should contribute to an existing extension instead of creating a new one**
  - You want to make a small improvement to an extension that is already published, e.g. extra actions, new preference, UX improvements, etc.. Usually, it's a non-significant change.
  - You want to add a simple command that compliments an existing extension without changing the extension title or description, e.g. you want to add "Like Current Track" command for Spotify. It wouldn't make sense to create a whole new extension just for this when there is already the [Spotify Controls](https://www.raycast.com/thomas/spotify-controls) extension.
  - **Important:** If your change is significant, it makes sense to contact the author of the extension before you invest a lot of time into it. We cannot merge significant contributions without the author's sign-off.
- **When you should consider creating a new extension instead of contributing to an existing one**
  - The changes to an existing extension would be significant and might break other people's workflows. Check with the author if you want to proceed with the collaboration path.
  - Your extension provides an integration with the same service but has a different configuration, e.g. one extension could be "GitHub Cloud", another "GitHub Enterprise". One extension could be "Spotify Controls" and only uses AppleScript to play/pause songs, while another extension can provide deeper integration via the API and require an access token setup. There is no reason to try to merge everything together as this would only make things more complicated.
- **Multiple simple extensions vs one large one**
  - If your extension works standalone and brings something new to the Store, it's acceptable to create a new one instead of adding commands to an existing one. E.g. one extension could be "GitHub Repository Search", another one could be "GitHub Issue Search". It should not be the goal to merge all extensions connecting with one service into one mega extension. However, it's also acceptable to merge two extensions under one if the authors decide to do so.

## Binary Dependencies and Additional Configuration

- Avoid asking users to perform additional downloads and try to automate as much as possible from the extension, especially if you are targeting non-developers. See the [Speedtest](https://github.com/raycast/extensions/pull/302) extension that downloads a CLI in the background and later uses it under the hood.
- If you do end up downloading executable binaries in the background, please make sure it's done from a server that you don't have access to. Otherwise, we cannot guarantee that you won't replace the binary with malicious code after the review. E.g. downloading `speedtest-cli` from [`install.speedtest.net`](http://install.speedtest.net) is acceptable, but doing this from some custom AWS server would lead to a rejection. Add additional integrity checks through hashes.
- Don't bundle opaque binaries where sources are unavailable or where it's unclear how they have been built.
- Don't bundle heavy binary dependencies in the extension – this would lead to an increased extension download size.
- **Examples for interacting with binaries**
  - ✅ Calling known system binaries
  - ✅ Binary downloaded or installed from a trusted location with additional integrity checking through hashes (that is, verify whether the downloaded binary really matches the expected binary)
  - ✅ Binary extracted from an npm package and copied to assets, with traceable sources how the binary is built; **note**: we have yet to integrate CI actions for copying and comparing the files; meanwhile, ask a member of the Raycast team to add the binary for you
  - ❌ Any binary with unavailable sources or unclear builds just added to the assets folder

## Keychain Access

- Extensions requesting Keychain Access will be rejected due to security concerns. If you can't work around this limitation, reach out to us on [Slack](https://raycast.com/community) or via `feedback@raycast.com`.

## UI/UX Guidelines

### Preferences

![Required preferences will be shown when opening the command](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/required-preferences-2.webp)

- Use the [preferences API](https://developers.raycast.com/api-reference/preferences) to let your users configure your extension or for providing credentials like API tokens
  - When using `required: true`, Raycast will ask the user to set preferences before continuing with an extension. See the example [here](https://github.com/raycast/extensions/blob/main/extensions/gitlab/package.json#L150).
- You should not build separate commands for configuring your extension. If you miss some API to achieve the preferences setup you want, please file a [GitHub issue](https://github.com/raycast/extensions/issues) with a feature request.

### Action Panel

![Raycast Action Panel component](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/action-panel.webp)

- Actions in the action panel should also follow the **Title Case** naming convention
  - ✅ `Open in Browser`, `Copy to Clipboard`
  - ❌ `Copy url`, `set project`, `Set priority`
- Provide icons for actions if there are other actions with icons in the list
  - Avoid having a list of actions where some have icons and some don't
- Add ellipses `…` for actions that will have a submenu. Don't repeat the parent action name in the submenu
  - ✅ `Set Priority…` and submenu would have `Low`, `Medium`, `High`
  - ❌ `Set Priority` and submenu would have `Set Priority Low`, `Set Priority Medium`, etc

### Navigation

- Use the [Navigation API](https://developers.raycast.com/api-reference/user-interface/navigation) for pushing new screens. This will ensure that a user can navigate within your extension the same way as in the rest of the application.
- Avoid introducing your own navigation stack. Extensions that just replace the view's content when it's expected to push a new screen will be rejected.

### Empty States

- When you update lists with an empty array of elements, the "No results" view will be shown. You can customize this view by using the [List.EmptyView](../api-reference/user-interface/list.md#list.emptyview) or [Grid.EmptyView](../api-reference/user-interface/grid.md#grid.emptyview) components.
- **Common mistake** - "flickering empty state view" on start
  - If you try rendering an empty list before real data arrives (e.g. from the network or disk), you might see a flickering "No results" view when opening the extension. To prevent this, make sure not to return an empty list of items before you get the data you want to display. In the meantime, you can show the loading indicator. See [this example](https://developers.raycast.com/information/best-practices#show-loading-indicator).

### Navigation Title

- Don't change the `navigationTitle` in the root command - it will be automatically set to the command name. Use `navigationTitle` only in nested screens to provide additional context. See [Slack Status extension](https://github.com/raycast/extensions/blob/020f2232aa5579b5c63b4b3c08d23ad719bce1f8/extensions/slack-status/src/setStatusForm.tsx#L95) as an example of correct usage of the `navigationTitle` property.
- Avoid long titles. If you can't predict how long the navigation title string will be, consider using something else. E.g. in the Jira extension, we use the issue key instead of the issue title to keep it short.
- Avoid updating the navigation title multiple times on one screen depending on some state. If you find yourself doing it, there is a high chance you are misusing it.

### Placeholders in Text Fields

- For a better visual experience, add placeholders in text field and text area components. This includes preferences.
- Don't leave the search bar without a placeholder

### Analytics

- It’s not allowed to include external analytics in extensions. Later on, we will add support to give developers more insights into how their extension is being used.

### Localization / Language

- At the moment, Raycast doesn't support localization and only supports US English. Therefore, please avoid introducing your custom way to localize your extension. If the locale might affect functionality (e.g. using the correct unit of measurement), please use the preferences API.
- Use US English spelling (not British)


---
description: Learn how to share your extension with our community.
---

# Publish an Extension

Before you publish your extension, take a look at [how to prepare your extension](prepare-an-extension-for-store.md) for the Store. Making sure you follow the guidelines is the best way to help your extension pass the review.

### Validate your extension

Open your terminal, navigate to your extension directory, and run `npm run build` to verify your extension. The command should complete without any errors.

{% hint style="info" %}
`npm run build` validates your extension for distribution without publishing it to the store. Read more about it [here](../information/developer-tools/cli.md#build).
{% endhint %}

### Publish your extension

To share your extension with others, navigate to your extension directory, and run `npm run publish` to publish your extension. You will be asked to authenticate with GitHub because the script will automatically open a pull request in our [repository](https://github.com/raycast/extensions).

{% hint style="info" %}
If someone contributes to your extension, running `npm run publish` will fail until you run

```bash
npx @raycast/api@latest pull-contributions
```

in your git repository. This will merge the contributions with your code, asking you to fix the conflicts if any.
{% endhint %}

Once the pull request is opened, you can continue pushing more commits to it by running `npm run publish` again.

#### Alternative way

If you want more control over the publishing process, you can manually do what `npm run publish` does. You need to open a pull request in our [repository](https://github.com/raycast/extensions). For this, [fork our repository](https://docs.github.com/en/get-started/quickstart/fork-a-repo), add your extension to your fork, push your changes, and open a pull request [via the GitHub web interface](https://docs.github.com/en/github/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request-from-a-fork) into our `main` branch.

### Waiting for review

After you opened a pull request, we'll review your extension and request changes when required. Once accepted, the pull request is merged and your extension will be automatically published to the [Raycast Store](https://raycast.com/store).

{% hint style="info" %}
We're still figuring things out and updating our guidelines. If something is unclear, please tell us in [our community](https://raycast.com/community).
{% endhint %}

### Share your extension

Once your extension is published in the Raycast Store, you can share it with our community. Open the Manage Extensions command, search for your extension and press `⌘` `⌥` `.` to copy the link.

![Manage your extensions](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/basics-manage-extensions.webp)

🚀 Now it's time to share your work! Tweet about your extension, share it with our [Slack community](https://raycast.com/community) or send it to your teammates.


---
description: Learn how to review a contribution from a Pull Request opened by a contributor.
---

# Review an extension in a Pull Request

All updates to an extension are made through a [Pull Request](https://github.com/raycast/extensions/pulls) - if you need to review whether the Pull Request works as expected, then you can checkout the fork within a few seconds.

## Steps

1. Open a terminal window
2. Navigate to a folder where you want the repository to land
3. Run the below commands

_There are a few things you'll need to find and insert manually in the snippet below_

**FORK_URL**

Open the PR and click on the incomming ref as shown below

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/go-to-ref.webp)

Now click the code button and copy the HTTPS path from the dropdown

**BRANCH**

You can see the branch on the above image, in this example it's `notion-quicklinks`

**EXTENSION_NAME**

Click the `Files Changed` tab and see which directy files is changed in, in this example it's `notion`

```
BRANCH="ext/soundboard"
FORK_URL="https://github.com/pernielsentikaer/raycast-extensions.git"
EXTENSION_NAME="soundboard"

git clone -n --depth=1 --filter=tree:0 -b ${BRANCH} ${FORK_URL}
cd raycast-extensions
git sparse-checkout set --no-cone "extensions/${EXTENSION_NAME}"
git checkout
cd "extensions/${EXTENSION_NAME}"
npm install && npm run dev
```

4. That's it, the extension should now be attached in Raycast


# Changelog

## 1.84.0 - 2024-10-09

### 💎 Improvements

- When running a no-view command with arguments, only clear the argument inputs instead of clearing the entire search bar (which brings the behaviour in line with other no-view commands)

### 🐞 Fixes

- Fixed a regression where `selectedItemId` wouldn’t be respected
- Fixed a typo in the extension template’s build script

## 1.81.0 - 2024-08-13

### ✨ New

- **Detail:** You can now render LaTeX in the Detail views. We support the following delimiters:
  - Inline math: `\(...\)` and `\begin{math}...\end{math}`
  - Display math: `\[...\]`, `$$...$$` and `\begin{equation}...\end{equation}`

### 💎 Improvements

- You can now pick a different command template for each command that you add in the `Create Extension` command’s form.
- Added a new `Add Command` action for local extensions in the `Manage Extensions` command.

## 1.80.0 - 2024-07-31

### ✨ New

- **AI:** OpenAI GPT-4o Mini can now be used in the API.
- **Quicklinks:** `CreateQuickLink` now accepts an `icon` prop that allows you to customize the icon of your Quicklink.

### 💎 Improvements

- **Menu Bar Commands** now show a confirmation toast when activated or refreshed.

## 1.79.0 - 2024-07-17

### ✨ New

- **Navigation**: Added a second argument to `useNavigation().push` to specify a callback called when the pushed view will be popped. You can use it to update the current view when it will become active again. There’s also a new `onPop` prop on `Action.Push` to do the same thing.

### 💎 Improvements

- When creating or forking an extension, an alert will be shown if you specify an existing folder (and thus avoid overwriting files without warning)

## 1.78.0 - 2024-07-03

### ✨ New

- In addition to the new Custom Window Management commands, we are introducing a `WindowManagement` API to give you total control to move your windows depending on any kind of logic you can imagine.
- You can now access the `ownerOrAuthorName` in the `environment`, useful for re-usable libraries.

### 🐞 Fixes

- **Pagination**: Fixed the TypeScript definition of the `onLoadMore` callback.

## 1.77.0 - 2024-06-19

### ✨ New

- Updated React version to 18.3.1 to prepare for the next major version of React. This shouldn't impact any extensions but let us know if you find any unexpected behaviour.

### 🐞 Fixes

- **Menu Bar Extra**: fixed an issue where `Submenu` icons changed appearance based on Raycast's appearance, instead of the system's.

## 1.76.0 - 2024-06-05

### 💎 Improvements

- Some companies requires all package.json’s names to be name-spaced (eg. `@foo/bar`). However, Raycast only understands names that _aren’t_ name-spaced. This prevented some people from creating internal extensions. In order to workaround this issue, you can now use the `@workaround` namespace in extension names (eg. `@workaround/bar`).

### 🐞 Fixes

- **Clipboard**: Fixed an issue where 2 items were added to the pasteboard when copying a file (one with the file name, and one with the file url). It now correctly adds 1 item with 2 representations.

## 1.74.0 - 2024-05-15

### ✨ New

- **AI:** The models available in the API now matches the ones available in the app (eg. GPt-4o, Llama-3, etc.). As part of this, the models are now part of an enum `AI.Model` which will make it easier to add and deprecate them as time goes on.
- **Utils:** we’ve added a new React hook called `useLocalStorage`. This hook simplifies managing a value in `LocalStorage`. Take a look at the [developer docs](https://developers.raycast.com/utilities/react-hooks/uselocalstorage) to learn more.

### 💎 Improvements

- **DX**: Improved the precision of warning messages when trying to add children to a react component that can’t accept them.

## 1.72.0 - 2024-04-24

### ✨ New

- **Browser Extension**: You can now access the context of the focused browser via the Raycast Browser Extension. You can get the list of open tabs as well as the content of a tab.

### 🐞 Fixes

- **Grid**: Fixed a bug that caused the selected Grid item to be brought into focus when paginating.

## 1.71.0 - 2024-04-10

### ✨ New

- **Developer Hub:** you can now programmatically send error reports using the new `captureException` function.
- **Utils**: we’ve added a new React hook, `useStreamJSON`. The new hook simplifies the process of streaming through large JSON data sources, which normally would not fit in the extension’s memory. Take a look at the [developer docs](https://developers.raycast.com/utilities/react-hooks/usestreamjson) to learn more.
- **AI**: All the new models are also available in the API.

### 💎 Improvements

- `getApplications`, `getDefaultApplication`, and `Action.OpenWith` now support remote URLs and will return the installed Applications that can open remote URLs (usually browsers)

### 🐞 Fixes

- **Pagination**: Fixed a bug that could cause pagination to not work when `filtering` was set to true.
- **CLI**: Fixed the cursor being kept hidden when interrupting a command

## 1.70.0 - 2024-03-20

### 💎 Improvements

- **Grid & List:** The placeholders shown while waiting for the next page to load are now animated
- **Application info:** Application object now returns the localized name if the application is running

### 🐞 Fixes

- **Forms:** Fixed an issue which made it impossible to select a value of a controlled Dropdown after changing its value programmatically
- **Grid:** Fixed an issue where pagination would not work when scrolling to the bottom while `isLoading` is initially false
- **List:** Fixed an issue where pagination would not work if there was an empty section at the end
- Fixed a rare case where, when an extension throws an error, a different error saying “Could not communicate with command worker” would be thrown instead

## 1.69.0 - 2024-03-07

### ✨ New

- `List` and `Grid` now have native pagination support! 🎉 If you want to update your extension to support pagination, head over to the [docs](https://developers.raycast.com/api-reference/user-interface/list#pagination) for instructions on how to get your extension to use pagination.
- Markdown: Added support for specifying a tint color in the url of a markdown image by adding a `raycast-tint-color` query string

### 💎 Improvements

- Lint: The eslint plugin and `ray` CLI has been updated to have the same algorithm to check if a string is in Title Case (using the definition from Apple)
- `getApplications` (and `Action.OpenWith`) will now show `Terminal` when using a path to a directory

### 🐞 Fixes

- Fixed an issue where, when the user would change the selection in a List or Grid and rapidly trigger an action, the action of the previously selected item would execute instead

## 1.67.0 - 2024-02-07

### 🐞 Fixes

- Fix a crash that could happen when exporting a function that would return another function.
- **Menu Bar Extra:** Fixed a bug that caused the text in text-only extras to be offset.

## 1.66.0 - 2024-01-24

### 💎 Improvements

- Improved some error messages in the `ray` CLI.

### 🐞 Fixes

- **Form**: Fixed the display of full-day dates in the Date Picker.

## 1.65.0 - 2024-01-10

### ✨ New

- **Developer Tools**: we've introduced a new developer option, `Use file logging instead of OSLog`, to work around an OS issue that causes some users to not see any extension logs in the terminal during development.

### 💎 Improvements

- **Form's Date Picker:** Future dates will be prioritised when parsing the date, f.e. if you type "8am" and itrs already "10am", then the parsed date will be "tomorrow 8am".

### 🐞 Fixes

- Fixed an issue where the `ray` CLI could not communicate with the app.
- Fixed an issue where an OAuth authorization session triggered by a menu bar command would not be able to complete if a `background` launch was triggered between authorization starting and completing.
- Fixed an issue on multi-monitor setups, where sometimes MenuBarExtra icons would not appear dimmed on inactive displays.

## 1.64.0 - 2023-12-13

### ✨ New

- **Form**: Introduced a new component `Form.LinkAccessory` to render a link displayed in the right-hand side of the search bar.
- **Arguments**: Introduced a new Argument type: `dropdown`. You can now [specify a list of options](https://developers.raycast.com/information/manifest#argument-properties) for the user choose from.
- **Developer Hub**: User preferences are now included in error reports. Password and text preferences will be replaced with `[REDACTED]`, file/directory/appPicker preferences will be scrubbed of PII, and dropdown/checkbox preferences will be sent as-is.

### 💎 Improvements

- **Window Capture**: Added a warning when trying to take a screenshot of Raycast if that screenshot won't match the requirement for the Store's extensions guidelines (eg. if Raycast is too close to an edge or if the screen doesn't have a high enough resolution).

### 🐞 Fixes

- **Types generation**: Fixed the type of a required `appPicker` preference (even if it is `required`, the app might be undefined because it is missing).
- **Empty View**: Fixed an issue where the Empty View might not be showing in a certain case.
- **Menu Bar Extra**: \*\*\*\*icons tinted with `Color.PrimaryText` and `Color.SecondaryText` should now change based on the menu bar's appearance.
- **List Metadata:** `Link`s should be properly aligned again.

## 1.63.0 - 2023-11-29

### 💎 Improvements

- Improved runtime error handling when using a Swift project

### 🐞 Fixes

- **Lists**: Fixed a race condition where the selected item would not be the first one after a list items update

- **MenuBarExtra:** `alternate` are no longer supported on pre-Sonoma versions of macOS, as they would often appear alongside their parent items.

## 1.62.0 - 2023-11-15

### ✨ New

- **Menu Bar:** `MenuBarExtra.Item`s have a new prop, `alternate`. If an `alternate` is defined, it will replace its parent `MenuBarExtra.Item` when the user presses the ⌥ (option) key.
- The Node runtime has been updated to [Node 20](https://nodejs.org/en/blog/announcements/v20-release-announce/), the [current](https://github.com/nodejs/Release#release-schedule) Long-term Support (LTS) release.
- **AI**: You can now use the `gpt-4` model with `AI.ask`. If a user does not have access to this model, it will gracefully fall back to an available model. You can check if a user has access using `environment.canAccess('gpt-4')`.

### 💎 Improvements

- **Error Handling:** `Could not communicate with command worker` errors should not be reported anymore.

### 🐞 Fixes

- **Toast:** Fixed an issue that caused toast actions to not work after a toast was updated.
- **Error Handling:** Fixed an edge case that could cause an out-of-memory error while an uncaught exception was processed, obfuscating the original error.
- **Performance**: Fixed an issue where some keyboard events would be dropped while an extension was loading.
- **Markdown**: Fixed a regression where HTML comments would show up in the rendered Markdown.

## 1.61.0 - 2023-11-02

### 💎 Improvements

- **Date Picker**: When specifying a min and/or max date, the suggestion will now always be within those bounds

### 🐞 Fixes

- Fixed a bug that previously could cause a `no-view` command to display an error icon in the root search, with no means of removing the error.

## 1.60.0 - 2023-10-18

## Introducing the Extension Issues Dashboard

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/extension-issues.webp)

The new Extension Issues Dashboard is designed to help you quickly troubleshoot and resolve issues in any of your extensions by providing real-time visibility into errors encountered by users. You can access it at https://www.raycast.com/extension-issues, or by using the new `View Issues` action.

### ✨ New

- It is now possible to write extensions [using ESM](https://developers.raycast.com/faq) instead of CommonJS

### 💎 Improvements

- Updated NodeJS runtime to 18.18.2
- When copying a deeplink with some arguments in the root search, copy the deeplink with those arguments

### 🐞 Fixes

- Fixed an issue where animated toasts would hang around after the command was unloaded.

## 1.59.0 - 2023-09-21

### ✨ New

- **PickDate**: Similar to `Form.DatePicker`, you can also check whether the user picked a full day or a specific time with `Action.PickDate.isFullDay(date)`.

### 💎 Improvements

- **Clipboard**: The `transient` option is renamed to `concealed`.

### 🐞 Fixes

- **MenuBarExtra:** Right-clicking `MenuBarExtra.Item`s should now work in macOS Sonoma.

## 1.58.0 - 2023-09-06

### ✨ New

- **Alert**: Add a new option `rememberUserChoice` to show a checkbox to remember the user choice the next time the same Alert would be shown.
- **DatePicker**: You can know check whether the user picked a full day or a specific time with `Form.DatePicker.isFullDay(date)`.

### 💎 Improvements

- The "Fork Extension" action is now also available in the Store for installed extensions.
- All the APIs that accepts a file path will now resolve `~` if necessary.

### 🐞 Fixes

- Fix an issue where some Toasts would not disappear after the command was terminated.
- Fix an issue where List Item's accessories with an icon could have their text cut off.
- Fix `getFrontmostApplication` failing for some applications.
- The "Fork Extension" will now be more robust dealing with unexpected `package.json` formats.
- Fixed an issue where newly created Extensions would not use the correct username after it had been updated.
- Fix an issue where it was possible to set a multiline `searchText`

## 1.57.0 - 2023-08-09

### 🐞 Fixes

- **Metadata**: Fixed various rendering issues with `TagList`.
- **Menu Bar Extra**: Fixed a bug that caused section titles to be unreadable on macOS Sonoma.
- **Menu Bar Extra**: Fixed a bug that could cause a menu bar command to be unloaded while its menu is open.
- **Form**: Fixed stale suggestions in the DatePicker when changing its type.
- **Icon**: Fixed the `AppWindowGrid2x2` icon only showing a square.

## 1.56.0 - 2023-07-26

### ✨ New

- **Clipboard**: `Clipboard.read()` now supports an `offset` option to access the Clipboard History (limited to the last 5)
- **Grid:** Grid items can now have an icon accessory
- **Shortcuts:** Providing a consistent user experience should now be easier thanks to the new `Keyboard.Shortcut.Common` export.

### 💎 Improvements

- `getSelectedText` is now more reliable
- **Trash**: Improved behaviour of `trash` and `Action.Trash` to better handle missing files.
- **HUD**: `showHUD` now supports the same options as `closeMainWindow`
- **Command Launching:** Improved logic for deciding which version of a command gets launched when a user has both a production and a development version of an extension installed.
- **Tags:** Icon-only tags should now center the icon.

### 🐞 Fixes

- **Form**: When working on a draft, updating a `Form.Checkbox` will update the draft.
- **Error Reports:** Improved error messages when an extension crashes during a background launch.
- **Shortcuts:** Previously, the API permitted the creation of shortcuts using keys reserved by Raycast (⌘+K, ⌘+W, ⌘+Esc, etc.), resulting in unexpected behavior. Raycast now ignores these and, during development mode, they will trigger a runtime warning.

## 1.55.0 - 2023-07-06

### 💎 Improvements

- **Fallback Commands**: Local commands will now have an indicator so that it's possible to differentiate them from the commands installed from the Store
- The NodeJS process used for Raycast extensions will now be named `Raycast Helper (Extensions)`
- Active menu bar commands will now be displayed in `Extension Diagnostics`.

### 🐞 Fixes

- Fix an issue where Metadata's Tag items would sometimes not be updated
- Fix a bug where renamed commands appear in the root search with both the original and the updated name after an extension update.

## 1.54.0 - 2023-06-21

### 💎 Improvements

- Add an action to clear the local storage when an unexpected error occurs
- When using `showToast` while the Raycast window is closed (for example if a command is launched with a hotkey), a `HUD` will be shown instead
- Improve the error messages when a command fails to load
- The NodeJS inspector will now use a random free port instead of using the default 9229 port (which you can use for other NodeJS scripts)

### 🐞 Fixes

- Fix a performance issue on the first render of Lists and Grids
- Fix an issue where required arguments wouldn't be required when launching a command right after installing it
- Fix a regression where the deprecated `render` method would not work anymore
- Fix an edge case where some Form items would not be updated if some items would be added at the same time

## 1.53.0 - 2023-06-07

### ✨ New

- **Metadata**: `List.Item.Detail.Metadata.TagList.Item` and `Detail.Metadata.TagList.Item` now accepts an action handler via the `onAction` prop!
- Added [LaunchContext](https://developers.raycast.com/api-reference/command#launchcontext) support to `Create Quicklink` and `Create Snippet:`
  - `launchCommand({ ownerOrAuthorName: "raycast", extensionName: "raycast", name: "create-quicklink", type: LaunchType.UserInitiated, context: { name: "context name", application: "Xcode", }});`
  - `launchCommand({ ownerOrAuthorName: "raycast", extensionName: "snippets", name: "create-snippet", type: LaunchType.UserInitiated, context: { name: "context name", text: "context text", keyword: "context keyword" }})`
- **Date Pickers:** You can now add a minimum and maximum date to `Form.DatePicker` and `Action.PickDate` using the `min` and `max` props to limit the suggestions shown when entering a date.

### 💎 Improvements

- Updated NodeJS to 18.16.0
- Improve the "Fork Extension" action to avoid modifying the manifest as much as possible.

### 🐞 Fixes

- Fixed a bug that sometimes caused `no-view` commands to not display errors.
- Fixed a bug that caused OAuth not to work if the `client.authorize(authorizationRequest)` was executed more than once.
- Fixed a problem where commands with background execution would not display the OAuth sign-in screen.
- **SVG**: Properly handle `currentColor`
- **List/Grid**: Fixed `selectedItemId` being sometimes ignored on the first render.
- **Form**: Fixed triggering `onChange` on the TextArea when using a markdown keyboard shortcut.

## 1.52.0 - 2023-05-24

### ✨ New

- **SVG**: You can now use the Raycast `Color` in an SVG.

### 💎 Improvements

- Improve the error message when a required property is missing on a component

### 🐞 Fixes

- Fixed an edge case where the keyboard events triggered while an extension is loading would not be passed down to the extension once loaded
- Fixed an issue where the fallback of an image would show while it is being loaded

## 1.51.0 - 2023-05-10

### ✨ New

- **AI**: Introduced a new `AI` Pro API. Use `AI.ask` to seamlessly ask any prompt and enhance your extensions with artificial intelligence.
- **Pro APIs:** You can now check whether a user can access a certain API using `environment.canAccess(AI)`.

### 💎 Improvements

- **Custom Theme**: Deprecated `Color.Brown` as it is not part of the Raycast colors anymore.
- **Custom Theme:** Renamed `environment.theme` to `environment.appearance`.
- Improve the error message when an API is called with arguments of the wrong type.

### 🐞 Fixes

- **Forms**: Fixed an issue where drafts would not save the value of a File Picker.
- **Forms**: Fixed an issue where `onChange` would not be triggered in certain cases for a File Picker.
- **Lists**: Fixed an issue that caused a List's section to re-render whenever an action panel's submenu was updated.
- **Colors:** Fixed a crash that could sometimes occur when using `adjustContrast` on a dynamic color.

## 1.50.0 - 2023-04-27

### ✨ New

- Raycast now provides 2 global TypeScript namespaces called `**Preferences**` and `**Arguments**` which respectively contain the types of the preferences and the types of the arguments of all the commands of the extensions.
  For example, if a command named `show-todos` has some preferences, its `getPreferenceValues`'s return type can be specified with `getPreferenceValues<Preferences.ShowTodos>()`. This will make sure that the types used in the command stay in sync with the manifest.
- It is now possible to add commands that are disabled by default. A user will have to enable it manually before it shows up in Raycast's root search. This can be useful to provide commands for specific workflows without overwhelming everybody's root search.
- **Markdown Tables** are now properly supported.
- **Markdown** code blocks now support syntax highlighting. To enable it, make sure you specify the programming language at the start of the block.

### 💎 Improvements

- **Colors**: To improve accessibility, dynamic adjustment for raw colors (`HEX`, `rgb` etc) used in extensions has been switched from opt-in to opt-out. If your extension relies on accurate color reproduction, check the [documentation](https://developers.raycast.com/api-reference/user-interface/colors) for instructions on how to opt-out.
- **Images**: You can now suffix your local assets with `@dark` to automatically provide a dark theme option, eg: `icon.png` and `icon@dark.png`.

### 🐞 Fixes

- **CLI**: Fix an issue where the CLI wouldn't want to bundle files named `foo.node.js`.

## 1.49.0 - 2023-03-29

### ✨ New

- It is now possible to drag and drop items from Grids. Lists are also supported if their items have as `quickLook` properties.

### 💎 Improvements

- Extend `launchCommand` to allow inter-extension launches
- Extend `launchCommand` to allow to pass a `fallbackText`

### 🐞 Fixes

- **SVG**: Ignore doctype and HTML comments
- Fix a flicker happening when there was a fallback text passed to a command
- Fix a rendering issue with multi-line `tag` text.

## 1.48.0 - 2023-02-22

### ✨ New

- **Clipboard**: Added `transient` option to `Clipboard.copy` method.
- **Actions**: Added `type` prop to `Action.PickDate` to control the date components to be picked.

### 💎 Improvements

- Improve the time to interaction when launching a command that always renders the same view type.

### 🐞 Fixes

- Changed `Deactivate Command` action shortcut to `⌘ ⌥ ⇧ D`, so it doesn't clash with `Copy Deeplink`
- Fixed an issue where restarting Raycast would not properly restore menu bar commands that sometimes didn't put anything in the menu bar.
- Locale: Respect the hourCycle, calendar, and numbering system locale.

## 1.47.0 - 2023-02-01

### ✨ New

- **Clipboard**: Add a new `Clipboard.read()` method that reads the clipboard content as plain text, file path, or HTML.

### 💎 Improvements

- **List Accessories**: Tags can now use any color (we made some improvements to ensure that any color would have enough contrast to be readable)

### 🐞 Fixes

- Fixed a bug where reloading menu bar commands in development mode would not respect certain manifest property updates (e.g. interval).
- Fixed a bug that caused `Metadata.Link`'s `title` to be cut off unnecessarily when using the large text size.
- Fixed a bug where `clearSearchBar` wouldn't clear the search bar when rendering a Grid.
- Fixed a bug where `ray lint` would fail if there were a .DS_Store file in the `src` folder.

## 1.46.0 - 2023-01-18

⚠️️ **Global Fetch Deprecation**: We've removed the experimental support for global fetch in Node 18. The reason is that the feature is not stable yet (hence the warning on it being "experimental" in the dev console) and is not compatible with our new proxy feature in Raycast. We've scanned the public repository for extensions that make use of global fetch and replaced it with the _cross-fetch_ dependency via separate PRs. If we missed an extension, let us know - in most cases, it should be a straightforward replacement.

### ✨ New

- **Source maps** for production errors: source maps are now also enabled for production builds of an extension. When an exception occurs, you get cleaner stack traces with proper source locations in the TypeScript sources files (vs. the minified and unusable JavaScript locations). _Note_: An extension must be re-published to enable production source maps.
- **Action.PickDate**: We are introducing a new Action to allow users to set a Date directly from the action panel.

### 💎 Improvements

- **Dev Tools**: the "Start Development" command under "Manage Extensions" now starts development in iTerm if installed as the default terminal.
- In order to ensure that date formatting & other internationalization functions work as expected, the NodeJS process is now started with the `LC_ALL` environment variable set to the user's current locale.

### 🐞 Fixes

- Fixed an issue where the first exec/spawn call for running a subprocess could be slower than subsequent calls.
- Fixed menu bar icon padding when there's no text.
- Fixed a problem where menu bar commands updated with a new required preference would not display the required preference screen.
- Fixed a rare bug with menu bar commands that could lead to Raycast hanging.
- Fixed an issue where menu bar commands launching view commands would cause stacking in the navigation hierarchy.
- Fixed an issue where fallback images in lists would flicker.
- Dev Tools: Fixed a bug when zip archiving extensions with special characters in file names.

## 1.45.0 - 2022-12-14

### ✨ New

- **Fallback commands**: All commands (except menu-bar commands and commands with more than one required argument) can now be used as [fallback commands](https://manual.raycast.com/fallback-commands)! They should all work out of the box (e.g. a command that renders a List will receive `onSearchTextChange` with the fallback text on its first render, etc.) but you can customize the user experience with a new top-level prop `fallbackText`.
- **List Accessories:** `date` and `text` accessories can now be colored.
- **List Accessories:** We've added a new accessory type: `tag`.
- **Metadata:** Label text can now also be colored.
- **Proxy Support**: Extensions using popular networking libraries such as node-fetch/cross-fetch, got, Axios, or our useFetch hook are compatible with proxies if the user has turned on the new proxy preference in Raycast.

### 💎 Improvements

- **Background refresh**: when a command misses a required preference, instead of showing the error screen, the user is directed to the preference onboarding screen again.

### 🐞 Fixes

- Fixed a bug where entered characters could be "swallowed" in controlled form components or the controlled search bar.
- Fixed the `launchContext` not being propagated to menu-bar and background launches when using the `launchCommand` API.
- Fixed a multi-monitor [bug](https://github.com/raycast/extensions/issues/2975) where menu bar extra text would be unreadable on the inactive screen.
- Fixed a bug where menu bar extra icon tinting would change based on Raycast's appearance instead of the system's.
- Fixed some memory leaks when using Form components

## 1.44.0 - 2022-11-23

### ✨ New

- **Async Submenus and Dropdown**: Dropdowns and ActionPanel Submenus now also support the properties `onSearchTextChange, isLoading, throttle, filtering` - same as for List and Grid where you can perform custom logic when the user changes the search text.
- **Application:** You can now get the current frontmost Application of the system with the top-level `getFrontmostApplication` method.
- **File and Directory Preferences**: We've added two new preference types `"directory"` and `"file"`, supported via the manifest. Both types show a file picker component and let the user select directory or file paths.
- **Environment:** You can now get the user's text size via `environment.textSize`.

### 💎 Improvements

- **Pop To Root Behavior**: `closeMainWindow` accepts a new parameter `popToRootType` that lets you control when Raycast pops back to root: the default is as-is and respects the user's "Pop to Root Search" preference in Raycast. `PopToRootType.Immediate` closes the window _and_ immediately pops back to root, regardless of the user's setting (so you can get rid of an additional `popToRoot()` call). The new mode `PopToRootType.Suspended` temporarily prevents Raycast from automatically popping back to root; this is useful for situations where a command needs to interact with an external system 00ity and then return the user back to the launching command.
- **Clipboard:** We added new options to copy and paste HTML content, which is useful for sharing formatted text, e.g. a link to a Notion page in Slack.
- **Markdown**: Markdown in a `Detail` component now supports convenience image references for icons and asset folder files such as:
  `![built-in icon](/Users/tanerilyazov/Downloads/extensions-main/docs/${Icon.AddPerson})` or `![local-assets-image](example.png)` (absolute URLs and user folder paths via `~` are also supported)
- **OAuth**: The client's `providerIcon` is now optional (extension icon as default) and accepts an `Image.ImageLike` type.
- **List and Detail Metadata**: Now show tooltips when labels get truncated.
- **Action.ToggleQuickLook**: Now also expands paths starting with `~`.

### 🐞 Fixes

- **Dropdown**: Fixed triggering a dropdown component's `onChange` handler when navigating.
- **Dropdown**: Fixed the missing `placeholder` property in the search bar dropdown.
- **Forms**: Fixed submitting a form with marked text.

## 1.43.0 - 2022-11-09

### ✨ New

- **Actions**: You can now specify an action to focus when opening the ActionPanel (and an ActionPanel.Submenu) by setting the `autoFocus` prop.
- **Forms**: Introducing a new Form Item `Form.FilePicker` to select one or multiple files (or directories)

### 💎 Improvements

- **DX**: A warning will now be shown in the console when using async entry points for view and menu-bar commands.
- **List/Grid**: Improved the keyword search algorithm to match intersecting keywords (for example, the search term "black cat" matches keywords ["black", "cat"]).
- **Grid**: The grid supports a new property for configuring how sections are ordered. Setting `filtering={{ keepSectionOrder: true }}` ensures that the sections' order is not changed based on items' ranking values; this can be useful for use cases where a small number of fixed sections should always appear in the same order when the user filters the grid. We are deprecating the `enableFiltering` property.

### 🐞 Fixes

- Fixed the Grid or List's selection sometimes not being preserved when native filtering is disabled.
- The `Image.Mask.RoundedRectangle` mask will be more consistent regardless of the size of the image.
- Fixed an issue where the specified `searchText` property would not always be respected.

## 1.42.0 - 2022-10-26

### ✨ New

- The Node runtime has been updated to [Node 18](https://nodejs.org/en/blog/announcements/v18-release-announce/), the [current](https://github.com/nodejs/Release#release-schedule) Long-term Support (LTS) release.
- Commands can now launch other commands! Using the new `launchCommand` method, you can now trigger a background refresh of another command in the same extension - or even open another command. Some use cases are updating a menu bar command from a view command or, vice versa, launching a companion view command from the menu bar. (Note that for now we only support launches of other commands within the same extension.)

### 💎 Improvements

- **Grid** now supports two new aspect ratios: 4/3 and 3/4.
- **Menu Bar** icon tinting is now theme-aware.
- **Background Refresh:** The shortest interval available is now 10s instead of 1m (use cautiously and also see our [best practices guide](https://developers.raycast.com/information/background-refresh#best-practices)).
- **Grid**: The grid supports a new property for configuring how sections are ordered. Setting `filtering={{ keepSectionOrder: true }}` ensures that the section order is not changed based on items' ranking values; this can be useful for use cases where a small number of fix sections should always appear in the same order when the user filters the list. We are deprecating the `enableFiltering` property.

### 🐞 Fixes

- **List Item Metadata Link and Detail Metadata Link** styling should now be consistent with their respective **List Item Metadata Label** and **Detail Metadata Label** respectively.
- Fixed a bug where `List.Item`'s accessories might not be aligned.
- Fixed a bug where the last API call or log in a no-view command would not run before the command gets unloaded.

## 1.41.0 - 2022-10-12

### New

- **Grid**: the `Grid` component accepts three new props that should give extension authors more flexibility: `columns`, `fit` and `aspectRatio`.

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/grid-styled-sections.webp)

- **Grid Sections** don't all have to look the same anymore! The grid `Section` component now _also_ accepts the `columns`, `fit` and `aspectRatio` props. When specified, they will override the value of the parent `Grid` component's prop.
- **List**: The list supports a new property for configuring how sections are ordered. Setting `filtering={{ keepSectionOrder: true }}` ensures that the section order is not changed based on items' ranking values; this can be useful for use cases where a small number of fix sections should always appear in the same order when the user filters the list. We are deprecating the `enableFiltering` property.
- **Menu Bar Extra:** added a new `Section` component, which can be used to better group related `Item`s and/or `Submenu`s. The component has an optional title for the section. At the same time, we are deprecating the `Separator` component.
- **Menu Bar Extra**: The `Item` component now accepts an optional `subtitle` prop.
- **Clipboard:** `Clipboard.copy()` and `Clipboard.paste()` methods now accept file paths as a parameter.

### 💎 Improvements

- Improved dark/light mode detection for **Menu Bar Extra** icons.
- If a **Menu Bar Extra**'s `title` spans multiple lines**,** only the first one will be displayed.

### 🐞 Fixes

- Fixed certain error stack traces causing CPU spikes of the Node process.
- Fixed an issue with **macOS Ventura Beta** where **Menu Bar Extra**s would sometimes become unresponsive.
- Fixed the type of the List and Grid's `onSelectionChange`. It always used to return `null` when no items were selected but the type was `string | undefined`. It is now properly `string | null`. Note that this might trigger some TypeScript error when you upgrade but it should help you fix some bugs.

## 1.40.0 - 2022-09-28

### ✨ New

- **Menu Bar Extras** can now be deactivated without disabling the menu bar command! To deactivate a menu bar command, run the `Deactivate Command` action from the command's Action Panel - or drag the menu bar extra out of the menu bar while holding down ⌘.
- Commands with **Background Refresh** also now have a `Deactivate Command` action!
- **Menu Bar Extras** now support both a primary and secondary action type (right click or control click).
- **Dropdown**'s items can now specify `keywords` to match more search terms.
- **Extension Diagnostics** command can now be used to help finding the cause behind any issues with extensions. It displays all `Loaded Commands`, commands with `Background Refresh` enabled and latest `Events` triggered.

### 💎 Improvements

- **Menu Bar Extra** action handlers will now either wait or force a render after finishing execution, to ensure any state updates performed in the action handler have had a chance to render.
- **Menu Bar** commands now automatically refresh when their or their parent extension's preferences change.
- **OAuth**: Path-based redirect URLs are now officially supported.
- **OAuth**: ⚠️️ API methods for OAuth request creation now throw an error when used from a background command - you can check the launch type of a command to see whether authorization can be performed
- **Types**: Node and React types have been added back as optional API peer dependencies and dev dependencies to the templates, so that VS Code autocompletion works.
- **Templates**: Updated to include the utils package.
- **DevX**: Added warnings when specifying a `value` without `onChange` or when changing a Form item from controlled to uncontrolled.
- **DevX**: For starting development, the CLI does not depend on metadata attributes any more

### 🐞 Fixes

- **Forms**: The type of the `DatePicker`'s value is now `Date | null` (`null` happens when selecting `No Date`).
  ⚠️ This might cause some TypeScript errors but it will now reflect what is really happening, preventing bugs at runtime.
- Fixed an issue where `List.Item.Detail.Metadata` titles sometimes being cropped despite there being enough room.
- **Menu Bar Extra** `Item` and `Submenu` icons now change based on the system's dark / light mode, not Raycast's.
- **Forms**: Fixed a bug where the initial value for a controlled TextArea could not be deleted.
- **Forms**: Fixed the info icon and message not coming back after clearing an error on form items.
- **Forms**: Fixed updating the placeholder of the TagPicker item.
- **Empty View**: Fix an issue where an Empty View's actions would be rendered even thought the Empty View isn't.
- **OAuth**: Fixed a bug where multiple overlays could stack upon each other when OAuth was initiated from a menu bar or background launched command

## 1.39.2 - 2022-09-01

### ✨ New

- **Bundler**: You can now import wasm files and they will bundle in the extension

### 💎 Improvements

- **SVG**: Accept a percentage for rect corner radius attributes
- **Actions**: `Action.Trash` is now a Destructive Action (meaning it will show up in red)

### 🐞 Fixes

- **Metadata**: Fixes an issue where List Metadata would sometimes render Tags in the wrong position

## 1.39.0 - 2022-08-18

### ✨ New

- **List.Item.Detail.Metadata**: We've added support for new `Link` and `TagList` item types.
- **Environment**: You can now check the `mode` of the current command _(as defined in the manifest)_ _via_ `environment.commandMode`.

### 💎 Improvements

- **CLI**: The ray CLI is now code-signed
- **CLI**: We've updated esbuild to v0.14.52
- **NPM size:** is now 0.5MB instead of 25MB _(binary files for ray CLI have been moved out of the NPM package)_

### 🐞 Fixes

- **Navigation**: Top-level components can now dynamically return a different view type when used inside a navigation stack
- **Background Refresh**: Fixed an edge case where commands would run into a timeout that prevented further refreshing
- **Menu Bar Commands**: Fixed a bug where the error screen of menu bar commands would repeatedly be shown in the root search
- **Actions:** Triggering actions by _numeric shortcut / double-clicking_ could trigger wrong actions or didn't work entirely
- **Form:** `TextArea` placeholder now won't highlight markdowns if it has `enabledMarkdown`

## 1.38.3 - 2022-08-03

### 💎 Improvements

- Added debug actions to all local development commands in root search
- Menu bar commands now show an activation button in preferences

### 🐞 Fixes

- **Menu Bar Commands**: Fixed issues around hot reloading, unloading, and inconsistent action handler behavior
- **No-view Commands:** Fixed returning top-level props for commands that doesn't have arguments or drafts

## 1.38.1 - 2022-07-21

### ✨ New

- 🍫 **Menu Bar Commands (Beta)**: For a long time, Commands could only live in the Raycast window. From today, Commands can put glanceable information in the Menu Bar 💪. Check out our [new docs section](https://developers.raycast.com/api-reference/menu-bar-commands) on how to develop your first native macOS menu bar command with hot reloading 🔥.
- 🔄 **Background Refresh (Beta)**: To keep Menu Bar Commands up-to-date, we ported Background Refresh from [Script Commands](https://github.com/raycast/script-commands) to Extensions. Background Refresh is configured with a new interval option in the Extension's [manifest](https://developers.raycast.com/information/manifest) and also works for "no-view" mode commands. Read more about it in a [new docs guide](https://developers.raycast.com/information/background-refresh).
- 🪝 **Utils**: We've released new React hooks to make it faster to build extensions that follow best practices. To do this, we looked at the Extension's repository for use cases and how we can improve them. Most Extensions connect to APIs: they make network requests, show a toast to handle errors, and add caching and optimistic updates to speed up interactions. Utils are available via a [new public npm package](https://www.npmjs.com/package/@raycast/utils).
- 🤬 **Arguments**: We also ported more functionality from Script Commands. Extensions can now define arguments, which enable simple forms that live in the root search of Raycast. Arguments can be defined via the [manifest](https://developers.raycast.com/information/manifest), and their entered values are passed to the main function of a command.
- ✍️ **Subtitle Updates**: We've added a new method `updateCommandMetadata` that allows you to update the subtitle of a command in root search. Combined with Background Refresh, this is another way to present information to the user as dashboard-like items in the root search.

## 1.38.0 - 2022-07-19

### ✨ New

- **Redesign**: Along side the app's redesign, we are introducing a whole set of [new icons](https://developers.raycast.com/api-reference/user-interface/icons-and-images#icon) for you to pick to illustrate the actions in your extensions.
- **New Destructive Action:** You can now specify the `style` of an `Action` to highlight it in the Action Panel as destructive. Use it for actions where an end-user should be cautious with proceeding.

### 💎 Improvements

- **DevTools**: Turning on the "Use Node production environment" in the Advanced Preferences will also hide the debug actions. Previously it was only hiding them when there was no Action Panel specified.
- **DevTools**: The "Clear Local Storage" debug action has been renamed to "Clear Local Storage & Cache" and will clear the [Cache](https://developers.raycast.com/api-reference/cache) along side the [Local Storage](https://developers.raycast.com/api-reference/storage).
- **Dev Tools**: The "Start Development" action now quotes the extension folder path.
- **Dev Tools**: Added a new development advanced preference to keep the Raycast window always visible during development.
- **Dev Tools**: Added a new build status tooltip to the accessory icon of a development command in root search.
- **Dev Tools**: Improved the error handling for failed extension updates after invalid manifest changes; improved the error messages for general rendering errors.

### 🐞 Fixes

- `require('os').tmpdir()` will now properly return the path to a temp directory.
- Fixed a rarely occurring crash happening when using some SVGs with a path that contains an arc where the ending point is the same as the starting point.
- Forms: Fixed a bug where stored form values could get cleared after extension updates.
- Forms: Fixed inconsistent behaviour of the `onBlur` handler that could get triggered for the `Form.TextField` when the form screen is popped in a navigation stack.
- List: Fixed the updating of tooltips for list accessory items.

## 1.37.0 - 2022-06-29

### ✨ New

- **React 18**: React Suspense, `useSyncExternalStore`, etc.. A whole bunch of new features are available with the newest version of React. See the [migration guide](https://developers.raycast.com/migration/v1.37.0) for more information.
- **Quick Look:** Use the new `<Action.ToggleQuickLook />` action to show additional information with a Quick Look preview.
- **Forms:** Use the new validation feature to check if entered data is correctly formatted and show failure messages with a nice UX
- **Forms:** Drafts support - use the feature if you want Raycast to preserve non-submitted data, to provide the best experience for users
- **DevX:** Check out the new screenshot tool that takes a photo of Raycast from the best possible angle

### 💎 Improvements

- **List Accessories**: You can now pass `{date: Date}` as an accessory and it will be rendered nicely by Raycast.
- **Detail View:** Add support for `- [ ] task` and `- [x] task` in markdown views.
- **Action Panel**: Add a new `onOpen` callback on `ActionPanel.Submenu`. It can, for example, be used to lazily fetch the content of the Submenu.
- **Grid**: Add support for `ColorLike` as Grid.Item's content.
- **Forms:** New callbacks `onFocus` and `onBlur` for all the items
- **Forms:** Markdown highlighting for the `Form.TextArea`

### 🐞 Fixes

- **Misc:** Fixed a crash when using `<List>{response?.website && <List.Item title={response.website} />}</List>` and `website` is an empty string ([![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)Issue 1845](https://github.com/raycast/extensions/issues/1845)).
- **Dev Tools**: Fixed uninstalling of local development extensions via the Action Panel
- **Markdown**: Fixed rendering of transparent animated gifs in markdown
- **Forms:** Fixed an issue when entering characters with IME ([![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)Issue 739](https://github.com/raycast/extensions/issues/739)) in controlled text inputs
- **List Accessories:** Fixed the tooltip for grouped accessories; now the tooltip will be shown for the group instead of separately for the items

## 1.36.0 - 2022-06-01

### ✨ New

The `<Grid />` component's made its way to our API. It's perfect to layout media-heavy information, such as icons, images or colors. The component allows you to layout differently sized items. We designed [its API](https://developers.raycast.com/api-reference/user-interface/list) close to the `<List />` component for smooth adoption.

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/grid.webp)

### 🐞 Fixes

- Fixed the controlled mode for `Form.DatePicker`
- Fixed the dynamic appearance of form item's `info` accessory
- Fixed the OAuth logout preference not being shown for single-command extensions
- Fixed a bug where components that are pushed with the same properties values would not be updated ([![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)Issue 1843](https://github.com/raycast/extensions/issues/1843))
- Fixed a bug where updated list metadata items would cause unnecessary list reloading
- Fixed an issue with tinted, resized icons appearing blurred in some cases (e.g. Alerts)

## 1.35.0 - 2022-05-18

### ✨ New

- **List Item Metadata**: we've added a new `metadata` property to the `List.Item.Detail` component, allowing you to add structured metadata. The `metadata` property can be used together with `markdown`, in which case the detail view will be split horizontally, with the markdown being displayed in the top half and the metadata displayed in the bottom half (similar to the `File Search`, `Clipboard History` or `Search Contacts` commands). Alternatively, it can be used by itself, in which case the metadata will take up the entire height of the detail view.
- **Preferences**: We've added two new top-level methods `openExtensionPreferences` and `openCommandPreferences` that allow you to open both extension and command preferences, for example, via an Action ([![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)Issue 179](https://github.com/raycast/extensions/issues/179))

### 💎 Improvements

- Added a new development action to clear the local storage of an extension

### 🐞 Fixes

- Fixed a bug where the wrong form element onChange handler would be called initially while the form was being updated ([![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)Issue 1633](https://github.com/raycast/extensions/issues/1633))
- Fixed a bug where form elements would not be re-rendered correctly ([![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)Issue 1663](https://github.com/raycast/extensions/issues/1663))
- Fixed a bug where a fully controlled form TextField/PasswordField behaves as stateful ([![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)Issue 1093](https://github.com/raycast/extensions/issues/1093))
- Fixed `EmptyView` not being displayed when it would be reused in a navigation stack

## 1.34.0 - 2022-05-04

### 💎 Improvements

- OAuth: TokenSets are now included in the encrypted Raycast export (Raycast Preferences > Advanced > Export)
- OAuth: The convenience method `TokenSet.isExpired()` now includes some buffer time to reduce the risk of performing requests with expired access tokens

### 🐞 Fixes

- Fixed an issue where updating the search bar accessory would result in the search bar text being selected
- Forms: We've fixed some inconsistencies around form item properties and added new warnings (e.g. when `defaultValue` and `value` are set at the same time); this also fixes [![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)Issue 1104](https://github.com/raycast/extensions/issues/1104)
- Forms: Fixed an issue where updating form items would lead to unwanted scrolling; fixed the `autoFocus` property not scrolling to the focused item
- Fixed an issue with `Action.OpenWith` trying to perform a state update without checking whether it's still mounted ([![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)Issue 1495](https://github.com/raycast/extensions/issues/1495)).
- Fixed an issue where `adjustContrast` would not be respected for colored TagPicker items.

## 1.33.0 - 2022-04-20

### ✨ New

- **OAuth**: we've added a new API that enables you to authorize extensions through OAuth providers such as Google, Twitter, Dropbox or Spotify ([![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)Issue #178](https://github.com/raycast/extensions/issues/178)). The docs contain a [new detailed guide](https://developers.raycast.com/api-reference/oauth) and we've added some integration examples to the extensions repository. (Note that we currently only support OAuth 2.0 with PKCE, more on that in the [guide](https://developers.raycast.com/api-reference/oauth).)
- **Form Focus**: use the new imperative form API to programmatically focus form items. Want to make sure a particular input is focused on mount? Form items now accept an `autoFocus` prop! ([![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)Issue #66](https://github.com/raycast/extensions/issues/66))
- **Form Reset**: use the new imperative form API to reset form items' values to their initial values.
- **Form Info:** Use the new `info` prop on form items to show additional information about an item, e.g. to explain what this field is used for.
- The Raycast window opens automatically when you start a development session for an extension. You can turn the behavior off in the Advanced preferences tab.

### 💎 Improvements

- Improved detection of default editor when you open extensions from Raycast
- Improved templates for list, form and detail
- Removed `react-devtools` from `devDependencies` for newly created extensions (so that you don't have to download a big dependency that you might not use)

### 🐞 Fixes

- Fixed an issue where animated gifs would be incorrectly scaled when size attributes are specified in markdown.
- Form Checkbox now returns proper boolean values on submit

## 1.32.0 - 2022-04-06

### ✨ New

- **List Tooltips**: List items now support tooltips for the title, subtitle, icon, and each accessory item. For titles, you can use the new type `{ value: string, tooltip: string }`, for icons `{ value: Image.ImageLike, tooltip: string }`, and for accessories you just add the new property `tooltip`.
- **Animated Gifs**: the `Detail` component now renders animated gifs defined in markdown! 🎭

### 💎 Improvements

- Improved recovering the Node process after a crash and logging the error to the CLI output
- Added support for running CLI commands through `npx @raycast/api <commandName>`
- Improved the `Create Extension` command to add `README.md` and `CHANGELOG.md` files

### 🐞 Fixes

- **Detail Metadata**: Fixed toggling (showing/hiding)
- **Detail Metadata**: Fixed only one separator item getting rendered
- **Detail Metadata**: Fixed a crash when using primary or secondary colors for tag items
- **List Accessories**: Fixed rendering when using `undefined` for accessory values
- **List EmptyView**: Fixed an issue where passing a `List.EmptyView` child to a `List.Section` would treat it as a `List.Item`
- **SVG**: Fixed rendering base64 encoded SVG images
- Fixed loading when a new command is launched by hotkey while another command is open

## 1.31.0 - 2022-03-23

### ✨ New

- **Detail Metadata**: we've added a new property `metadata` to the `Detail` component; this allows you to add structured metadata that is displayed on the right side in a detail view (similar to the Linear, Asana or Jira extensions). We support types such as labels, coloured tags, links, and separators. ([![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)Issue #219](https://github.com/raycast/extensions/issues/219))
- **List Accessories**: list components can now show multiple accessory items through the new `accessories` property. (Previously you could only configure one `accessoryTitle` and `accesoryIcon`, both of which continue to work but have been marked deprecated.) Each item can be configured as text-only, icon-only, or icon + text. ([![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)Issue #72](https://github.com/raycast/extensions/issues/72))
- **List Empty View**: list components can define a new `EmptyView` that gives you control over the icon, title, description and optional actions to use when there are no items in a list. (Previously we would default to a "No results" view.) You can use the component to show a custom image and text when the search does not return results or the user is required to first perform some setup. ([![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)Issue #447](https://github.com/raycast/extensions/issues/447))

### 💎 Improvements

- **Environment**: the current theme (`"dark" | "light"`) configured via Raycast appearance preferences is now globally accessible through `environment.theme`
- **SVG**: You can now specify width and height attributes for images in markdown (`<img>` tag).
- **Dev Tools:** the "Create Extension" command lets you add categories to your extension; the categories are displayed alongside the new metadata on our revamped details page in the store.
- **Dev Tools**: added a new development action to clear the local assets cache, e.g. to render an updated list icon without having to restart Raycast. ([![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)Issue #1095](https://github.com/raycast/extensions/issues/1095))
- **Preferences**: the `required` property in manifest preferences is now optional.

### 🐞 Fixes

- Fixed the extension icon not being updated during development.
- Fixed an extension's cached icon not being cleared when updated from the store. (Note that other dynamically loaded images in the assets folder may still be cached, so if you want to enforce an update for end users you need to rename them.)
- Fixed an edge case where some search bar characters would be wrongly passed to pushed lists in a navigation stack.

## 1.30.2 - 2022-03-11

### 🐞 Fixes

- Fixed updating the list `isShowingDetail` property
- Fixed unnecessarily reloading the list detail view on search term changes

## 1.30.0 - 2022-03-09

### ✨ New

- We've added the highly requested **search bar dropdown** 🎉 ([![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)Issue #72](https://github.com/raycast/extensions/issues/72)): you can now add a dropdown component as an accessory to the search bar; the dropdown shows up in the top-right corner and can be used for filtering lists and toggling list states. (So it's a good time to remove any workarounds with actions or navigation for showing a different set of items in the list.)
- The **search bar text** 🔎 can now be programmatically updated ([![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)Issue #281](https://github.com/raycast/extensions/issues/281)) while you can still opt into built-in filtering at the same time
- **List-detail views**: list views now support a `detail` property that allows you to display a detail view on the right-hand side of list items ([![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)Issue #83](https://github.com/raycast/extensions/issues/83)) 👯‍♂️; you can use the feature to display additional content side-by-side as users scroll through the list
- Support for rendering **SVG files** 🖼️ where images are accepted ([![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)Issue #77](https://github.com/raycast/extensions/issues/77)), including in the `Detail` view's markdown
- New method `Clipboard.readText()` to read the last copied text from the system's clipboard 📋
- Added a new prop `type` to `Form.DatePicker` 📅 to control the date components asked from the user

### 💎 Improvements

- **Toast action handlers** 🍞 can now still be called if the toast outlives a dismissed extension
- Support for multiple actions of type `Action.SubmitForm` in a form's Action Panel

### 🐞 Fixes

- Fixed some flickering that could happen when using `React.memo`
- Fixed a few edge cases around Action Panels
- Fixed duplicated shortcut shown in the Action Panel's tooltip when setting the default shortcut explicitly on the primary action
- Fixed updating a `Form.Description` component

## 1.29.0 - 2022-02-23

### ✨ New

- Add 2 new Actions: `Action.CreateSnippet` and `Action.CreateQuicklink`. Use them in your extensions to provide users an option to integrate deeper with Raycast, for example, by creating a Quicklink from a frequently visited website.

### 💎 Improvements

- Various documentation fixes and improvements such as new media for UI components.
- Synchronous React state update calls are now batched, leading to less re-rendering.
- Markdown comments will now be hidden in the `Detail` view

### 🐞 Fixes

- Fixed a crash that could happen when switching between a development and store version of an extension or restarting the Node connection.
- Fixed an issue with React Developer Tools sometimes not getting opened.
- Limit the width that the `ActionPanel` can take.

## 1.28.0 - 2022-02-09

### 💎 Improvements

- Completely **revised (backwards-compatible) API** - new namespaces, better organisation, more consistency, updated templates, revamped docs. Check out the full [migration guide](https://developers.raycast.com/migration/v1.28.0) and get rid of those deprecation warnings. (At the same time, don't worry, your extension is going to work as before, even if you don't take immediate action.)
- We've **prettified the CLI output** 💅: all output is now more colourful, cleaner and easier to parse. Update the npm package to v1.28.0 to get the latest CLI for development.
- **Fallback images**: You can now specify local asset files or built-in icons that are displayed when image loading fails, for example when a remote file is missing (![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)[Issue #108](https://github.com/raycast/extensions/issues/108)); [see the docs](https://developers.raycast.com/api-reference/user-interface/icons-and-images)
- **Toasts** are now passed as argument to their action callback, so you can directly act on them in the handler function (for example, hiding them)
- **Extensions feedback:** We've added **better bug report and feature request actions** both to the store details page of an extension and to the error screen; the actions prefill some data already in the templates so that reporting issues and feature requests becomes easier for end users.

### 🐞 Bugfixes

- Fixed tag picker images and emojis not being properly displayed (![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)[Issue #493](https://github.com/raycast/extensions/issues/493))

## 1.27.1 - 2022-01-28

### 💎 Improvements

- **Preferences:** Added a new app picker preference type - useful if you want to let users customize their apps to use for opening files, folders and URLs [![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)Issue #98](https://github.com/raycast/extensions/issues/98)
- **Forms:** Added new `Form.PasswordField` that allows you to show secure text fields ([Issue #319](https://github.com/raycast/extensions/issues/319) and [![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)Issue #44](https://github.com/raycast/extensions/issues/44))
- **Forms:** Added new `Form.Description` component that allows you to show a simple label
- Added a new top-level `open` method that gives you more flexibility for opening files, folders, and URLs with default apps or specified apps, often making using an external npm package unnecessary (the built-in open action use our method under the hood)
- **Node:** added security enhancements for the managed Node runtime such as verification of the executable, configuring executable permissions, and removing unnecessary files
- **CLI:** Added more error info output to build errors
- **CLI:** Added a new `—fix` flag to the `lint` command (applies ESLint and prettier fixes)
- **Create Extension Command:** Updated the templates to include a `fix-lint` script; added prettier to devDependencies

### 🐞 Bugfixes

- **Forms:** Fixed `onChange` callback behaviour to be consistent across all components
- **Forms:** Fixed generic updates of titles for all components ([![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)Issue #687](https://github.com/raycast/extensions/issues/687))
- **Preferences:** Fixed a bug in dropdown preferences returning the defined default value, even if the default is not part of the list values
- **Preferences:** Fixed the `data` property not being treated as required for the dropdown
- **Preferences:** Fixed defined initial values not being ignored (use default only)
- **List:** Fixed same-rank items with identical names being non-deterministically ordered
- Fixed a bug with open actions causing double opening via the default and specified app
- **CLI:** Removed auto-installation of npm dependencies through the downloaded npm

## 1.27.0 - 2022-01-12

### 💎 Improvements

- **Developer Tools:** Added `Open Support Directory` action to local dev extensions
- **Developer Tools**: Removed auto-injecting of globals for enabling React Developer Tools in dev mode
- **Developer Tools**: Added `prettier` checks to CLI `lint` command
- **Documentation:** Updates and fixes

### 🐞 Bugfixes

- **Forms:** Fixed controlled updates for the `Form.TagPicker`
- **Navigation**: Fixed a bug where a programmatic pop, followed by a manual pop (e.g. ESC) could lead to wrong state (![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)[Issue #571](https://github.com/raycast/extensions/issues/571))

## 1.26.3 - 2021-12-16

### ✨ New

- New API for **Alert** views: Alerts are useful for destructive actions or actions that require user confirmation; new methods let you display our beautiful native Alert component\
  ([![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)Issue #48](https://github.com/raycast/extensions/issues/48))
- New API for **interactive Toasts**: you can now add buttons to Toasts, e.g. to give the user options for created items, to open the browser, or for any other relevant context ([![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)Issue #438](https://github.com/raycast/extensions/issues/438))
- New API for retrieving the current **Finder selection**: unlocks a couple of use cases for extensions that perform actions on selected files and folders ([![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)Issue #153](https://github.com/raycast/extensions/issues/153))

### 💎 Improvements

- Improved ranking for fuzzy search in lists with sections and keywords
- The icon of the `OpenWithAction` can now be customised
- The env var NODE_EXTRA_CA_CERTS is now being propagated so that custom certificates can be configured
- Improved the CLI error message when an entry point file from the manifest is missing ([![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)Issue #495](https://github.com/raycast/extensions/issues/495))

### 🐞 Bugfixes

- Textfields do not auto-transform certain characters such as dashes any more ([![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)Issue #491](https://github.com/raycast/extensions/issues/491) and [![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal_integrations%2Fgithub-icon.png?width=12&userId=&cache=v2)Issue #360](https://github.com/raycast/extensions/issues/360))

### ⚙️ Build Updates

- This CLI of this version contains an update of the build tool with changed (and "more compatible") heuristics around how `default` exports are handled. This means that you should double check whether `import` statements for certain npm packages need to be adjusted.\
  **Example**: `import caniuse from "caniuse-api"` has to be changed to `import * as caniuse from "caniuse-api"` because of the missing `default` export of the built `caniuse` library that has to run in a Node environment.

## 1.25.7 - 2021-11-26

### 💎 Improvements

- Keywords added to list items are now matched again by prefixes (exact matches were required previously)
- Extensions are now checked for version compatibility before updating and installation
- New and updated templates available in the "Create Extension" scaffolding command

### 🐞 Bugfixes

- Modifications to list item keywords could result in wrong list filtering
- Fixed a regression where the CLI would not automatically install dependencies when building the extension
- DatePicker form element now returns the time component when specified
- Animated toasts are now automatically dismissed when the extension is unloaded
- Forms don't accidentally trigger draft creation mode any more
- Extensions which are off by default are now correctly disabled

## 1.25.5 - 2021-11-18

### 💎 Improvements

- Full fuzzy search by default for lists using built-in filtering
- Faster list loading times
- Better default auto-layout of list item title, subtitle and accessories
- Extension support directory does not need to be explicitly created any more
- Raycast is no longer automatically brought to the foreground for failure toasts
- New default action to open a bug report on production error screens in extensions

### 🐞 Bugfixes

- Updated extension icons are now displayed without having to re-install the dev extension
- Focus is now kept on the current form element when re-rendering
- Caret does not jump to the end of the string in controlled textfields and textareas any more (one edge left that is going to be tackled in one of the next releases)
- "Disable pop to root search" developer preference is now only applied for commands that are under active development
- Documentation fixes and updates

## 1.25.4 - 2021-11-11

### 💎 Improvements

- Updating of items and submenus while the action panel is open
- Supporting all convenience actions with primary shortcut (cmd + enter) on form views
- Better error handling when the API cannot be loaded after failed app updates

### 🐞 Bugfixes

- Loading indicator in detail views when used in a navigation stack

## 1.25.2 - 2021-10-28

### 💎 Improvements

- Improved ActionPanel updating performance

### 🐞 Bugfixes

- `searchBarPlaceholder` updates when using the list in a navigation stack
- Wrong action panel actions when popping back in a navigation stack
- Empty state flickering when updating the `isLoading` property in lists
- Accessory and subtitle label truncation in lists
- Icon from assets tinting on dynamic theme changes
- Dynamic removal of form elements
- Open actions leading to Node env vars being set for the opened application
- Some extensions not getting loaded for a particular Node setup
- Local storage values being lost when extensions are automatically updated

## 1.25.1 - 2021-10-20

### 🐞 Bugfixes

- Fixed configuring `tintColor` for icons in `ActionPanel` and `Form.Dropdown`
- Fixed displaying submenu icons from local assets
- Fixed tinting of icons provided from local assets
- Fixed a crash with the `getSelectedText` function
- Fixed the main window sometimes not shown when an error is thrown from a command
- Fixed the `OpenWithAction` not working for some apps
- Fixed the list empty state not being shown in certain cases when using custom filtering
- Fixed the the topmost item not automatically being selected for custom list filtering
- Fixed the line number info in error stack traces sometimes not being correct
- Fixed an issue where installing store extension would sometimes fail
- Fixed a crash that could be caused by sending invalid codepoints from an extension
- Fixed a bug where no error would be shown when the runtime download failed
- Fixed reaching the max. call stack size when logging recursive object structures (this could happen when you console logged a React component, for example).

## 1.25.0 - 2021-10-13

### Hello World

It's happening! We're opening up our API and store for public beta.

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/changelog-hello-world.webp)

This is a big milestone for our community. We couldn't have pulled it off without our alpha testers. A massive shoutout to everybody who helped us shape the API. Now let's start building. We can't wait to see what you will come up with.


---
description: This example uses a simple form to collect data.
---

# Doppler Share Secrets

{% hint style="info" %}
The full source code of the example can be found [here](https://github.com/raycast/extensions/tree/main/extensions/doppler-share-secrets#readme). You can install the extension [here](https://www.raycast.com/thomas/doppler-share-secrets).
{% endhint %}

In this example we use a form to collect inputs from a user. To make it interesting, we use [Doppler](http://share.doppler.com) which is a service to make it easy to securely share sensitive information such as API keys or passwords.

![Example: Safely share secrets with Doppler](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/example-doppler-share-secrets.webp)

The extension has one command. The command is a simple form with a textfield for the secret, a dropdown for an expiration after views and a second dropdown for an alternate expiration after a maximum of days.

## Add form items

First, we render the static form. For this we add all the mentioned form items:

```typescript
import { Action, ActionPanel, Clipboard, Form, Icon, showToast, Toast } from "@raycast/api";
import got from "got";

export default function Command() {
  return (
    <Form>
      <Form.TextArea id="secret" title="Secret" placeholder="Enter sensitive data to securely share…" />
      <Form.Dropdown id="expireViews" title="Expire After Views" storeValue>
        <Form.Dropdown.Item value="1" title="1 View" />
        <Form.Dropdown.Item value="2" title="2 Views" />
        <Form.Dropdown.Item value="3" title="3 Views" />
        <Form.Dropdown.Item value="5" title="5 Views" />
        <Form.Dropdown.Item value="10" title="10 Views" />
        <Form.Dropdown.Item value="20" title="20 Views" />
        <Form.Dropdown.Item value="50" title="50 Views" />
        <Form.Dropdown.Item value="-1" title="Unlimited Views" />
      </Form.Dropdown>
      <Form.Dropdown id="expireDays" title="Expire After Days" storeValue>
        <Form.Dropdown.Item value="1" title="1 Day" />
        <Form.Dropdown.Item value="2" title="2 Days" />
        <Form.Dropdown.Item value="3" title="3 Days" />
        <Form.Dropdown.Item value="7" title="1 Week" />
        <Form.Dropdown.Item value="14" title="2 Weeks" />
        <Form.Dropdown.Item value="30" title="1 Month" />
        <Form.Dropdown.Item value="90" title="3 Months" />
      </Form.Dropdown>
    </Form>
  );
}
```

Both dropdowns set the `storeValue` to true. This restores the last selected value when the command is opened again. This option is handy when your users select the same options often. In this case, we assume that users want to keep the expiration settings persisted.

## Submit form values

Now that we have the form, we want to collect the inserted values, send them to Doppler and copy the URL that allows us to share the information securely. For this, we create a new action:

```tsx
function ShareSecretAction() {
  async function handleSubmit(values: { secret: string; expireViews: number; expireDays: number }) {
    if (!values.secret) {
      showToast({
        style: Toast.Style.Failure,
        title: "Secret is required",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Sharing secret",
    });

    try {
      const { body } = await got.post("https://api.doppler.com/v1/share/secrets/plain", {
        json: {
          secret: values.secret,
          expire_views: values.expireViews,
          expire_days: values.expireDays,
        },
        responseType: "json",
      });

      await Clipboard.copy((body as any).authenticated_url);

      toast.style = Feedback.Toast.Style.Success;
      toast.title = "Shared secret";
      toast.message = "Copied link to clipboard";
    } catch (error) {
      toast.style = Feedback.Toast.Style.Failure;
      toast.title = "Failed sharing secret";
      toast.message = String(error);
    }
  }

  return <Action.SubmitForm icon={Icon.Upload} title="Share Secret" onSubmit={handleSubmit} />;
}
```

Let's break this down:

- The `<ShareSecretAction>` returns an [`<Action.SubmitForm>`](../api-reference/user-interface/actions.md#action.submitform).
- The `handleSubmit()` gets called when the form is submitted with it's values.
  - First we check if the user entered a secret. If not, we show a toast.
  - Then we show a toast to hint that there is a network call in progress to share the secret.
  - We call [Doppler's API](https://docs.doppler.com/reference/share-secret) with the form values
    - If the network response succeeds, we copy the authenticated URL to the clipboard and show a success toast.
    - If the network response fails, we show a failure toast with additional information about the failure.

## Wire it up

The last step is to add the `<ShareSecretAction>` to the form:

```typescript
import { Action, ActionPanel, Clipboard, Form, Icon, showToast, Toast } from "@raycast/api";
import got from "got";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <ShareSecretAction />
        </ActionPanel>
      }
    >
      <Form.TextArea id="secret" title="Secret" placeholder="Enter sensitive data to securely share…" />
      <Form.Dropdown id="expireViews" title="Expire After Views" storeValue>
        <Form.Dropdown.Item value="1" title="1 View" />
        <Form.Dropdown.Item value="2" title="2 Views" />
        <Form.Dropdown.Item value="3" title="3 Views" />
        <Form.Dropdown.Item value="5" title="5 Views" />
        <Form.Dropdown.Item value="10" title="10 Views" />
        <Form.Dropdown.Item value="20" title="20 Views" />
        <Form.Dropdown.Item value="50" title="50 Views" />
        <Form.Dropdown.Item value="-1" title="Unlimited Views" />
      </Form.Dropdown>
      <Form.Dropdown id="expireDays" title="Expire After Days" storeValue>
        <Form.Dropdown.Item value="1" title="1 Day" />
        <Form.Dropdown.Item value="2" title="2 Days" />
        <Form.Dropdown.Item value="3" title="3 Days" />
        <Form.Dropdown.Item value="7" title="1 Week" />
        <Form.Dropdown.Item value="14" title="2 Weeks" />
        <Form.Dropdown.Item value="30" title="1 Month" />
        <Form.Dropdown.Item value="90" title="3 Months" />
      </Form.Dropdown>
    </Form>
  );
}

function ShareSecretAction() {
  async function handleSubmit(values: { secret: string; expireViews: number; expireDays: number }) {
    if (!values.secret) {
      showToast({
        style: Toast.Style.Failure,
        title: "Secret is required",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Sharing secret",
    });

    try {
      const { body } = await got.post("https://api.doppler.com/v1/share/secrets/plain", {
        json: {
          secret: values.secret,
          expire_views: values.expireViews,
          expire_days: values.expireDays,
        },
        responseType: "json",
      });

      await Clipboard.copy((body as any).authenticated_url);

      toast.style = Toast.Style.Success;
      toast.title = "Shared secret";
      toast.message = "Copied link to clipboard";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed sharing secret";
      toast.message = String(error);
    }
  }

  return <Action.SubmitForm icon={Icon.Upload} title="Share Secret" onSubmit={handleSubmit} />;
}
```

And there you go. A simple form to enter a secret and get a URL that you can share with others that will "destroy itself" accordingly to your preferences. As next steps, you could use the `<PasteAction>` to paste the link directly to front-most application or add another action that clears the form and let's you create another shareable link.


---
description: This example shows how to show an RSS feed as a List.
---

# Hacker News

{% hint style="info" %}
The source code of the example can be found [here](https://github.com/raycast/extensions/tree/main/extensions/hacker-news#readme). You can install it [here](https://www.raycast.com/thomas/hacker-news).
{% endhint %}

Who doesn't like a good morning read on [Hacker News](https://news.ycombinator.com) with a warm coffee?! In this example, we create a simple list with the top stories on the frontpage.

![Example: Read frontpage of Hacker News](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/example-hacker-news.webp)

## Load top stories

First, let's get the latest top stories. For this we use a [RSS feed](https://hnrss.org):

```typescript
import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import Parser from "rss-parser";

const parser = new Parser();

interface State {
  items?: Parser.Item[];
  error?: Error;
}

export default function Command() {
  const [state, setState] = useState<State>({});

  useEffect(() => {
    async function fetchStories() {
      try {
        const feed = await parser.parseURL("https://hnrss.org/frontpage?description=0&count=25");
        setState({ items: feed.items });
      } catch (error) {
        setState({
          error: error instanceof Error ? error : new Error("Something went wrong"),
        });
      }
    }

    fetchStories();
  }, []);

  console.log(state.items); // Prints stories

  return <List isLoading={!state.items && !state.error} />;
}
```

Breaking this down:

- We use a third-party dependency to parse the RSS feed and intially the parser.
- We define our command state as a TypeScript interface.
- We use [React's `useEffect`](https://reactjs.org/docs/hooks-effect.html) hook to parse the RSS feed after the command did mount.
- We print the top stories to the console.
- We render a list and show the loading indicator as long as we load the stories.

## Render stories

Now that we got the data from Hacker News, we want to render the stories. For this, we create a new React component and a few helper functions that render a story:

```typescript
function StoryListItem(props: { item: Parser.Item; index: number }) {
  const icon = getIcon(props.index + 1);
  const points = getPoints(props.item);
  const comments = getComments(props.item);

  return (
    <List.Item
      icon={icon}
      title={props.item.title ?? "No title"}
      subtitle={props.item.creator}
      accessories={[{ text: `👍 ${points}` }, { text: `💬  ${comments}` }]}
    />
  );
}

const iconToEmojiMap = new Map<number, string>([
  [1, "1️⃣"],
  [2, "2️⃣"],
  [3, "3️⃣"],
  [4, "4️⃣"],
  [5, "5️⃣"],
  [6, "6️⃣"],
  [7, "7️⃣"],
  [8, "8️⃣"],
  [9, "9️⃣"],
  [10, "🔟"],
]);

function getIcon(index: number) {
  return iconToEmojiMap.get(index) ?? "⏺";
}

function getPoints(item: Parser.Item) {
  const matches = item.contentSnippet?.match(/(?<=Points:\s*)(\d+)/g);
  return matches?.[0];
}

function getComments(item: Parser.Item) {
  const matches = item.contentSnippet?.match(/(?<=Comments:\s*)(\d+)/g);
  return matches?.[0];
}
```

To give the list item a nice look, we use a simple number emoji as icon, add the creator's name as subtitle and the points and comments as accessory title. Now we can render the `<StoryListItem>`:

```typescript
export default function Command() {
  const [state, setState] = useState<State>({});

  // ...

  return (
    <List isLoading={!state.items && !state.error}>
      {state.items?.map((item, index) => (
        <StoryListItem key={item.guid} item={item} index={index} />
      ))}
    </List>
  );
}
```

## Add actions

When we select a story in the list, we want to be able to open it in the browser and also copy it's link so that we can share it in our watercooler Slack channel. For this, we create a new React Component:

```typescript
function Actions(props: { item: Parser.Item }) {
  return (
    <ActionPanel title={props.item.title}>
      <ActionPanel.Section>
        {props.item.link && <Action.OpenInBrowser url={props.item.link} />}
        {props.item.guid && <Action.OpenInBrowser url={props.item.guid} title="Open Comments in Browser" />}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {props.item.link && (
          <Action.CopyToClipboard
            content={props.item.link}
            title="Copy Link"
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
```

The component takes a story and renders an [`<ActionPanel>`](../api-reference/user-interface/action-panel.md) with our required actions. We add the actions to the `<StoryListItem>`:

```typescript
function StoryListItem(props: { item: Parser.Item; index: number }) {
  // ...

  return (
    <List.Item
      icon={icon}
      title={props.item.title ?? "No title"}
      subtitle={props.item.creator}
      accessories={[{ text: `👍 ${points}` }, { text: `💬  ${comments}` }]}
      // Wire up actions
      actions={<Actions item={props.item} />}
    />
  );
}
```

## Handle errors

Lastly, we want to be a good citizen and handle errors appropriately to guarantee a smooth experience. We'll show a toast whenever our network request fails:

```typescript
export default function Command() {
  const [state, setState] = useState<State>({});

  // ...

  if (state.error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed loading stories",
      message: state.error.message,
    });
  }

  // ...
}
```

## Wrapping up

That's it, you have a working extension to read the frontpage of Hacker News. As next steps, you can add another command to show the jobs feed or add an action to copy a Markdown formatted link.


---
description: This example shows how to bundle multiple scripts into a single extension.
---

# Spotify Controls

{% hint style="info" %}
The source code of the example can be found [here](https://github.com/raycast/extensions/tree/main/extensions/spotify-controls#readme). You can install it [here](https://www.raycast.com/thomas/spotify-controls).
{% endhint %}

This example shows how to build commands that don't show a UI in Raycast. This type of command is useful for interactions with other apps such as skipping songs in Spotify or just simply running some scripts that don't need visual confirmation.

![Example: Control the Spotify macOS app from Raycast](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/example-spotify-controls.webp)

## Control Spotify macOS app

Spotify's macOS app supports AppleScript. This is great to control the app without opening it. For this, we use the [`run-applescript`](https://www.npmjs.com/package/run-applescript) package. Let's start by toggling play pause:

```typescript
import { runAppleScript } from "run-applescript";

export default async function Command() {
  await runAppleScript('tell application "Spotify" to playpause');
}
```

## Close Raycast main window

When performing this command, you'll notice that Raycast toggles the play pause state of the Spotify macOS app but the Raycast main window stays open. Ideally the window closes after you run the command. Then you can carry on with what you did before.

Here is how you can close the main window:

```typescript
import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async function Command() {
  await closeMainWindow();
  await runAppleScript('tell application "Spotify" to playpause');
}
```

Notice that we call the `closeMainWindow` function before running the AppleScript. This makes the command feel snappier.

With less than 10 lines of code, you executed a script and controlled the UI of Raycast. As a next step you could add more commands to skip a track.


---
description: This example show how to use lists in combination with forms.
---

# Todo List

{% hint style="info" %}
The source code of the example can be found [here](https://github.com/raycast/extensions/tree/main/examples/todo-list#readme).
{% endhint %}

What's an example section without a todo list?! Let's put one together in Raycast. This example will show how to render a list, navigate to a form to create a new element and update the list.

![Example: A simple todo list](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/example-todo-list.webp)

## Render todo list

Let's start with a set of todos and simply render them as a list in Raycast:

```typescript
import { List } from "@raycast/api";
import { useState } from "react";

interface Todo {
  title: string;
  isCompleted: boolean;
}

export default function Command() {
  const [todos, setTodos] = useState<Todo[]>([
    { title: "Write a todo list extension", isCompleted: false },
    { title: "Explain it to others", isCompleted: false },
  ]);

  return (
    <List>
      {todos.map((todo, index) => (
        <List.Item key={index} title={todo.title} />
      ))}
    </List>
  );
}
```

For this we define a TypeScript interface to describe out Todo with a `title` and a `isCompleted` flag that we use later to complete the todo. We use [React's `useState` hook](https://reactjs.org/docs/hooks-state.html) to create a local state of our todos. This allows us to update them later and the list will get re-rendered. Lastly we render a list of all todos.

## Create a todo

A static list of todos isn't that much fun. Let's create new ones with a form. For this, we create a new React component that renders the form:

```typescript
function CreateTodoForm(props: { onCreate: (todo: Todo) => void }) {
  const { pop } = useNavigation();

  function handleSubmit(values: { title: string }) {
    props.onCreate({ title: values.title, isCompleted: false });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Todo" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" />
    </Form>
  );
}

function CreateTodoAction(props: { onCreate: (todo: Todo) => void }) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Create Todo"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<CreateTodoForm onCreate={props.onCreate} />}
    />
  );
}
```

The `<CreateTodoForm>` shows a single text field for the title. When the form is submitted, it calls the `onCreate` callback and closes itself.

![Create todo form](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/example-create-todo.webp)

To use the action, we add it to the `<List>` component. This makes the action available when the list is empty which is exactly what we want to create our first todo.

```typescript
export default function Command() {
  const [todos, setTodos] = useState<Todo[]>([]);

  function handleCreate(todo: Todo) {
    const newTodos = [...todos, todo];
    setTodos(newTodos);
  }

  return (
    <List
      actions={
        <ActionPanel>
          <CreateTodoAction onCreate={handleCreate} />
        </ActionPanel>
      }
    >
      {todos.map((todo, index) => (
        <List.Item key={index} title={todo.title} />
      ))}
    </List>
  );
}
```

## Complete a todo

Now that we can create new todos, we also want to make sure that we can tick off something on our todo list. For this, we create a `<ToggleTodoAction>` that we assign to the `<List.Item>`:

```typescript
export default function Command() {
  const [todos, setTodos] = useState<Todo[]>([]);

  // ...

  function handleToggle(index: number) {
    const newTodos = [...todos];
    newTodos[index].isCompleted = !newTodos[index].isCompleted;
    setTodos(newTodos);
  }

  return (
    <List
      actions={
        <ActionPanel>
          <CreateTodoAction onCreate={handleCreate} />
        </ActionPanel>
      }
    >
      {todos.map((todo, index) => (
        <List.Item
          key={index}
          icon={todo.isCompleted ? Icon.Checkmark : Icon.Circle}
          title={todo.title}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <ToggleTodoAction todo={todo} onToggle={() => handleToggle(index)} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ToggleTodoAction(props: { todo: Todo; onToggle: () => void }) {
  return (
    <Action
      icon={props.todo.isCompleted ? Icon.Circle : Icon.Checkmark}
      title={props.todo.isCompleted ? "Uncomplete Todo" : "Complete Todo"}
      onAction={props.onToggle}
    />
  );
}
```

In this case we added the `<ToggleTodoAction>` to the list item. By doing this we can use the `index` to toggle the appropriate todo. We also added an icon to our todo that reflects the `isCompleted` state.

## Delete a todo

Similar to toggling a todo, we also add the possibility to delete one. You can follow the same steps and create a new `<DeleteTodoAction>` and add it to the `<List.Item>`.

```typescript
export default function Command() {
  const [todos, setTodos] = useState<Todo[]>([]);

  // ...

  function handleDelete(index: number) {
    const newTodos = [...todos];
    newTodos.splice(index, 1);
    setTodos(newTodos);
  }

  return (
    <List
      actions={
        <ActionPanel>
          <CreateTodoAction onCreate={handleCreate} />
        </ActionPanel>
      }
    >
      {todos.map((todo, index) => (
        <List.Item
          key={index}
          icon={todo.isCompleted ? Icon.Checkmark : Icon.Circle}
          title={todo.title}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <ToggleTodoAction todo={todo} onToggle={() => handleToggle(index)} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <CreateTodoAction onCreate={handleCreate} />
                <DeleteTodoAction onDelete={() => handleDelete(index)} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// ...

function DeleteTodoAction(props: { onDelete: () => void }) {
  return (
    <Action
      icon={Icon.Trash}
      title="Delete Todo"
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={props.onDelete}
    />
  );
}
```

We also gave the `<DeleteTodoAction>` a keyboard shortcut. This way users can delete todos quicker. Additionally, we also added the `<CreateTodoAction>` to the `<List.Item>`. This makes sure that users can also create new todos when there are some already.

Finally, our command looks like this:

```typescript
import { Action, ActionPanel, Form, Icon, List, useNavigation } from "@raycast/api";
import { useState } from "react";

interface Todo {
  title: string;
  isCompleted: boolean;
}

export default function Command() {
  const [todos, setTodos] = useState<Todo[]>([
    { title: "Write a todo list extension", isCompleted: false },
    { title: "Explain it to others", isCompleted: false },
  ]);

  function handleCreate(todo: Todo) {
    const newTodos = [...todos, todo];
    setTodos(newTodos);
  }

  function handleToggle(index: number) {
    const newTodos = [...todos];
    newTodos[index].isCompleted = !newTodos[index].isCompleted;
    setTodos(newTodos);
  }

  function handleDelete(index: number) {
    const newTodos = [...todos];
    newTodos.splice(index, 1);
    setTodos(newTodos);
  }

  return (
    <List
      actions={
        <ActionPanel>
          <CreateTodoAction onCreate={handleCreate} />
        </ActionPanel>
      }
    >
      {todos.map((todo, index) => (
        <List.Item
          key={index}
          icon={todo.isCompleted ? Icon.Checkmark : Icon.Circle}
          title={todo.title}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <ToggleTodoAction todo={todo} onToggle={() => handleToggle(index)} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <CreateTodoAction onCreate={handleCreate} />
                <DeleteTodoAction onDelete={() => handleDelete(index)} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function CreateTodoForm(props: { onCreate: (todo: Todo) => void }) {
  const { pop } = useNavigation();

  function handleSubmit(values: { title: string }) {
    props.onCreate({ title: values.title, isCompleted: false });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Todo" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" />
    </Form>
  );
}

function CreateTodoAction(props: { onCreate: (todo: Todo) => void }) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Create Todo"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<CreateTodoForm onCreate={props.onCreate} />}
    />
  );
}

function ToggleTodoAction(props: { todo: Todo; onToggle: () => void }) {
  return (
    <Action
      icon={props.todo.isCompleted ? Icon.Circle : Icon.Checkmark}
      title={props.todo.isCompleted ? "Uncomplete Todo" : "Complete Todo"}
      onAction={props.onToggle}
    />
  );
}

function DeleteTodoAction(props: { onDelete: () => void }) {
  return (
    <Action
      icon={Icon.Trash}
      title="Delete Todo"
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={props.onDelete}
    />
  );
}
```

And that's a wrap. You created a todo list in Raycast, it's that easy. As next steps, you could extract the `<CreateTodoForm>` into a separate command. Then you can create todos also from the root search of Raycast and can even assign a global hotkey to open the form. Also, the todos aren't persisted. If you close the command and reopen it, they are gone. To persist, you can use the [storage](../api-reference/storage.md) or [write it to disc](../api-reference/environment.md#environment).


---
description: Answers to the most frequently asked questions.
---

# FAQ

<details>

<summary>What's the difference between <a href="https://github.com/raycast/script-commands">script commands</a> and extensions?</summary>

Script commands were the first way to extend Raycast. They are a simple way to execute a shell script and show some limited output in Raycast. Extensions are our next iteration to extend Raycast. While scripts can be written in pretty much any scripting language, extensions are written in TypeScript. They can show rich user interfaces like lists and forms but can also be "headless" and just run a simple script.

Extensions can be shared with our community via our Store. This makes them easy to discover and use for not so technical folks that don't have homebrew or other shell integrations on their Mac.

</details>

<details>

<summary>Why can I not use <code>react-dom</code>?</summary>

Even though you write JS/TS code, everything is rendered natively in Raycast. There isn't any HTML or CSS involved. Therefore you don't need the DOM-specific methods that the `react-dom` package provides.

Instead, we implemented a custom [reconciler](https://reactjs.org/docs/reconciliation.html) that converts your React component tree to a render tree that Raycast understands. The render tree is used natively to construct a view hierarchy that is backed by [Apple's AppKit](https://developer.apple.com/documentation/appkit/). This is similar to how [React Native](https://reactnative.dev) works.

</details>

<details>

<summary>Can I import ESM packages in my extension?</summary>

Yes, but you need to convert your extension to ESM.

Quick steps:

- Make sure you are using TypeScript 4.7 or later.
- Add `"type": "module"` to your package.json.
- Add `"module": "node16", "moduleResolution": "node16"` to your tsconfig.json.
- Use only full relative file paths for imports: `import x from '.';` → `import x from './index.js';`.
- Remove `namespace` usage and use `export` instead.
- Use the [`node:` protocol](https://nodejs.org/api/esm.html#esm_node_imports) for Node.js built-in imports.
- **You must use a `.js` extension in relative imports even though you're importing `.ts` files.**

</details>


---
description: Tips to guarantee a good user experience for your extensions.
---

# Best Practices

## General

### Handle errors

Network requests can fail, permissions to files can be missing… More generally, errors happen. By default, we handle every unhandled exception or unresolved Promise and show error screens. However, you should handle the "expected" error cases for your command. You should aim not to disrupt the user's flow just because something went wrong. For example, if a network request fails but you can read the cache, show the cache. A user might not need the fresh data straight away. In most cases, it's best to show a `Toast` with information about the error.

Here is an example of how to show a toast for an error:

```typescript
import { Detail, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

export default function Command() {
  const [error, setError] = useState<Error>();

  useEffect(() => {
    setTimeout(() => {
      setError(new Error("Booom 💥"));
    }, 1000);
  }, []);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });
    }
  }, [error]);

  return <Detail markdown="Example for proper error handling" />;
}
```

### Handle runtime dependencies

Ideally, your extension doesn't depend on any runtime dependencies. In reality, sometimes locally installed apps or CLIs are required to perform functionality. Here are a few tips to guarantee a good user experience:

- If a command requires a runtime dependency to run (e.g. an app that needs to be installed by the user), show a helpful message.
  - If your extension is tightly coupled to an app, f.e. searching tabs in Safari or using AppleScript to control Spotify, checks don't always have to be strict because users most likely don't install the extension without having the dependency installed locally.
- If only some functionality of your extension requires the runtime dependency, consider making this functionality only available if the dependency is installed. Typically, this is the best case for [actions](terminology.md#action), e.g. to open a URL in the desktop app instead of the browser.

### Show loading indicator

When commands need to load big data sets, it's best to inform the user about this. To keep your command snappy, it's important to render a React component as quickly as possible.

You can start with an empty list or a static form and then load the data to fill the view. To make the user aware of the loading process, you can use the `isLoading` prop on all top-level components, e.g. [`<Detail>`](../api-reference/user-interface/detail.md), [`<Form>`](../api-reference/user-interface/form.md), [`<Grid>`](../api-reference/user-interface/grid.md), or [`<List>`](../api-reference/user-interface/list.md).

Here is an example to show the loading indicator in a list:

```typescript
import { List } from "@raycast/api";
import { useEffect, useState } from "react";

export default function Command() {
  const [items, setItems] = useState<string[]>();

  useEffect(() => {
    setTimeout(() => {
      setItems(["Item 1", "Item 2", "Item 3"]);
    }, 1000);
  }, []);

  return (
    <List isLoading={items === undefined}>
      {items?.map((item, index) => (
        <List.Item key={index} title={item} />
      ))}
    </List>
  );
}
```

---

## Forms

### Use Forms Validation

Before submitting data, it is important to ensure all required form controls are filled out, in the correct format.

In Raycast, validation can be fully controlled from the API. To keep the same behavior as we have natively, the proper way of usage is to validate a `value` in the `onBlur` callback, update the `error` of the item and keep track of updates with the `onChange` callback to drop the `error` value. The [useForm](../utils-reference/react-hooks/useForm.md) utils hook nicely wraps this behaviour and is the recommended way to do deal with validations.

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/form-validation.webp)

{% hint style="info" %}
Keep in mind that if the Form has any errors, the [`Action.SubmitForm`](../api-reference/user-interface/actions.md#action.submitform) `onSubmit` callback won't be triggered.
{% endhint %}

{% tabs %}

{% tab title="FormValidationWithUtils.tsx" %}

```tsx
import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";

interface SignUpFormValues {
  name: string;
  password: string;
}

export default function Command() {
  const { handleSubmit, itemProps } = useForm<SignUpFormValues>({
    onSubmit(values) {
      showToast({
        style: Toast.Style.Success,
        title: "Yay!",
        message: `${values.name} account created`,
      });
    },
    validation: {
      name: FormValidation.Required,
      password: (value) => {
        if (value && value.length < 8) {
          return "Password must be at least 8 symbols";
        } else if (!value) {
          return "The item is required";
        }
      },
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Full Name" placeholder="Tim Cook" {...itemProps.name} />
      <Form.PasswordField title="New Password" {...itemProps.password} />
    </Form>
  );
}
```

{% endtab %}

{% tab title="FormValidationWithoutUtils.tsx" %}

```typescript
import { Form } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [nameError, setNameError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();

  function dropNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  function dropPasswordErrorIfNeeded() {
    if (passwordError && passwordError.length > 0) {
      setPasswordError(undefined);
    }
  }

  return (
    <Form>
      <Form.TextField
        id="nameField"
        title="Full Name"
        placeholder="Tim Cook"
        error={nameError}
        onChange={dropNameErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setNameError("The field should't be empty!");
          } else {
            dropNameErrorIfNeeded();
          }
        }}
      />
      <Form.PasswordField
        id="password"
        title="New Password"
        error={passwordError}
        onChange={dropPasswordErrorIfNeeded}
        onBlur={(event) => {
          const value = event.target.value;
          if (value && value.length > 0) {
            if (!validatePassword(value)) {
              setPasswordError("Password should be at least 8 characters!");
            } else {
              dropPasswordErrorIfNeeded();
            }
          } else {
            setPasswordError("The field should't be empty!");
          }
        }}
      />
      <Form.TextArea id="bioTextArea" title="Add Bio" placeholder="Describe who you are" />
      <Form.DatePicker id="birthDate" title="Date of Birth" />
    </Form>
  );
}

function validatePassword(value: string): boolean {
  return value.length >= 8;
}
```

{% endtab %}

{% endtabs %}


# Tools

Raycast provides several tools to smoothen your experience when building extensions:

- [`Manage Extensions` Command](./manage-extensions-command.md) _- A Raycast command to manage your extensions, add new command, etc._
- [CLI](./cli.md) _- A CLI to build, develop, and lint your extension_
- [ESLint](./eslint.md) _- An ESLint configuration helping you follow best practices as you build your extension_
- [VS Code (community tool)](./vscode.md) _- A VS Code extension to enhance your development experience_


---
description: The Raycast CLI allows you to build, develop, and lint your extension.
---

# CLI

The CLI is part of the `@raycast/api` package and is automatically installed in your extension directory during setup. To get a list of the available CLI commands, run the following command inside your extension directory:

```bash
 npx ray -h
```

## Build

`npx ray build` creates an optimized production build of your extension for distribution. This command is used by our CI to publish your extension to the store.

You can use `npx ray build -e dist` to validate that your extension builds properly.

## Development

`npx ray develop` starts your extension in development mode. The mode includes the following:

- Extension shows up at the top of the root search for quick access
- Commands get automatically reloaded when you save your changes (you can toggle auto-reloading via Raycast Preferences > Advanced > "Auto-reload on save")
- Error overlays include detailed stack traces for faster debugging
- Log messages are displayed in the terminal
- Status indicator is visible in the navigation title of the command to signal build errors
- Imports the extension to Raycast if it wasn't before

## Lint

`npx ray lint` runs [ESLint](http://eslint.org) for all files in the `src` directory.

## Migrate

`npx ray migrate` [migrates](../../migration/README.md) your extension to the latest version of the `@raycast/api`.

## Publish

`npx ray publish` verifies, builds, and publishes an extension.

If the extension is private (eg. has an `owner` and no public `access`), it will be published to the organization's private store. This command is only available to users that are part of that organization. Learn more about it [here](../../teams/getting-started.md).


# ESLint

Raycast makes it easy to lint your extensions using the CLI's lint command (`ray lint`).

Raycast provides by default an [opinionated ESLint configuration](https://github.com/raycast/eslint-config/blob/main/index.js) that includes everything you need to lint your Raycast extensions. The default configuration is as simple as this:

```json
{ 
  "root": true,
  "extends": [
    "@raycast"
  ]
}
```

It abstracts away the different ESLint dependencies used for Raycast extensions and includes different rule-sets.

It also includes Raycast's own ESLint plugin rule-set that makes it easier for you to follow best practices when building extension. For example, there's a [rule](https://github.com/raycast/eslint-plugin/blob/main/docs/rules/prefer-title-case.md) helping you follow the Title Case convention for `Action` components.

You can check Raycast's ESLint plugin rules directly on the [repository documentation](https://github.com/raycast/eslint-plugin#rules).

## Customization

You're free to turn on/off rules or add new plugins as you see fit for your extensions. For example, you could add the rule [`@raycast/prefer-placeholders`](https://github.com/raycast/eslint-plugin/blob/main/docs/rules/prefer-placeholders.md) for your extension:


```json
{
  "root": true,
  "extends": [
    "@raycast"
  ],
  "rules": {
    "@raycast/prefer-placeholders": "warn"
  }
}
```

## Migration

Starting with version 1.48.8, the ESLint configuration is included automatically when creating a new extension using the `Create Extension` command. If your extension was created before this version, you can migrate following the steps outlined on the [v1.48.8](https://developers.raycast.com/migration/v1.48.8) page.

---
description: A Raycast command to manage your extensions, add new commands or attachments, etc.
---

# `Manage Extensions` Command

Raycast provides a built-in command to manage your extensions.

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/manage-extensions.webp)

For each extensions, there are a few actions to manage them.

## Add New Command

One such action is the `Add New Command` action.

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/add-new-command.webp)

It will prompt you for the information about the new command before updating the manifest of the extension and creating the file for you based on the template you selected.


# VS Code (community tool)

You can enhance your VS Code development experience by installing the [Raycast extension in the marketplace](https://marketplace.visualstudio.com/items?itemName=tonka3000.raycast). Here's a list of features provided by the extension:

- IntelliSense for image assets
- A tree view for easier navigation (commands and preferences)
- VS Code commands for creating new commands and preferences
- The possibility to attach a Node.js debugger
- VS Code commands for `ray` operations like `build`, `dev`, `lint`, or `fix-lint`


---
description: Understand the file structure of an extension.
---

# File Structure

An extension consists of at least an entry point file (e.g. `src/index.ts`) and a `package.json` manifest file. We add a few more support files when scaffolding an extension to streamline development with modern JavaScript tooling.

The typical directory structure of a newly created extension looks like this:

```bash
extension
├── .eslintrc.json
├── .prettierrc
├── assets
│   └── icon.png
├── node_modules
├── package-lock.json
├── package.json
├── src
│   ├── command.tsx
└── tsconfig.json
```

The directory contains all source files, assets, and a few support files. Let's go over each of them:

## Sources

Put all your source files into the `src` folder. We recommend using TypeScript as a programming language. Our API is fully typed, which helps you catch errors at compile time rather than runtime. `ts`, `tsx`, `js` and `jsx` are supported as file extensions. As a rule of thumb, use `tsx` or `jsx` for commands with a UI.

An extension consists of at least an entry point file (e.g. `src/command.ts`) per command and a `package.json` manifest file holding metadata about the extension, its commands, and its tools. The format of the manifest file is very similar to [that of npm packages](https://docs.npmjs.com/cli/v7/configuring-npm/package-json). In addition to some of the standard properties, there are some [additional properties](./manifest.md), in particular, the `commands` properties which describes the entry points exposed by the extension.

Each command has a property `name` that maps to its main entry point file in the `src` folder. For example, a command with the name `create` in the `package.json` file, maps to the file `src/create{.ts,.tsx,.js,.jsx}`.

## Assets

The optional `assets` folder can contain icons that will be packaged into the extension archive. All bundled assets can be referenced at runtime. Additionally, icons can be used in the `package.json` as extension or command icons.

## Support files

The directory contains a few more files that setup common JavaScript tooling:

- **.eslintrc.json** describes rules for [ESLint](https://eslint.org), which you can run with `npm run lint`. It has recommendations for code style and best practices. Usually, you don't have to edit this file.
- **.prettierrc** contains default rules for [Prettier](https://prettier.io) to format your code. We recommend to setup the [VS Code extension](https://prettier.io/docs/en/editors.html#visual-studio-code) to keep your code pretty automatically.
- **node_modules** contains all installed dependencies. You shouldn't make any manual changes to this folder.
- **package-lock.json** is a file generated by npm to install your dependencies. You shouldn't make any manual changes to this file.
- **package.json** is the [manifest file](./manifest.md) containing metadata about your extension such as its title, the commands, and its dependencies.
- **tsconfig.json** configures your project to use TypeScript. Most likely, you don't have to edit this file.


# Lifecycle

A command is typically launched, runs for a while, and then is unloaded.

## Launch

When a command is launched in Raycast, the command code is executed right away. If the extension exports a default function, this function will automatically be called. If you return a React component in the exported default function, it will automatically be rendered as the root component. For commands that don't need a user interface (`mode` property set to "`no-view"` in the manifest), you can export an async function and perform API methods using async/await.

{% tabs %}
{% tab title="View Command" %}

```typescript
import { Detail } from "@raycast/api";

// Returns the main React component for a view command
export default function Command() {
  return <Detail markdown="# Hello" />;
}
```

{% endtab %}

{% tab title="No-View Command" %}

```typescript
import { showHUD } from "@raycast/api";

// Runs async. code in a no-view command
export default async function Command() {
  await showHUD("Hello");
}
```

{% endtab %}
{% endtabs %}

There are different ways to launch a command:

- The user searches for the command in the root search and executes it.
- The user registers an alias for the command and presses it.
- Another command launches the command _via_ [`launchCommand`](../../api-reference/command.md#launchcommand).
- The command was launched in the [background](./background-refresh.md).
- A [Form's Draft](../../api-reference/user-interface/form.md#drafts) was saved and the user executes it.
- A user registers the command as a [fallback command](https://manual.raycast.com/fallback-commands) and executes it when there are no results in the root search.
- A user clicks a [Deeplink](./deeplinks.md)

Depending on how the command was launched, different arguments will be passed to the exported default function.

```typescript
import { Detail, LaunchProps } from "@raycast/api";

// Access the different launch properties via the argument passed to the function
export default function Command(props: LaunchProps) {
  return <Detail markdown={props.fallbackText || "# Hello"} />;
}
```

### LaunchProps

<InterfaceTableFromJSDoc name="LaunchProps" />

## Unloading

When the command is unloaded (typically by popping back to root search for view commands or after the script finishes for no-view commands), Raycast unloads the entire command from memory. Note that there are memory limits for commands, and if those limits are exceeded, the command gets terminated, and users will see an error message.


# Arguments

Raycast supports arguments for your commands so that users can enter values right from Root Search before opening the command.

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/arguments.webp)

Arguments are configured in the [manifest](../manifest.md#argument-properties) per command.

{% hint style="info" %}

- **Maximum number of arguments:** 3 (if you have a use case that requires more, please let us know via feedback or in the [Slack community](https://www.raycast.com/community))
- The order of the arguments specified in the manifest is important and is reflected by the fields shown in Root Search. To provide a better UX, put the required arguments before the optional ones.

{% endhint %}

## Example

Let's say we want a command with three arguments. Its `package.json` will look like this:

```json
{
  "name": "arguments",
  "title": "API Arguments",
  "description": "Example of Arguments usage in the API",
  "icon": "command-icon.png",
  "author": "raycast",
  "license": "MIT",
  "commands": [
    {
      "name": "my-command",
      "title": "Arguments",
      "subtitle": "API Examples",
      "description": "Demonstrates usage of arguments",
      "mode": "view",
      "arguments": [
        {
          "name": "title",
          "placeholder": "Title",
          "type": "text",
          "required": true
        },
        {
          "name": "subtitle",
          "placeholder": "Secret Subtitle",
          "type": "password"
        },
        {
          "name": "favoriteColor",
          "type": "dropdown",
          "placeholder": "Favorite Color",
          "required": true,
          "data": [
            {
              "title": "Red",
              "value": "red"
            },
            {
              "title": "Green",
              "value": "green"
            },
            {
              "title": "Blue",
              "value": "blue"
            }
          ]
        }
      ]
    }
  ],
  "dependencies": {
    "@raycast/api": "1.38.0"
  },
  "scripts": {
    "dev": "ray develop",
    "build": "ray build -e dist",
    "lint": "ray lint"
  }
}
```

The command itself will receive the arguments' values via the `arguments` prop:

```typescript
import { Form, LaunchProps } from "@raycast/api";

export default function Todoist(props: LaunchProps<{ arguments: Arguments.MyCommand }>) {
  const { title, subtitle } = props.arguments;
  console.log(`title: ${title}, subtitle: ${subtitle}`);

  return (
    <Form>
      <Form.TextField id="title" title="Title" defaultValue={title} />
      <Form.TextField id="subtitle" title="Subtitle" defaultValue={subtitle} />
    </Form>
  );
}
```

## Types

### Arguments

A command receives the values of its arguments via a top-level prop named `arguments`. It is an object with the arguments' `name` as keys and their values as the property's values.

Depending on the `type` of the argument, the type of its value will be different.

| Argument type         | Value type          |
| :-------------------- | :------------------ |
| <code>text</code>     | <code>string</code> |
| <code>password</code> | <code>string</code> |
| <code>dropdown</code> | <code>string</code> |

{% hint style="info" %}
Raycast provides a global TypeScript namespace called `Arguments` which contains the types of the arguments of all the commands of the extension.

For example, if a command named `show-todos` accepts arguments, its `LaunchProps` can be described as `LaunchProps<{ arguments: Arguments.ShowTodos }>`. This will make sure that the types used in the command stay in sync with the manifest.
{% endhint %}


# Background Refresh

Commands of an extension can be configured to be automatically run in the background, without the user manually opening them.
Background refresh can be useful for:

- dynamically updating the subtitle of a command in Raycast root search
- refreshing menu bar commands
- other supporting functionality for your main commands

This guide helps you understand when and how to use background refresh and learn about the constraints.

## Scheduling Commands

Raycast supports scheduling commands with mode `no-view` and `menu-bar` at a configured interval.

### Manifest

Add a new property `interval` to a command in the [manifest](../manifest.md#command-properties)

Example:

```json
{
    "name": "unread-notifications",
    "title": "Show Unread Notifications",
    "description": "Shows the number of unread notifications in root search",
    "mode": "no-view",
    "interval": "10m"
},
```

The interval specifies that the command should be launched in the background every X seconds (s), minutes (m), hours (h) or days (d). Examples: `10m`, `12h`, `1d`. The minimum value is 10 seconds (`10s`), which should be used cautiously, also see the section on best practices.

Note that the actual scheduling is not exact and might vary within a tolerance level. macOS determines the best time for running the command in order to optimize energy consumption, and scheduling times can also vary when running on battery. To prevent overlapping background launches of the same command, commands are terminated after a timeout that is dynamically adjusted to the interval.

## Running in the background

The entry point of your command stays the same when launched from the background. For no-view commands, a command will run until the Promise of the main async function resolves. Menu bar commands render a React component and run until the `isLoading` property is set to `false`.

You can use the global `environment.launchType` in your command to determine whether the command has been launched by the user (`LaunchType.UserInitiated`) or via background refresh (`LaunchType.Background`).

```typescript
import { environment, updateCommandMetadata } from "@raycast/api";

async function fetchUnreadNotificationCount() {
  return 10;
}

export default async function Command() {
  console.log("launchType", environment.launchType);
  const count = await fetchUnreadNotificationCount();
  await updateCommandMetadata({ subtitle: `Unread Notifications: ${count}` });
}
```

Raycast auto-terminates the command if it exceeds its maximum execution time. If your command saves some state that is shared with other commands, make sure to use defensive programming, i.e. add handling for errors and data races if the stored state is incomplete or inaccessible.

## Development and Debugging

For local commands under development, errors are shown as usual via the console. Two developer actions in root search help you to run and debug scheduled commands:

- Run in Background: this immediately runs the command with `environment.launchType` set to `LaunchType.Background`.
- Show Error: if the command could not be loaded or an uncaught runtime exception was thrown, the full error can be shown in the Raycast error overlay for development. This action is also shown to users of the installed Store command and provides actions to copy and report the error on the production error overlay.

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/background-refresh-error.webp)

When the background run leads to an error, users will also see a warning icon on the root search command and a tooltip with a hint to show the error via the Action Panel. The tooltip over the subtitle of a command shows the last run time.

You can launch the built-in root search command "Extension Diagnostics" to see which of your commands run in background and when they last ran.

## Preferences

For scheduled commands, Raycast automatically adds command preferences that give users the options to enable and disable background refresh. Preferences also show the last run time of the command.

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/background-refresh-preferences.webp)

When a user installs the command via the Store, background refresh is initially _disabled_ and is activated either when the user opens the command for the first time or enables background refresh in preferences. (This is to avoid automatically running commands in the background without the user being aware of it.)

## Best Practices

- Make sure the command is useful both when manually launched by the user or when launched in the background
- Choose the interval value as high as possible - low values mean the command will run more often and consume more energy
- If your command performs network requests, check the rate limits of the service and handle errors appropriately (e.g. automatically retry later)
- Make sure the command finishes as quickly as possible; for menu bar commands, ensure `isLoading` is set to false as early as possible
- Use defensive programming if state is shared between commands of an extension and handle potential data races and inaccessible data


# Deeplinks

Deeplinks are Raycast-specific URLs you can use to launch any command, as long as it's installed and enabled in Raycast.

They adhere to the following format:

```
raycast://extensions/<author-or-owner>/<extension-name>/<command-name>
```

| Name            | Description                                                                                                                                                                                                                        | Type     |
| :-------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| author-or-owner | For store extensions, it's the value of the `owner` or the `author` field in the extension's [manifest](../manifest.md). For built-in extensions (such as `Calendar`), this is always `raycast`.                                   | `string` |
| extension-name  | For store extensions, it's the value of the extension's `name` field in the extension's [manifest](../manifest.md). For built-in extensions (such as `Calendar`), this is the "slugified" extension name; in this case `calendar`. | `string` |
| command-name    | For store extensions, it's the value of the command's `name` field in the extension's [manifest](../manifest.md). For built-in commands (such as `My Schedule`), this is the "slugified" command name; in this case `my-schedule`. | `string` |

To make fetching a command's Deeplink easier, each command in the Raycast root now has a `Copy Deeplink` action.

{% hint style="info" %}
Whenever a command is launched using a Deeplink, Raycast will ask you to confirm that you want to run the command. This is to ensure that you are aware of the command you are running.
{% endhint %}

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/deeplink-confirmation.webp)

## Query Parameters

| Name         | Description                                                                                                                            | Type                                   |
| :----------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| launchType   | Runs the command in the background, skipping bringing Raycast to the front.                                                            | Either `userInitiated` or `background` |
| arguments    | If the command accepts [arguments](./arguments.md), they can be passed using this query parameter.                                     | URL-encoded JSON object.               |
| context      | If the command make use of [LaunchContext](../../api-reference/command.md#launchcontext), it can be passed using this query parameter. | URL-encoded JSON object.               |
| fallbackText | Some text to prefill the search bar or first text input of the command                                                                 | `string`                               |


# Manifest

The `package.json` manifest file is a superset of npm's `package.json` file. This way, you only need one file to configure your extension. This document covers only the Raycast specific fields. Refer to [npm's documentation](https://docs.npmjs.com/cli/v7/configuring-npm/package-json) for everything else.

Here is a typical manifest file:

```javascript
{
  "name": "my-extension",
  "title": "My Extension",
  "description": "My extension that can do a lot of things",
  "icon": "icon.png",
  "author": "thomas",
  "categories": ["Fun", "Communication"],
  "license": "MIT",
  "commands": [
    {
      "name": "index",
      "title": "Send Love",
      "description": "A command to send love to each other",
      "mode": "view"
    }
  ],
  "attachments": [
    {
      "title": "Get Raycast blog posts",
      "name": "get-raycast-blog-posts",
      "description": "Get the latest blog posts from the Raycast blog",
      "mode": "submenu"
    }
  ]
}
```

## Extension properties

All Raycast related properties for an extension.

| Property                                      | Description                                                                                                                                                                                                                                         |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name<mark style="color:red;">\*</mark>        | A unique name for the extension. This is used in the Store link to your extension, so keep it short and URL compatible.                                                                                                                             |
| title<mark style="color:red;">\*</mark>       | The title of the extension that is shown to the user in the Store as well as the preferences. Use this title to describe your extension well that users can find it in the Store.                                                                   |
| description<mark style="color:red;">\*</mark> | The full description of the extension shown in the Store.                                                                                                                                                                                           |
| icon<mark style="color:red;">\*</mark>        | A reference to an icon file in the assets folder. Use png format with a size of 512 x 512 pixels. To support light and dark theme, add two icons, one with `@dark` as suffix, e.g. `icon.png` and `icon@dark.png`.                                  |
| author <mark style="color:red;">\*</mark>     | Your Raycast Store handle (username)                                                                                                                                                                                                                |
| categories<mark style="color:red;">\*</mark>  | An array of categories that your extension belongs in.                                                                                                                                                                                              |
| commands<mark style="color:red;">\*</mark>    | An array of [commands](./terminology.md#command) exposed by the extension, see [Command properties](manifest.md#command-properties).                                                                                                                |
| owner                                         | Used for extensions published under an organisation. When defined, the extension will be [private](../teams/getting-started.md) (except when specifying `access`).                                                                                  |
| access                                        | Either `"public"` or `"private"`. Public extensions are downloadable by anybody, while [private](../teams/getting-started.md) extensions can only be downloaded by a member of a given organization.                                                |
| contributors                                  | An array of Raycast store handles (usernames) of people who have meaningfully contributed and are maintaining to this extension.                                                                                                                    |
| pastContributors                              | An array of Raycast store handles (usernames) of people who have meaningfully contributed to the extension's commands but do not maintain it anymore.                                                                                               |
| keywords                                      | An array of keywords for which the extension can be searched for in the Store.                                                                                                                                                                      |
| preferences                                   | Extensions can contribute preferences that are shown in Raycast Preferences > Extensions. You can use preferences for configuration values and passwords or personal access tokens, see [Preference properties](manifest.md#preference-properties). |
| external                                      | An Array of package or file names that should be excluded from the build. The package will not be bundled, but the import is preserved and will be evaluated at runtime.                                                                            |

## Command properties

All properties for a [command](./terminology.md#command).

| Property                                      | Description                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name<mark style="color:red;">\*</mark>        | A unique id for the command. The name directly maps to the entry point file for the command. So a command named "index" would map to `src/index.ts` (or any other supported TypeScript or JavaScript file extension such as `.tsx`, `.js`, `.jsx)`.                                                                                                                                                             |
| title<mark style="color:red;">\*</mark>       | The display name of the command, shown to the user in the Store, Preferences, and in Raycast's root search.                                                                                                                                                                                                                                                                                                     |
| subtitle                                      | The optional subtitle of the command in the root search. Usually, this is the service or domain that your command is associated with. You can dynamically update this property using [`updateCommandMetadata`](../api-reference/command.md#updatecommandmetadata).                                                                                                                                              |
| description<mark style="color:red;">\*</mark> | It helps users understand what the command does. It will be displayed in the Store and in Preferences.                                                                                                                                                                                                                                                                                                          |
| icon                                          | <p>An optional reference to an icon file in the assets folder. Use png format with a size of at least 512 x 512 pixels. To support light and dark theme, add two icons, one with <code>@dark</code> as suffix, e.g. <code>icon.png</code> and <code>icon@dark.png</code>.</p><p>If no icon is specified, the extension icon will be used.</p>                                                                   |
| mode<mark style="color:red;">\*</mark>        | A value of `view` indicates that the command will show a main view when performed. `no-view` means that the command does not push a view to the main navigation stack in Raycast. The latter is handy for directly opening a URL or other API functionalities that don't require a user interface. `menu-bar` indicates that this command will return a [Menu Bar Extra](../api-reference/menu-bar-commands.md) |
| interval                                      | The value specifies that a `no-view` or `menu-bar` command should be launched in the background every X seconds (s), minutes (m), hours (h) or days (d). Examples: 90s, 1m, 12h, 1d. The minimum value is 1 minute (1m).                                                                                                                                                                                        |
| keywords                                      | An optional array of keywords for which the command can be searched in Raycast.                                                                                                                                                                                                                                                                                                                                 |
| arguments                                     | An optional array of arguments that are requested from user when command is called, see [Argument properties](manifest.md#argument-properties).                                                                                                                                                                                                                                                                 |
| preferences                                   | Commands can optionally contribute preferences that are shown in Raycast Preferences > Extensions when selecting the command. You can use preferences for configuration values and passwords or personal access tokens, see [Preference properties](manifest.md#preference-properties). Commands automatically "inherit" extension preferences and can also override entries with the same `name`.              |
| disabledByDefault                             | <p>Specify whether the command should be enabled by default or not. By default, all commands are enabled but there are some cases where you might want to include additional commands and let the user enable them if they need it.</p><p><em>Note that this flag is only used when installing a new extension or when there is a new command.</em></p>                                                         |

## Preference properties

All properties for extension or command-specific preferences. Use the [Preferences API](../api-reference/preferences.md) to access their values.

| Property                                      | Description                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| name<mark style="color:red;">\*</mark>        | A unique id for the preference.                                                                                                                                                                                                                                                                                                                                                            |
| title<mark style="color:red;">\*</mark>       | <p>The display name of the preference shown in Raycast preferences.</p><p> For `"checkbox"`, `"textfield"` and `"password"`, it is shown as a section title above the respective input element.</p><p>If you want to group multiple checkboxes into a single section, set the <code>title</code> of the first checkbox and leave the <code>title</code> of the other checkboxes empty.</p> |
| description<mark style="color:red;">\*</mark> | It helps users understand what the preference does. It will be displayed as a tooltip when hovering over it.                                                                                                                                                                                                                                                                               |
| type<mark style="color:red;">\*</mark>        | The preference type. We currently support `"textfield"` and `"password"` (for secure entry), `"checkbox"`, `"dropdown"`, `"appPicker"`, `"file"`, and `"directory"`.                                                                                                                                                                                                                       |
| required<mark style="color:red;">\*</mark>    | Indicates whether the value is required and must be entered by the user before the extension is usable.                                                                                                                                                                                                                                                                                    |
| placeholder                                   | Text displayed in the preference's field when no value has been input.                                                                                                                                                                                                                                                                                                                     |
| default                                       | The optional default value for the field. For textfields, this is a string value; for checkboxes a boolean; for dropdowns the value of an object in the data array; for appPickers an application name, bundle ID or path.                                                                                                                                                                 |

Depending on the `type` of the Preference, some additional properties can be required:

### Additional properties for `checkbox` Preference

| Property                                | Description                                            |
| --------------------------------------- | ------------------------------------------------------ |
| label<mark style="color:red;">\*</mark> | The label of the checkbox. Shown next to the checkbox. |

### Additional properties for `dropdown` Preference

| Property                               | Description                                                                                          |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| data<mark style="color:red;">\*</mark> | An array of objects with `title` and `value` properties, e.g.: `[{"title": "Item 1", "value": "1"}]` |

## Argument properties

All properties for command arguments. Use the [Arguments API](./lifecycle/arguments.md) to access their values.

| Property                                      | Description                                                                                                                                                                                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| name<mark style="color:red;">\*</mark>        | A unique id for the argument. This value will be used to as the key in the object passed as [top-level prop](./lifecycle/arguments.md#arguments).                                                                                                |
| type<mark style="color:red;">\*</mark>        | The argument type. We currently support `"text"`, `"password"` (for secure entry), and `"dropdown"`. When the type is `password`, entered text will be replaced with asterisks. Most common use case – passing passwords or secrets to commands. |
| placeholder<mark style="color:red;">\*</mark> | Placeholder for the argument's input field.                                                                                                                                                                                                      |
| required                                      | Indicates whether the value is required and must be entered by the user before the command is opened. Default value for this is `false`.                                                                                                         |

Depending on the `type` of the Argument, some additional properties can be required:

### Additional properties for `dropdown` Argument

| Property                               | Description                                                                                          |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| data<mark style="color:red;">\*</mark> | An array of objects with `title` and `value` properties, e.g.: `[{"title": "Item 1", "value": "1"}]` |


# Security

{% hint style="info" %}
Note that this is _not_ a guide on how to create secure Raycast extensions but rather an overview of security-related aspects on how extensions are built, distributed and run.
{% endhint %}

## Raycast

Raycast itself runs outside of the App Store as "Developer ID Application", **signed** with the Raycast certificate and verified by Apple's **notarization service** before the app is distributed. Raycast provides various commands that interact with OS-level functionality, some of which prompt the user for granting **permissions** when required. The app is **automatically kept up-to-date** to minimize the risk of running heavily outdated versions and to ship hotfixes quickly. Raycast is a local-first application that stores user data in a local **encrypted database**, makes use of the system **Keychain** where secure data is stored, and generally connects to third-party APIs directly rather than proxying data through Raycast servers.

## Publishing Process

All extensions are **open source** so the current source code can be inspected at all times. Before an extension gets merged into the **public repository**, members from Raycast and the community collaboratively **review** extensions, and follow our **store guidelines**. After the code review, the Continuous Integration system performs a set of **validations** to make sure that manifest conforms to the defined schema, required assets have the correct format, the author is valid, and no build and type errors are present. (More CI pipeline tooling for automated static security analysis is planned.) The built extension is then **archived and uploaded** to the Raycast Store, and eventually published for a registered user account. When an extension is installed or updated, the extension is downloaded from the store, unarchived to disk, and a record is updated in the local Raycast database. End-users install extensions through the built-in store or the web store.

## Runtime Model

In order to run extensions, Raycast launches a **single child Node.js process** where extensions get loaded and unloaded as needed; inter-process communication with Raycast happens through standard file handles and a thin RPC protocol that only exposes a **defined set of APIs**, that is, an extension cannot just perform any Raycast operation. The **Node runtime is managed** by Raycast and automatically downloaded to the user's machine. We use an official version and **verify the Node binary** to ensure it has not been tampered with.

An extension runs in its own **v8 isolate** (worker thread) and gets its own event loop, JavaScript engine and Node instance, and limited heap memory. That way, we ensure **isolation between extensions** when future Raycast versions may support background executions of multiple extensions running concurrently.

## Permissions

Extensions are **not further sandboxed** as far as policies for file I/O, networking, or other features of the Node runtime are concerned; this might change in the future as we want to carefully balance user/developer experience and security needs. By default and similar to other macOS apps, accessing special directories such as the user Documents directory or performing screen recording first requires users to give **permissions** to Raycast (parent process) via the **macOS Security & Preferences** pane, otherwise programmatic access is not permitted.

## Data Storage

While extensions can access the file system and use their own methods of storing and accessing data, Raycast provides **APIs for securely storing data**: _password_ preferences can be used to ask users for values such as access tokens, and the local storage APIs provide methods for reading and writing data payloads. In both cases, the data is stored in the local encrypted database and can only be accessed by the corresponding extension.

## Automatic Updates

Both Raycast itself and extensions are **automatically updated** and we think of this as a security feature since countless exploits have happened due to outdated and vulnerable software. Our goal is that neither developers nor end-users need to worry about versions, and we **minimize the time from update to distribution** to end-users.


---
description: An explanation of various terms used in this documentation.
---

# Terminology

## Action

Actions are accessible via the [Action Panel](terminology.md#action-panel) in a [command](terminology.md#command). They are little functionality to control something; for example, to add a label to the selected GitHub issue, copy the link to a Linear issue, or anything else. Actions can have assigned keyboard shortcuts.

## Action Panel

Action Panel is located on the bottom right and can be opened with `⌘` `K`. It contains all currently available [actions](terminology.md#action) and makes them easily discoverable.

## Command

Commands are available in the root search of Raycast. They can be a simple script or lists, forms, and more complex UI.

## Extension

Extensions add functionality to Raycast. They consist of one or many [commands](terminology.md#command) and can be installed from the Store.

## Manifest

Manifest is the `package.json` file of an [extension](terminology.md#extension). It's an npm package mixed with Raycast specific metadata. The latter is necessary to identify the package for Raycast and publish it to the Store.


# Versioning

Versioning your extensions is straightforward since we've designed the system in a way that **frees you from having to deal with versioning schemes and compatibility**. The model is similar to that of app stores where there's only one implicit _latest_ version that will be updated when the extension is published in the store. Extensions are automatically updated for end users.

## Development

For **development**, this means that you do _not_ declare a version property in the manifest. If you wish to use API features that were added in a later version, you just update your `@raycast/api` npm dependency, start using the feature, and submit an extension update to the store.

## End Users

For **end-users** installing or updating your extension, Raycast automatically checks the compatibility between the API version that the extension actually uses and the user's current Raycast app version (which contains the API runtime and also manages the Node version). If there's a compatibility mismatch such as the user not having the required latest Raycast app version, we show a hint and prompt the user to update Raycast so that the next compatibility check succeeds.

## Version History

Optionally, you can provide a `changelog.md` file in your extension, and give detailed changes with every update. These changes can be viewed by the user on the extension details screen, under Version History, as well as on the [raycast.com/store](https://raycast.com/store).

You can learn more about Version History [here](../basics/prepare-an-extension-for-store.md#version-history), how to add it to your extension, and the required format for the best appearance.

## API Evolution

Generally, we follow an **API evolution** process, meaning that we stay backward-compatible and do not introduce breaking changes within the same major API version. We'll 1) add new functionality and 2) we'll mark certain API methods and components as _deprecated_ over time, which signals to you that you should stop using those features and migrate to the new recommended alternatives. At some point in the future, we may introduce a new breaking major release; however, at this time, you will be notified, and there will be a transition period for migrating extensions.


# Migration

This section contains guides to help migrate your extension to a newer version of the API.

## How to automatically migrate your extensions

Whenever possible, we provide tools to automate the migration to a newer version of the API using [codemods](https://github.com/facebook/jscodeshift).

To run the codemods, run the following command in your extension directory:

```bash
npx ray migrate
```

or

```bash
npx @raycast/migration@latest .
```

It will detect the version of the API you were previously using and apply all the migrations that have been available since.

After running it, do go through the updated files and make sure nothing is broken - there are always edge cases.


# Migrating to v1.28.0

This version contains an overhaul of the API surface to improve its discoverability and its usage in a code editor. The aim was to reduce the number of top-level exports to make it easier to find the ones that matter. It also aligns it with the structure of the documentation.

{% hint style="info" %}
The previous API surface is still there, only deprecated. All of your existing extensions will continue to work. You will get helpful hints in your code editor to migrate your extension.
{% endhint %}

## Clipboard

The methods related to the [Clipboard](../api-reference/clipboard.md) can now be found under the `Clipboard` namespace.

```js
import { Clipboard } from "@raycast/api";

// deprecated copyTextToClipboard
await Clipboard.copy("text");

// deprecated clearClipboard
await Clipboard.clear();

// deprecated pasteText
await Clipboard.paste("text");
```

## Storage

The methods and interfaces related to the [Storage](../api-reference/storage.md) can now be found under the `LocalStorage` namespace.

```js
import { LocalStorage } from "@raycast/api";

// deprecated allLocalStorageItems
const items = await LocalStorage.allItems();

// deprecated getLocalStorageItem
const item = await LocalStorage.getItem("key");

// deprecated setLocalStorageItem
await LocalStorage.setItem("key", "value");

// deprecated removeLocalStorageItem
await LocalStorage.removeItem("key");

// deprecated clearLocalStorage
await LocalStorage.clear();

// we didn't expect you to use the Storage interfaces
// but they are now also under LocalStorage

// deprecated LocalStorageValue
LocalStorage.Value;

// deprecated LocalStorageValues
LocalStorage.Values;
```

## Feedback

The main changes to the [Feedback](../api-reference/feedback/README.md) methods are related to the Toast:

`showToast` now accepts a `Toast.Options` object as an argument and its style will default to `Toast.Style.Success`.

```js
import { showToast, Toast } from "@raycast/api";

// deprecated new Toast()
const toast = await showToast({ title: "Toast title" }); // Success by default

// deprecated showToast(ToastStyle.Failure, 'Toast title')
await showToast({ title: "Toast title", style: Toast.Style.Failure });
```

The interfaces and enumerations of both the Toast and Alert can now be found under their respective namespaces.

```js
import { Alert, Toast } from "@raycast/api";

// deprecated ToastOptions
Toast.Options;

// deprecated ToastActionOptions
Toast.ActionOptions;

// deprecated ToastStyle
Toast.Style;

// deprecated AlertOptions
Alert.Options;

// deprecated AlertActionOptions
Alert.ActionOptions;

// deprecated AlertActionStyle
Alert.ActionStyle;
```

## Keyboard

The interfaces related to the [Keyboard](../api-reference/keyboard.md) can now be found under the `Keyboard` namespace.

```js
import { Keyboard } from "@raycast/api";

// deprecated KeyboardShortcut
Keyboard.Shortcut;

// deprecated KeyModifier
Keyboard.KeyModifier;

// deprecated KeyEquivalent
Keyboard.KeyEquivalent;
```

## Preferences

We are deprecating the `preferences` constant because we found it to be error-prone. Instead, you should always use `getPreferenceValues()` which allows for a type-safe access with fallback to the defaults.

## User Interface

There are two important changes related to the React components:

- `ActionPanel.Item` has been renamed to `Action`. All the specific actions are now nested under `Action`. This will make it easier to introduce and teach the concept of Action.
- All the props interfaces are now accessible under their respective components

```jsx
import { Action, List } from '@raycast/api'

// deprecated ActionPanel.Item
<Action title="Action title" onAction={() => {}}>

// deprecated CopyToClipboardAction
<Action.CopyToClipboard content="text">

// deprecated ListProps
List.Props
```

### Color

The interfaces related to the [Color](../api-reference/user-interface/colors.md) can now be found under the `Color` namespace.

```js
import { Color } from "@raycast/api";

// deprecated DynamicColor
Color.Dynamic;

// deprecated ColorLike
Color.ColorLike;
```

### Image

The interfaces and enumerations related to the [Image](../api-reference/user-interface/icons-and-images.md) can now be found under the `Image` namespace. `Icon` is still a top-level export.

```js
import { Image } from "@raycast/api";

// deprecated ImageLike
Image.ImageLike;

// deprecated ImageSource
Image.Source;

// deprecated ImageMask
Image.Mask;
```

## Misc

- We are deprecating the `randomId` utility. It wasn't related to Raycast. Instead, you can use the [`nanoid`](https://github.com/ai/nanoid#readme) dependency.
- We are deprecating the `useId` hook. It was used internally but there shouldn't be a use-case for it in your extensions.
- We are deprecating the `useActionPanel` hook. Use the `ActionPanel` component instead.
- We are deprecating the `render` method. You should `export default` your root component instead.


# Migrating to v1.31.0

This version introduces support for multiple `<List.Item>` accessories via a new [`accessories` prop](../api-reference/user-interface/list.md#list.item.accessory).

{% hint style="info" %}
The `accessoryTitle` and `accessoryIcon` props still work, but are now marked as deprecated and may be removed in a future version. You will get helpful hints in your code editor to migrate your extension, and as usual we provide automated [migrations](./README.md) to help with the transition.
{% endhint %}

To migrate your extension manually, you need to ensure that all `List.Items` that specify `accessoryTitle` and/or `accessoryIcon` are updated as follows:

## `List.Item` with `accessoryTitle`

```typescript
<List.Item title="List item with accessory title" accessoryTitle="foo" />
// becomes
<List.Item title="List item with accessory title" accessories={[{ text: 'foo' }]}
```

## `List.Item` with `accessoryIcon`

```typescript
<List.Item title="List item with accessory icon" accessoryIcon={getAccessoryIcon()} />
// becomes
<List.Item title="List item with accessory icon" accessories={[{ icon: getAccessoryIcon() }]}
```

## `List.Item` with `accessoryTitle` and `accessoryIcon`

```typescript
<List.Item title="List item with accessory title and accessory icon" accessoryTitle="foo" accessoryIcon={getAccessoryIcon()} />
// becomes
<List.Item title="List item with accessory title and accessory icon" accessories={[{ text: "foo", icon: getAccessoryIcon() }]}
```


# Migrating to v1.37.0

This version now depends on [React 18](https://reactjs.org/blog/2022/03/29/react-v18.html). As part of this change, the `@raycast/api` package now has strong dependencies on `@types/react` and `@types/node` so those 2 packages shall be removed from your extension's devDependencies (this will be done automatically by `npx ray migrate`).

There are no breaking changes introduced in React 18 so all your extensions will still work properly. However, there are some breaking changes in `@types/react` so you might have to do some minor tweaks if you use TypeScript.

We had a [pass](https://github.com/raycast/extensions/compare/f/fix-ts) through all the extensions on the public repo. Notably, if you are using `raycast-toolkit` or `swr`, you will have to update them to their latest version.

## React Suspense

{% hint style="info" %}
Suspense is an advanced feature of React. You do not need to use or understand it to build Raycast extensions (or any React application). We are not going to teach Suspense here but we will highlight how you can work with it in Raycast.
{% endhint %}

You can now use Suspense in Raycast. We provide a top-level `Suspense` fallback so you don't have to. This fallback simply turns on the `isLoading` on the top level view.

```jsx
import { List, Toast, showToast, ActionPanel, Action, Icon, popToRoot } from "@raycast/api";
import { useState, useCallback } from "react";
import * as twitter from "./oauth/twitter";

// a hook that suspends until a promise is resolved
import { usePromise } from "./suspense-use-promise";

const promise = async (search: string) => {
  try {
    await twitter.authorize();
    return await twitter.fetchItems(search);
  } catch (error) {
    console.error(error);
    showToast({ style: Toast.Style.Failure, title: String(error) });
    return [];
  }
};

export default function Command() {
  const [search, setSearch] = useState("");

  const items = usePromise(promise, [search]);

  const logout = useCallback(() => {
    twitter.logout();
    popToRoot();
  }, []);

  const actionPanel = (
    <ActionPanel>
      <Action title="Logout" onAction={logout} />
    </ActionPanel>
  );

  // no need to set the `isLoading` prop, Raycast will set it automatically
  // until the React application isn't suspended anymore
  return (
    <List onSearchTextChange={setSearch} throttle>
      {items.map((item) => {
        return (
          <List.Item key={item.id} id={item.id} icon={Icon.TextDocument} title={item.title} actions={actionPanel} />
        );
      })}
    </List>
  );
}
```


# Migrating to v1.42.0

This version changed the `enableFiltering` option of `Grid` to `filtering`.

{% hint style="info" %}
The `enableFiltering` prop still work, but is now marked as deprecated and may be removed in a future version. You will get helpful hints in your code editor to migrate your extension, and as usual we provide automated [migrations](./README.md) to help with the transition.
{% endhint %}

To migrate your extension manually, you need to ensure that all `Grid` that specify `enableFiltering` are updated as follows:

```typescript
<Grid ... enabledFiltering>...</Grid>
// becomes
<Grid ... filtering>...</Grid>
```


# Migrating to v1.48.8

This version introduces a new ESLint configuration file when creating new extensions with the `Create Extension` command. However, extensions prior to v1.48.8 still use the deprecated configuration.

You can use `npx ray migrate` to use the new ESLint configuration and your `.eslintrc.json` file as well as your dependencies should be updated.

If the migration didn't go well or if you defined the ESLint configuration in another place, please follow the steps below.

First, install `@raycast/eslint-config` as part of your dev dependencies:

```sh
npm install @raycast/eslint-config --save-dev
```

The previous default configuration looks like this:

```json
{
  "root": true,
  "env": {
    "es2020": true,
    "node": true
  },
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"]
}
```

With `@raycast/eslint-config`, you can replace the whole file with only the following:

```json
{
  "root": true,
  "extends": [
    "@raycast"
  ]
}
```

If you added plugins, turned on/off rules, or anything else modifying the ESLint configuration, it's up to you to merge it with the new configuration.

Finally, you can remove these ESLint dependencies:

```sh
npm uninstall @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-config-prettier
```

# Migrating to v1.50.0

This version introduces an automated generation of typescript definitions for the preferences and arguments of your extension's commands.

After updating the API version, you will notice a new file at the root of the extension folder called `raycast-env.d.ts`.

- You shouldn't add this file to git so you have to update your `.gitignore` file:

  ```diff
  + raycast-env.d.ts
  ```

- You have to tell TypeScript to pick up this file to get access to its type definitions. To do so, update the `tsconfig.json` file:

  ```diff
  - "include": ["src/**/*"],
  + "include": ["src/**/*", "raycast-env.d.ts"],
  ```

- You can now update your code to leverage the automated types:

  ```diff
  ...
  - export default function Command(props: LaunchProps<{ arguments: { input: string } }>) {
  + export default function Command(props: LaunchProps<{ arguments: Arguments.CommandName }>) {
  ...

  ...
  - const prefs: { apiKey: string } = getPreferenceValues();
  + const prefs: Preferences.CommandName = getPreferenceValues();
  ...
  ```


# Migrating to v1.51.0

This version changed `environment.theme` to `environment.appearance`.

{% hint style="info" %}
`environment.theme` still works, but is now marked as deprecated and may be removed in a future version. You will get helpful hints in your code editor to migrate your extension, and as usual we provide automated [migrations](./README.md) to help with the transition.
{% endhint %}

To migrate your extension manually, you need to ensure that all `environment.theme` are updated to `environment.appearance`.


# Migrating to v1.59.0

This version changed the `transient` option of `Clipboard` to `concealed`.

{% hint style="info" %}
The `transient` option still work, but is now marked as deprecated and may be removed in a future version. You will get helpful hints in your code editor to migrate your extension, and as usual we provide automated [migrations](./README.md) to help with the transition.
{% endhint %}

To migrate your extension manually, you need to ensure that all `Clipboard.copy` that specify `transient` are updated as follows:

## `Clipboard.copy` with `transient` option

```typescript
Clipboard.copy(content, { transient: true });
// becomes
Clipboard.copy(content, { concealed: true });
```

## `Action.CopyToClipboard` with `transient` prop

```typescript
<Action.CopyToClipboard ... transient />
// becomes
<Action.CopyToClipboard ... concealed />
```


---
description: This guide explains how to collaborate with your team on extensions.
---

# Collaborate on Private Extensions

Isn't it more fun to work with your colleagues together on your extension? For this, we recommend to share all your extensions in a single repository, similar to how we organize the [public store](https://raycast.com/store). If you follow the [Getting Started guide](./getting-started.md), we will set up a local repository for you that is optimized for collaboration.

As next steps, create a [new repository](https://github.com/new) and push the existing local repository. Afterwards, your teammates can check out the code and help you improve your extensions and add new ones.


---
description: This guide sets you up with Raycast for Teams.
---

# Getting Started with Raycast for Teams

Raycast for Teams allows you to build, share and discover extensions in a private store. The store is only accessible to members of your organization.

## Create Your Organization

To get started, create your organization. Specify the name of the organization, a handle (used in links, e.g. `https://raycast.com/your_org/some_extension`) and optionally upload an avatar.

![Create an Organization](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/teams-create-organization.webp)

{% hint style="info" %}
You can use the Manage Organization command to edit your organization's information later.
{% endhint %}

## Create Your Private Extension Store

After you've created your organization, it's time to set up a private store for your extensions.

### Init a Local Repository

First, select a folder to create a local repository for your private extension store. We create a folder that contains a Getting Started extension. We recommend to store all extensions of your team in a single repository. This makes it easy to collaborate.

![Create Local Repository](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/teams-create-repository.webp)

### Build The Getting Started Extension

After you have created the local repository, navigate into the `getting-started` folder. The folder contains a simple extension with a command that shows a list with a few useful links. Run `npm run dev` in the folder to build the extension and start development mode. Raycast opens and you can see a new Development section in the root search. The section shows all commands that are under active development. You can open the command and open a few links.

![Build the Getting Started Extension](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/teams-develop-extension.webp)

{% hint style="info" %}
See [Create Your First Extension](../basics/create-your-first-extension.md) for a more detailed guide on how to create an extension.
{% endhint %}

### Publish The Getting Started Extension

Now, we share the extension with your organization. Perform `npm run publish` in the extension folder. The command verifies, builds and publishes the extension to your private extension store. The extension is only accessible to members of your organization.

![Publish the Getting Started Extension](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/teams-publish-extension.webp)

🎉 Congratulations! You built and published your first private extension. Now it's time to spread the word in your organization.

## Invite Your Teammates

Use the Copy Organization Invite Link command in Raycast to share access to your organization. Send the link to your teammates. You'll receive an email when somebody joins your organization. You can use the Manage Organization command to see who's part of your organization, reset the invite link and edit your organization details.

As a next step, follow [this guide](./collaborate-on-private-extensions.md) to push your local repository to a source control system. This allows you to collaborate with your teammates on your extensions.


---
description: Learn how to share an extension in your organization's private extension store
---

# Publish a Private Extension

To publish an extension, run `npm run publish` in the extension directory. The command verifies, builds and publishes the extension to the owner's store. The extension is only available to members of this organization. A link to your extension is copied to your clipboard to share it with your teammates. Happy publishing 🥳

To mark an extension as private, you need to set the `owner` field in your `package.json` to your organization handle. If you don't know your handle, open the Manage Organization command, select your organization in the dropdown on the top right and perform the Copy Organization Handle action (`⌘` `⇧` `.`).

{% hint style="info" %}
Use the Create Extension command to create a private extension for your organization.
{% endhint %}

To be able to publish a private extension to an organization, you need to be logged in. Raycast takes care of logging you in with the CLI as well. In case you aren't logged in or need to switch an account, you can run `npx ray login` and `npx ray logout`.


## Utilities

- [Getting Started](utils-reference/getting-started.md)
- [Functions](utils-reference/functions/README.md)
  - [runAppleScript](utils-reference/functions/runAppleScript.md)
  - [showFailureToast](utils-reference/functions/showFailureToast.md)
  - [createDeeplink](utils-reference/functions/createDeeplink.md)
  - [executeSQL](utils-reference/functions/executeSQL.md)
- [Icons](utils-reference/icons/README.md)
  - [getAvatarIcon](utils-reference/icons/getAvatarIcon.md)
  - [getFavicon](utils-reference/icons/getFavicon.md)
  - [getProgressIcon](utils-reference/icons/getProgressIcon.md)
- [OAuth Utils](utils-reference/oauth/README.md)
  - [OAuthService](utils-reference/oauth/OAuthService.md)
  - [withAccessToken](utils-reference/oauth/withAccessToken.md)
  - [getAccessToken](utils-reference/oauth/getAccessToken.md)
  - [Getting a Google client ID](utils-reference/oauth/getting-google-client-id.md)
- [React hooks](utils-reference/react-hooks/README.md)
  - [useCachedState](utils-reference/react-hooks/useCachedState.md)
  - [usePromise](utils-reference/react-hooks/usePromise.md)
  - [useCachedPromise](utils-reference/react-hooks/useCachedPromise.md)
  - [useFetch](utils-reference/react-hooks/useFetch.md)
  - [useForm](utils-reference/react-hooks/useForm.md)
  - [useExec](utils-reference/react-hooks/useExec.md)
  - [useSQL](utils-reference/react-hooks/useSQL.md)
  - [useAI](utils-reference/react-hooks/useAI.md)
  - [useFrecencySorting](utils-reference/react-hooks/useFrecencySorting.md)
  - [useStreamJSON](utils-reference/react-hooks/useStreamJSON.md)
  - [useLocalStorage](utils-reference/react-hooks/useLocalStorage.md)


# Functions


# `createDeeplink`

Function that creates a deeplink for an extension or script command.

## Signature

There are three ways to use the function.

The first one is for creating a deeplink to a command inside the current extension:

```ts
function createDeeplink(options: {
  type?: DeeplinkType.Extension,
  command: string,
  launchType?: LaunchType,
  arguments?: LaunchProps["arguments"],
  fallbackText?: string,
}): string;
```

The second one is for creating a deeplink to an extension that is not the current extension:

```ts
function createDeeplink(options: {
  type?: DeeplinkType.Extension,
  ownerOrAuthorName: string,
  extensionName: string,
  command: string,
  launchType?: LaunchType,
  arguments?: LaunchProps["arguments"],
  fallbackText?: string,
}): string;
```

The third one is for creating a deeplink to a script command:

```ts
function createDeeplink(options: {
  type: DeeplinkType.ScriptCommand,
  command: string,
  arguments?: string[],
}): string;
```

### Arguments

#### Extension

- `type` is the type of the deeplink. It must be `DeeplinkType.Extension`.
- `command` is the name of the command to deeplink to.
- `launchType` is the type of the launch.
- `arguments` is an object that contains the arguments to pass to the command.
- `fallbackText` is the text to show if the command is not available.
- For intra-extension deeplinks:
  - `ownerOrAuthorName` is the name of the owner or author of the extension.
  - `extensionName` is the name of the extension.

#### Script command

- `type` is the type of the deeplink. It must be `DeeplinkType.ScriptCommand`.
- `command` is the name of the script command to deeplink to.
- `arguments` is an array of strings to be passed as arguments to the script command.

### Return

Returns a string.

## Example

```tsx
import { Action, ActionPanel, LaunchProps, List } from "@raycast/api";
import { createDeeplink, DeeplinkType } from "@raycast/utils";

export default function Command(props: LaunchProps<{ launchContext: { message: string } }>) {
  console.log(props.launchContext?.message);

  return (
    <List>
      <List.Item
        title="Extension Deeplink"
        actions={
          <ActionPanel>
            <Action.CreateQuicklink
              title="Create Deeplink"
              quicklink={{
                name: "Extension Deeplink",
                link: createDeeplink({
                  command: "create-deeplink",
                  context: {
                    message: "Hello, world!",
                  },
                }),
              }}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="External Extension Deeplink"
        actions={
          <ActionPanel>
            <Action.CreateQuicklink
              title="Create Deeplink"
              quicklink={{
                name: "Create Triage Issue for Myself",
                link: createDeeplink({
                  ownerOrAuthorName: "linear",
                  extensionName: "linear",
                  command: "create-issue-for-myself",
                  arguments: {
                    title: "Triage new issues",
                  },
                }),
              }}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Script Command Deeplink"
        actions={
          <ActionPanel>
            <Action.CreateQuicklink
              title="Create Deeplink"
              quicklink={{
                name: "Deeplink with Arguments",
                link: createDeeplink({
                  type: DeeplinkType.ScriptCommand,
                  command: "count-chars",
                  arguments: ["a b+c%20d"],
                }),
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
```

## Types

### DeeplinkType

A type to denote whether the deeplink is for a script command or an extension.

```ts
export enum DeeplinkType {
  /** A script command */
  ScriptCommand = "script-command",
  /** An extension command */
  Extension = "extension",
}
```


# `executeSQL`

A function that executes a SQL query on a local SQLite database and returns the query result in JSON format.

## Signature

```ts
function executeSQL<T = unknown>(databasePath: string, query: string): Promise<T[]>
```

### Arguments

- `databasePath` is the path to the local SQL database.
- `query` is the SQL query to run on the database.

### Return

Returns a `Promise` that resolves to an array of objects representing the query results.

## Example

```typescript
import { closeMainWindow, Clipboard } from "@raycast/api";
import { executeSQL } from "@raycast/utils";

type Message = { body: string; code: string };

const DB_PATH = "/path/to/chat.db";

export default async function Command() {
  const query = `
    SELECT body, code
    FROM message
    ORDER BY date DESC
    LIMIT 1;
  `;

  const messages = await executeSQL<Message>(DB_PATH, query);

  if (messages.length > 0) {
    const latestCode = messages[0].code;
    await Clipboard.paste(latestCode);
    await closeMainWindow();
  }
}
```

# `runAppleScript`

Function that executes an AppleScript script.

## Signature

There are two ways to use the function.

The first one should be preferred when executing a static script.

```ts
function runAppleScript<T>(
  script: string,
  options?: {
    humanReadableOutput?: boolean;
    language?: "AppleScript" | "JavaScript";
    signal?: AbortSignal;
    timeout?: number;
    parseOutput?: ParseExecOutputHandler<T>;
  },
): Promise<T>;
```

The second one can be used to pass arguments to a script.

```ts
function runAppleScript<T>(
  script: string,
  arguments: string[],
  options?: {
    humanReadableOutput?: boolean;
    language?: "AppleScript" | "JavaScript";
    signal?: AbortSignal;
    timeout?: number;
    parseOutput?: ParseExecOutputHandler<T>;
  },
): Promise<T>;
```

### Arguments

- `script` is the script to execute.
- `arguments` is an array of strings to pass as arguments to the script.

With a few options:

- `options.humanReadableOutput` is a boolean to tell the script what form to output. By default, `runAppleScript` returns its results in human-readable form: strings do not have quotes around them, characters are not escaped, braces for lists and records are omitted, etc. This is generally more useful, but can introduce ambiguities. For example, the lists `{"foo", "bar"}` and `{{"foo", {"bar"}}}` would both be displayed as ‘foo, bar’. To see the results in an unambiguous form that could be recompiled into the same value, set `humanReadableOutput` to `false`.
- `options.language` is a string to specify whether the script is using [`AppleScript`](https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptLangGuide/introduction/ASLR_intro.html#//apple_ref/doc/uid/TP40000983) or [`JavaScript`](https://developer.apple.com/library/archive/releasenotes/InterapplicationCommunication/RN-JavaScriptForAutomation/Articles/Introduction.html#//apple_ref/doc/uid/TP40014508-CH111-SW1). By default, it will assume that it's using `AppleScript`.
- `options.signal` is a Signal object that allows you to abort the request if required via an AbortController object.
- `options.timeout` is a number. If greater than `0`, the parent will send the signal `SIGTERM` if the script runs longer than timeout milliseconds. By default, the execution will timeout after 10000ms (eg. 10s).
- `options.parseOutput` is a function that accepts the output of the script as an argument and returns the data the hooks will return - see [ParseExecOutputHandler](#parseexecoutputhandler). By default, the function will return `stdout` as a string.

### Return

Returns a Promise which resolves to a string by default. You can control what it returns by passing `options.parseOutput`.

## Example

```tsx
import { showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function () {
  const res = await runAppleScript(
    `
on run argv
  return "hello, " & item 1 of argv & "."
end run
`,
    ["world"],
  );
  await showHUD(res);
}
```

## Types

### ParseExecOutputHandler

A function that accepts the output of the script as an argument and returns the data the function will return.

```ts
export type ParseExecOutputHandler<T> = (args: {
  /** The output of the script on stdout. */
  stdout: string;
  /** The output of the script on stderr. */
  stderr: string;
  error?: Error | undefined;
  /** The numeric exit code of the process that was run. */
  exitCode: number | null;
  /** The name of the signal that was used to terminate the process. For example, SIGFPE. */
  signal: NodeJS.Signals | null;
  /** Whether the process timed out. */
  timedOut: boolean;
  /** The command that was run, for logging purposes. */
  command: string;
  /** The options passed to the script, for logging purposes. */
  options?: ExecOptions | undefined;
}) => T;
```


# `showFailureToast`

Function that shows a failure [Toast](../../api-reference/feedback/toast.md) for a given Error.

## Signature

```ts
function showFailureToast(
  error: unknown,
  options?: {
    title?: string;
    primaryAction?: Toast.ActionOptions;
  },
): Promise<T>;
```

### Arguments

- `error` is the error to report.

With a few options:

- `options.title` is a string describing the action that failed. By default, `"Something went wrong"`
- `options.primaryAction` is a Toast [Action](../../api-reference/feedback/toast.md#toast.actionoptions).

### Return

Returns a [Toast](../../api-reference/feedback/toast.md).

## Example

```tsx
import { showHUD } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";

export default async function () {
  try {
    const res = await runAppleScript(
      `
      on run argv
        return "hello, " & item 1 of argv & "."
      end run
      `,
      ["world"],
    );
    await showHUD(res);
  } catch (error) {
    showFailureToast(error, { title: "Could not run AppleScript" });
  }
}
```


# Raycast Utilities

In addition to the [Raycast API](../api-reference/cache.md) which is bundled as part of the app, we also provide a sibling package that contains a set of utilities to streamline common patterns and operations used in extensions.

![](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/utils-illustration.jpg)

## Installation

This package can be installed independently using `npm`.

```
npm install --save @raycast/utils
```

`@raycast/utils` has a [peer dependency](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#peerdependencies) on `@raycast/api`. This means that a certain version of `utils` will require a version above a certain version of `api`. `npm` will warn you if that is not the case.

## Changelog

### v1.18.0

- Add a new [`executeSQL](./functions/executeSQL.md) function.

### v1.17.0

- Add a new [`createDeeplink`](./functions/createDeeplink.md) function.

### v1.16.5

- Fixed the bug where `failureToastOptions` did not apply for `useExec` and `useStreamJSON` hooks.

### v1.16.4

- Avoid throwing an error when `useFetch` can't parse the `Content-Type` header of the response.

### v1.16.3

- Fix an issue where `URLSearchParams` couldn't be passed as an option to `useFetch` or `useCachedPromise`, causing extensions to crash.

### v1.16.2

- Fixed the refresh token flow to log out the user instead of throwing an error.

### v1.16.1

- Fixed an issue where `bodyEncoding` wasn't properly used in OAuthService.

### v1.16.0

- Add a `failureToastOptions` prop to `useFetch`, `useCachedPromise`, and `usePromise` to make it possible to customize the error displayed instead of a generic "Failed to fetch latest data".

### v1.15.0

- Add [`useLocalStorage`](./react-hooks/useLocalStorage.md) hook.

### v1.14.0

- Add [`useStreamJSON`](./react-hooks/useStreamJSON.md) hook.

### v1.13.6

- Updated `useFetch`'s `mapResult` type to allow returning `cursor` in addition to `data` and `hasMore`.

### v1.13.5

- Extended `PaginationOptions` with `cursor`.

### v1.13.4

- Fixed non-paginated version of `useFetch` not being re-run when `url` changes.

### v1.13.3

- Fixed `optimisticUpdate` not working when paginating beyond the first page when using `useCachedPromise` or other hooks that build on top of it..
- Fixed `useFetch` type requiring `mapResult` for non-paginated overload.

### v1.13.2

- Added default OAuth URLs for Google, Jira, and Zoom

### v1.13.1

- Fixed `useFetch` type for non-paginated overload.

### v1.13.0

- Added pagination support to `usePromise`, `useCachedPromise` and `useFetch`.

### v1.12.5

- Add string array support for OAuth scope (Thanks @tonka3000!).

### v1.12.4

- Add `tokenResponseParser` and `tokenRefreshResponseParser` in the options of `OAuthService`.
- Fix built-in Slack OAuthServices.

### v1.12.3

- Fixed bodyEncoding for some built-in OAuthServices.

### v1.12.2

- Fixed types for `OAuthService.slack`.

### v1.12.1

- Fixed the refresh flow of `OAuthService` that would return outdated tokens.

### v1.12.0

- Removed some default OAuth clientIDs that could not work with generic scopes.
- Fixed `withAccessToken` when used in no-view commands.

### v1.11.1

- Fixed Google OAuth configuration.

### v1.11.0

- Added the [OAuth utils](./oauth/README.md).

### v1.10.1

- Fix an issue where the values passed to the `reset` function of the `useForm` hook wouldn't be respected.

### v1.10.0

- Add a new [`showFailureToast`](./functions/showFailureToast.md) function.

### v1.9.1

- Fix an issue where `useForm`'s `reset` function would not reset the value of some fields (which defeats its purpose...)

### v1.9.0

- Add a new [`useFrecencySorting`](./react-hooks/useFrecencySorting.md) hook.
- Change the default `options.timeout` of `useExec` to 10s.

### v1.8.0

- Add a new [`runAppleScript`](./functions/runAppleScript.md) function.
- Change the default `options.timeout` of `useExec` to 10s.

### v1.7.1

Change the signature of [`getProgressIcon`](./icons/getProgressIcon.md) to accept a `Color` in addition to a string for the `options.background`.

### v1.7.0

Change the signature of [`getProgressIcon`](./icons/getProgressIcon.md) to accept a `Color` in addition to a string for the `color`.

### v1.6.0

Added the [`useAI`](./react-hooks/useAI.md) hook.

### v1.4.0

Added the [`useSQL`](./react-hooks/useSQL.md) hook.

### v1.3.1

- Added the `reset` method to `useForm`.

### v1.3.0

- Added the `focus` method to `useForm`.
- Added the `input` option to `useExec`.

### v1.2.0

Added [`useExec`](./react-hooks/useExec.md) and [`useForm`](./react-hooks/useForm.md) hooks.

### v1.1.0

Added [`getFavicon`](./icons/getFavicon.md) method.

### v1.0.0

First release of the utilities.


# Icons


# `getAvatarIcon`

Icon to represent an avatar when you don't have one. The generated avatar will be generated from the initials of the name and have a colorful but consistent background.

![Avatar Icon example](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/utils-avatar-icon.png)

## Signature

```ts
function getAvatarIcon(
  name: string,
  options?: {
    background?: string;
    gradient?: boolean;
  },
): Image.Asset;
```

- `name` is a string of the subject's name.
- `options.background` is a hexadecimal representation of a color to be used as the background color. By default, the hook will pick a random but consistent (eg. the same name will the same color) color from a set handpicked to nicely match Raycast.
- `options.gradient` is a boolean to choose whether the background should have a slight gradient or not. By default, it will.

Returns an [Image.Asset](../../api-reference/user-interface/icons-and-images.md) that can be used where Raycast expects them.

## Example

```tsx
import { List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";

export default function Command() {
  return (
    <List>
      <List.Item icon={getAvatarIcon("John Doe")} title="John Doe" />
    </List>
  );
}
```


# `getFavicon`

Icon showing the favicon of a website.

A favicon (favorite icon) is a tiny icon included along with a website, which is displayed in places like the browser's address bar, page tabs, and bookmarks menu.

![Favicon example](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/utils-favicon.png)

## Signature

```ts
function getFavicon(
  url: string | URL,
  options?: {
    fallback?: Image.Fallback;
    size?: boolean;
    mask?: Image.Mask;
  },
): Image.ImageLike;
```

- `name` is a string of the subject's name.
- `options.fallback` is a [Image.Fallback](../../api-reference/user-interface/icons-and-images.md#image.fallback) icon in case the Favicon is not found. By default, the fallback will be `Icon.Link`.
- `options.size` is the size of the returned favicon. By default, it is 64 pixels.
- `options.mask` is the size of the [Image.Mask](../../api-reference/user-interface/icons-and-images.md#image.mask) to apply to the favicon.

Returns an [Image.ImageLike](../../api-reference/user-interface/icons-and-images.md) that can be used where Raycast expects them.

## Example

```tsx
import { List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";

export default function Command() {
  return (
    <List>
      <List.Item icon={getFavicon("https://raycast.com")} title="Raycast Website" />
    </List>
  );
}
```


# `getProgressIcon`

Icon to represent the progress of a task, a project, _something_.

![Progress Icon example](/Users/tanerilyazov/Downloads/extensions-main/docs/.gitbook/assets/utils-progress-icon.png)

## Signature

```ts
function getProgressIcon(
  progress: number,
  color?: Color | string,
  options?: {
    background?: Color | string;
    backgroundOpacity?: number;
  },
): Image.Asset;
```

- `progress` is a number between 0 and 1 (0 meaning not started, 1 meaning finished).
- `color` is a Raycast `Color` or a hexadecimal representation of a color. By default it will be `Color.Red`.
- `options.background` is a Raycast `Color` or a hexadecimal representation of a color for the background of the progress icon. By default, it will be `white` if the Raycast's appearance is `dark`, and `black` if the appearance is `light`.
- `options.backgroundOpacity` is the opacity of the background of the progress icon. By default, it will be `0.1`.

Returns an [Image.Asset](../../api-reference/user-interface/icons-and-images.md) that can be used where Raycast expects them.

## Example

```tsx
import { List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";

export default function Command() {
  return (
    <List>
      <List.Item icon={getProgressIcon(0.1)} title="Project" />
    </List>
  );
}
```


# `OAuthService`

The `OAuthService` class is designed to abstract the OAuth authorization process using the PKCE (Proof Key for Code Exchange) flow, simplifying the integration with various OAuth providers such as Asana, GitHub, and others.

Use [OAuthServiceOptions](#oauthserviceoptions) to configure the `OAuthService` class.

## Example

```ts
const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "GitHub",
  providerIcon: "extension_icon.png",
  providerId: "github",
  description: "Connect your GitHub account",
});

const github = new OAuthService({
  client,
  clientId: "7235fe8d42157f1f38c0",
  scope: "notifications repo read:org read:user read:project",
  authorizeUrl: "https://github.oauth.raycast.com/authorize",
  tokenUrl: "https://github.oauth.raycast.com/token",
});
```

## Signature

```ts
constructor(options: OAuthServiceOptions): OAuthService
```

### Methods

#### `authorize`

Initiates the OAuth authorization process or refreshes existing tokens if necessary. Returns a promise that resolves with the access token from the authorization flow.

##### Signature

```ts
OAuthService.authorize(): Promise<string>;
```

##### Example

```typescript
const accessToken = await oauthService.authorize();
```

### Built-in Services

Some services are exposed as static properties in `OAuthService` to make it easy to authenticate with them:

- [Asana](#asana)
- [GitHub](#github)
- [Google](#google)
- [Jira](#jira)
- [Linear](#linear)
- [Slack](#slack)
- [Zoom](#zoom)

Asana, GitHub, Linear, and Slack already have an OAuth app configured by Raycast so that you can use them right of the box by specifing only the permission scopes. You are still free to create an OAuth app for them if you want.

Google, Jira and Zoom don't have an OAuth app configured by Raycast so you'll have to create one if you want to use them.

Use [ProviderOptions](#provideroptions) or [ProviderWithDefaultClientOptions](#providerwithdefaultclientoptions) to configure these built-in services.

#### Asana

##### Signature

```ts
OAuthService.asana: (options: ProviderWithDefaultClientOptions) => OAuthService
```

##### Example

```tsx
const asana = OAuthService.asana({ scope: "default" });
```

#### GitHub

##### Signature

```ts
OAuthService.github: (options: ProviderWithDefaultClientOptions) => OAuthService
```

##### Example

```tsx
const github = OAuthService.github({ scope: "repo user" });
```

#### Google

Google has verification processes based on the required scopes for your extension. Therefore, you need to configure your own client for it.

{% hint style="info" %}
Creating your own Google client ID is more tedious than other processes, so we’ve created a page to assist you: [Getting a Google client ID](./getting-google-client-id.md)
{% endhint %}


##### Signature

```ts
OAuthService.google: (options: ProviderOptions) => OAuthService
```

##### Example

```tsx
const google = OAuthService.google({
  clientId: "custom-client-id",
  scope: "https://www.googleapis.com/auth/drive.readonly",
});
```

#### Jira

Jira requires scopes to be enabled manually in the OAuth app settings. Therefore, you need to configure your own client for it.

##### Signature

```ts
OAuthService.jira: (options: ProviderOptions) => OAuthService
```

##### Example

```tsx
const jira = OAuthService.jira({
  clientId: "custom-client-id",
  scope: "read:jira-user read:jira-work offline_access",
});
```

#### Linear

##### Signature

```ts
OAuthService.linear: (options: ProviderOptions) => OAuthService
```

##### Example

```tsx
const linear = OAuthService.linear({ scope: "read write" });
```

#### Slack

##### Signature

```ts
OAuthService.slack: (options: ProviderWithDefaultClientOptions) => OAuthService
```

##### Example

```tsx
const slack = OAuthService.slack({ scope: "emoji:read" });
```

#### Zoom

Zoom requires scopes to be enabled manually in the OAuth app settings. Therefore, you need to configure your own client for it.

##### Signature

```ts
OAuthService.zoom: (options: ProviderOptions) => OAuthService
```

##### Example

```tsx
const zoom = OAuthService.zoom({
  clientId: "custom-client-id",
  scope: "meeting:write",
});
```

## Types

### OAuthServiceOptions

| Property Name                                  | Description                                                                                                                        | Type                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| client<mark style="color:red;">\*</mark>       | The PKCE Client defined using `OAuth.PKCEClient` from `@raycast/api`                                                               | `OAuth.PKCEClient`                           |
| clientId<mark style="color:red;">\*</mark>     | The app's client ID                                                                                                                | `string`                                     |
| scope<mark style="color:red;">\*</mark>        | The scope of the access requested from the provider                                                                                | `string` \| `Array<string>`                  |
| authorizeUrl<mark style="color:red;">\*</mark> | The URL to start the OAuth flow                                                                                                    | `string`                                     |
| tokenUrl<mark style="color:red;">\*</mark>     | The URL to exchange the authorization code for an access token                                                                     | `string`                                     |
| refreshTokenUrl                                | The URL to refresh the access token if applicable                                                                                  | `string`                                     |
| personalAccessToken                            | A personal token if the provider supports it                                                                                       | `string`                                     |
| onAuthorize                                    | A callback function that is called once the user has been properly logged in through OAuth when used with `withAccessToken`        | `string`                                     |
| extraParameters                                | The extra parameters you may need for the authorization request                                                                    | `Record<string, string>`                     |
| bodyEncoding                                   | Specifies the format for sending the body of the request.                                                                          | `json` \| `url-encoded`                      |
| tokenResponseParser                            | Some providers returns some non-standard token responses. Specifies how to parse the JSON response to get the access token         | `(response: unknown) => OAuth.TokenResponse` |
| tokenRefreshResponseParser                     | Some providers returns some non-standard refresh token responses. Specifies how to parse the JSON response to get the access token | `(response: unknown) => OAuth.TokenResponse` |

### ProviderOptions

| Property Name                                  | Description                                                                                                                        | Type                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| clientId<mark style="color:red;">\*</mark>     | The app's client ID                                                                                                                | `string`                                     |
| scope<mark style="color:red;">\*</mark>        | The scope of the access requested from the provider                                                                                | `string` \| `Array<string>`                  |
| authorizeUrl<mark style="color:red;">\*</mark> | The URL to start the OAuth flow                                                                                                    | `string`                                     |
| tokenUrl<mark style="color:red;">\*</mark>     | The URL to exchange the authorization code for an access token                                                                     | `string`                                     |
| refreshTokenUrl                                | The URL to refresh the access token if applicable                                                                                  | `string`                                     |
| personalAccessToken                            | A personal token if the provider supports it                                                                                       | `string`                                     |
| onAuthorize                                    | A callback function that is called once the user has been properly logged in through OAuth when used with `withAccessToken`        | `string`                                     |
| bodyEncoding                                   | Specifies the format for sending the body of the request.                                                                          | `json` \| `url-encoded`                      |
| tokenResponseParser                            | Some providers returns some non-standard token responses. Specifies how to parse the JSON response to get the access token         | `(response: unknown) => OAuth.TokenResponse` |
| tokenRefreshResponseParser                     | Some providers returns some non-standard refresh token responses. Specifies how to parse the JSON response to get the access token | `(response: unknown) => OAuth.TokenResponse` |

### ProviderWithDefaultClientOptions

| Property Name                           | Description                                                                                                                        | Type                                         |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| scope<mark style="color:red;">\*</mark> | The scope of the access requested from the provider                                                                                | `string` \| `Array<string>`                  |
| clientId                                | The app's client ID                                                                                                                | `string`                                     |
| authorizeUrl                            | The URL to start the OAuth flow                                                                                                    | `string`                                     |
| tokenUrl                                | The URL to exchange the authorization code for an access token                                                                     | `string`                                     |
| refreshTokenUrl                         | The URL to refresh the access token if applicable                                                                                  | `string`                                     |
| personalAccessToken                     | A personal token if the provider supports it                                                                                       | `string`                                     |
| onAuthorize                             | A callback function that is called once the user has been properly logged in through OAuth when used with `withAccessToken`        | `string`                                     |
| bodyEncoding                            | Specifies the format for sending the body of the request.                                                                          | `json` \| `url-encoded`                      |
| tokenResponseParser                     | Some providers returns some non-standard token responses. Specifies how to parse the JSON response to get the access token         | `(response: unknown) => OAuth.TokenResponse` |
| tokenRefreshResponseParser              | Some providers returns some non-standard refresh token responses. Specifies how to parse the JSON response to get the access token | `(response: unknown) => OAuth.TokenResponse` |


# OAuth

Dealing with OAuth can be tedious. So we've built a set of utilities to make that task way easier. There are two part to our utilities:

1. Authenticating with a service using [OAuthService](./OAuthService.md) or built-in providers (e.g GitHub with `OAuthService.github`)
2. Bringing authentication to Raycast commands using [withAccessToken](./withAccessToken.md) and [`getAccessToken`](./getAccessToken.md)

`OAuthService`, `withAccessToken`, and `getAccessToken` are designed to work together. You'll find below different use cases for which you can use these utils.

## Using a built-in provider

We provide built-in providers that you can use out of the box, such as GitHub or Linear. You don't need to configure anything for them apart from the scope your extension requires.

```tsx
import { Detail, LaunchProps } from "@raycast/api";
import { withAccessToken, getAccessToken, OAuthService } from "@raycast/utils";

const github = OAuthService.github({
  scope: "notifications repo read:org read:user read:project",
});

function AuthorizedComponent(props: LaunchProps) {
  const { token } = getAccessToken();
  return <Detail markdown={`Access token: ${token}`} />;
}

export default withAccessToken(github)(AuthorizedComponent);
```

You can see our different providers on the following page: [OAuthService](./OAuthService.md)

## Using your own client

```tsx
import { OAuth, Detail, LaunchProps } from "@raycast/api";
import { withAccessToken, getAccessToken, OAuthService } from "@raycast/utils";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Your Provider Name",
  providerIcon: "provider_icon.png",
  providerId: "yourProviderId",
  description: "Connect your {PROVIDER_NAME} account",
});

const provider = new OAuthService({
  client,
  clientId: "YOUR_CLIENT_ID",
  scope: "YOUR_SCOPES",
  authorizeUrl: "YOUR_AUTHORIZE_URL",
  tokenUrl: "YOUR_TOKEN_URL",
});

function AuthorizedComponent(props: LaunchProps) {
  const { token } = getAccessToken();
  return <Detail markdown={`Access token: ${token}`} />;
}

export default withAccessToken(provider)(AuthorizedComponent);
```

## Using `onAuthorize` to initialize an SDK or similar

This example is useful in cases where you want to initialize a third-party client and share it throughout your codebase.

```tsx
import { OAuthService } from "@raycast/utils";
import { LinearClient, LinearGraphQLClient } from "@linear/sdk";

let linearClient: LinearClient | null = null;

export const linear = OAuthService.linear({
  scope: "read write",
  onAuthorize({ token }) {
    linearClient = new LinearClient({ accessToken: token });
  },
});

export function withLinearClient<T>(Component: React.ComponentType<T>) {
  return withAccessToken<T>(linear)(Component);
}

export function getLinearClient(): { linearClient: LinearClient; graphQLClient: LinearGraphQLClient } {
  if (!linearClient) {
    throw new Error("No linear client initialized");
  }

  return { linearClient, graphQLClient: linearClient.client };
}
```


# `getAccessToken`

Utility function designed for retrieving authorization tokens within a component. It ensures that your React components have the necessary authentication state, either through OAuth or a personal access token.

{% hint style="info" %}
`getAccessToken` **must** be used within components that are nested inside a component wrapped with [`withAccessToken`](./withAccessToken.md). Otherwise, the function will fail with an error.
{% endhint %}

## Signature

```tsx
function getAccessToken(): {
  token: string;
  type: "oauth" | "personal";
};
```

### Return

The function returns an object containing the following properties:

- `token`: A string representing the access token.
- `type`: An optional string that indicates the type of token retrieved. It can either be `oauth` for OAuth tokens or `personal` for personal access tokens.

## Example

```tsx
import { Detail } from "@raycast/api";
import { authorize } from "./oauth";

function AuthorizedComponent() {
  const { token } = getAccessToken();
  return <Detail markdown={`Access token: ${token}`} />;
}

export default withAccessToken({ authorize })(AuthorizedComponent);
```


# Getting a Google Client ID

Follow these steps to get a Google client ID:

## Step 1: Access Google Cloud Console

Navigate to the [Google Cloud Console](https://console.developers.google.com/apis/credentials).

## Step 2: Create a Project (if needed)

1. Click **Create Project**.
2. Provide a **Project Name**.
3. Select an optional **Organization**.
4. Click **Create**.

## Step 3: Enable Required APIs

1. Go to **Enabled APIs & services**.
2. Click **ENABLE APIS AND SERVICES**.
3. Search for and enable the required API (e.g., Google Drive API).

## Step 4: Configure OAuth Consent Screen

1. Click on **OAuth consent screen**.
2. Choose **Internal** or **External** (choose **External** if you intend to publish the extension in the Raycast store).
3. Enter these details:
   - **App name**: Raycast (Your Extension Name)
   - **User support email**: your-email@example.com
   - **Logo**: Paste Raycast's logo over there ([Link to Raycast logo](https://raycastapp.notion.site/Raycast-Press-Kit-ce1ccf8306b14ac8b8d47b3276bf34e0#29cbc2f3841444fdbdcb1fdff2ea2abf))
   - **Application home page**: https://www.raycast.com
   - **Application privacy policy link**: https://www.raycast.com/privacy
   - **Application terms of service link**: https://www.raycast.com/terms-of-service
   - **Authorized domains**: Click **ADD DOMAIN** then add `raycast.com`
   - **Developer contact**: your-email@example.com
4. Add the necessary scopes for your app (visit the [Google OAuth scopes docs](https://developers.google.com/identity/protocols/oauth2/scopes) if you manually need to add scopes)
5. Add your own email as a test user and others if needed
6. Review and go back to the dashboard

## Step 5: Create an OAuth Client ID

1. Go to **Credentials**, click **CREATE CREDENTIALS**, then **OAuth client ID**
2. Choose **iOS** as the application type
3. Set the **Bundle ID** to `com.raycast`.
4. Copy your **Client ID**

## Step 6: Use Your New Client ID 🎉

{% hint style="info" %}
You'll need to publish the app in the **OAuth consent screen** so that everyone can use it (and not only test users). The process can be more or less complex depending on whether you use sensitive or restrictive scopes.
{% endhint %}



# `withAccessToken`

Higher-order function fetching an authorization token to then access it. This makes it easier to handle OAuth in your different commands whether they're `view` commands, `no-view` commands, or `menu-bar` commands.

## Signature

```tsx
function withAccessToken<T = any>(
  options: WithAccessTokenParameters,
): <U extends WithAccessTokenComponentOrFn<T>>(
  fnOrComponent: U,
) => U extends (props: T) => Promise<void> | void ? Promise<void> : React.FunctionComponent<T>;
```

### Arguments

`options` is an object containing:

- `options.authorize`: a function that initiates the OAuth token retrieval process. It returns a promise that resolves to an access token.
- `options.personalAccessToken`: an optional string that represents an already obtained personal access token. When `options.personalAccessToken` is provided, it uses that token. Otherwise, it calls `options.authorize` to fetch an OAuth token asynchronously.
- `options.client`: an optional instance of a PKCE Client that you can create using Raycast API. This client is used to return the `idToken` as part of the `onAuthorize` callback below.
- `options.onAuthorize`: an optional callback function that is called once the user has been properly logged in through OAuth. This function is called with the `token`, its type (`oauth` if it comes from an OAuth flow or `personal` if it's a personal access token), and `idToken` if it's returned from `options.client`'s initial token set.

### Return

Returns the wrapped component if used in a `view` command or the wrapped function if used in a `no-view` command.

{% hint style="info" %}
Note that the access token isn't injected into the wrapped component props. Instead, it's been set as a global variable that you can get with [getAccessToken](./getAccessToken.md).
{% endhint %}

## Example

{% tabs %}
{% tab title="view.tsx" %}

```tsx
import { List } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { authorize } from "./oauth";

function AuthorizedComponent(props) {
  return; // ...
}

export default withAccessToken({ authorize })(AuthorizedComponent);
```

{% endtab %}

{% tab title="no-view.tsx" %}

```tsx
import { showHUD } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { authorize } from "./oauth";

async function AuthorizedCommand() {
  await showHUD("Authorized");
}

export default withAccessToken({ authorize })(AuthorizedCommand);
```

{% endtab %}

{% tab title="onAuthorize.tsx" %}

```tsx
import { OAuthService } from "@raycast/utils";
import { LinearClient, LinearGraphQLClient } from "@linear/sdk";

let linearClient: LinearClient | null = null;

const linear = OAuthService.linear({
  scope: "read write",
  onAuthorize({ token }) {
    linearClient = new LinearClient({ accessToken: token });
  },
});

function MyIssues() {
  return; // ...
}

export default withAccessToken(linear)(View);
```

{% endtab %}
{% endtabs %}

## Types

### WithAccessTokenParameters

```ts
type OAuthType = "oauth" | "personal";

type OnAuthorizeParams = {
  token: string;
  type: OAuthType;
  idToken: string | null; // only present if `options.client` has been provided
};

type WithAccessTokenParameters = {
  client?: OAuth.PKCEClient;
  authorize: () => Promise<string>;
  personalAccessToken?: string;
  onAuthorize?: (params: OnAuthorizeParams) => void;
};
```

### WithAccessTokenComponentOrFn

```ts
type WithAccessTokenComponentOrFn<T = any> = ((params: T) => Promise<void> | void) | React.ComponentType<T>;
```


# React Hooks


# `useAI`

Hook which asks the AI to answer a prompt and returns the [AsyncState](#asyncstate) corresponding to the execution of the query.

## Signature

```ts
function useAI(
  prompt: string,
  options?: {
    creativity?: AI.Creativity;
    model?: AI.Model;
    stream?: boolean;
    execute?: boolean;
    onError?: (error: Error) => void;
    onData?: (data: T) => void;
    onWillExecute?: (args: Parameters<T>) => void;
    failureToastOptions?: Partial<Pick<Toast.Options, "title" | "primaryAction" | "message">>;
  }
): AsyncState<String> & {
  revalidate: () => void;
};
```

### Arguments

- `prompt` is the prompt to ask the AI.

With a few options:

- `options.creativity` is a number between 0 and 2 to control the creativity of the answer. Concrete tasks, such as fixing grammar, require less creativity while open-ended questions, such as generating ideas, require more.
- `options.model` is a string determining which AI model will be used to answer.
- `options.stream` is a boolean controlling whether to stream the answer or only update the data when the entire answer has been received. By default, the `data` will be streamed.

Including the [usePromise](./usePromise.md)'s options:

- `options.execute` is a boolean to indicate whether to actually execute the function or not. This is useful for cases where one of the function's arguments depends on something that might not be available right away (for example, depends on some user inputs). Because React requires every hook to be defined on the render, this flag enables you to define the hook right away but wait until you have all the arguments ready to execute the function.
- `options.onError` is a function called when an execution fails. By default, it will log the error and show a generic failure toast with an action to retry.
- `options.onData` is a function called when an execution succeeds.
- `options.onWillExecute` is a function called when an execution will start.
- `options.failureToastOptions` are the options to customize the title, message, and primary action of the failure toast.

### Return

Returns an object with the [AsyncState](#asyncstate) corresponding to the execution of the function as well as a couple of methods to manipulate it.

- `data`, `error`, `isLoading` - see [AsyncState](#asyncstate).
- `revalidate` is a method to manually call the function with the same arguments again.

## Example

```tsx
import { Detail } from "@raycast/api";
import { useAI } from "@raycast/utils";

export default function Command() {
  const { data, isLoading } = useAI("Suggest 5 jazz songs");

  return <Detail isLoading={isLoading} markdown={data} />;
}
```

## Types

### AsyncState

An object corresponding to the execution state of the function.

```ts
// Initial State
{
  isLoading: true, // or `false` if `options.execute` is `false`
  data: undefined,
  error: undefined
}

// Success State
{
  isLoading: false,
  data: string,
  error: undefined
}

// Error State
{
  isLoading: false,
  data: undefined,
  error: Error
}

// Reloading State
{
  isLoading: true,
  data: string | undefined,
  error: Error | undefined
}
```


# `useCachedPromise`

Hook which wraps an asynchronous function or a function that returns a Promise and returns the [AsyncState](#asyncstate) corresponding to the execution of the function.

It follows the `stale-while-revalidate` cache invalidation strategy popularized by [HTTP RFC 5861](https://tools.ietf.org/html/rfc5861). `useCachedPromise` first returns the data from cache (stale), then executes the promise (revalidate), and finally comes with the up-to-date data again.

The last value will be kept between command runs.

{% hint style="info" %}
The value needs to be JSON serializable.
The function is assumed to be constant (eg. changing it won't trigger a revalidation).
{% endhint %}

## Signature

```ts
type Result<T> = `type of the returned value of the returned Promise`;

function useCachedPromise<T, U>(
  fn: T,
  args?: Parameters<T>,
  options?: {
    initialData?: U;
    keepPreviousData?: boolean;
    abortable?: MutableRefObject<AbortController | null | undefined>;
    execute?: boolean;
    onError?: (error: Error) => void;
    onData?: (data: Result<T>) => void;
    onWillExecute?: (args: Parameters<T>) => void;
    failureToastOptions?: Partial<Pick<Toast.Options, "title" | "primaryAction" | "message">>;
  },
): AsyncState<Result<T>> & {
  revalidate: () => void;
  mutate: MutatePromise<Result<T> | U>;
};
```

### Arguments

- `fn` is an asynchronous function or a function that returns a Promise.
- `args` is the array of arguments to pass to the function. Every time they change, the function will be executed again. You can omit the array if the function doesn't require any argument.

With a few options:

- `options.keepPreviousData` is a boolean to tell the hook to keep the previous results instead of returning the initial value if there aren't any in the cache for the new arguments. This is particularly useful when used for data for a List to avoid flickering. See [Promise Argument dependent on List search text](#promise-argument-dependent-on-list-search-text) for more information.

Including the [useCachedState](./useCachedState.md)'s options:

- `options.initialData` is the initial value of the state if there aren't any in the Cache yet.

Including the [usePromise](./usePromise.md)'s options:

- `options.abortable` is a reference to an [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) to cancel a previous call when triggering a new one.
- `options.execute` is a boolean to indicate whether to actually execute the function or not. This is useful for cases where one of the function's arguments depends on something that might not be available right away (for example, depends on some user inputs). Because React requires every hook to be defined on the render, this flag enables you to define the hook right away but wait until you have all the arguments ready to execute the function.
- `options.onError` is a function called when an execution fails. By default, it will log the error and show a generic failure toast with an action to retry.
- `options.onData` is a function called when an execution succeeds.
- `options.onWillExecute` is a function called when an execution will start.
- `options.failureToastOptions` are the options to customize the title, message, and primary action of the failure toast.

### Return

Returns an object with the [AsyncState](#asyncstate) corresponding to the execution of the function as well as a couple of methods to manipulate it.

- `data`, `error`, `isLoading` - see [AsyncState](#asyncstate).
- `revalidate` is a method to manually call the function with the same arguments again.
- `mutate` is a method to wrap an asynchronous update and gives some control over how the `useCachedPromise`'s data should be updated while the update is going through. By default, the data will be revalidated (eg. the function will be called again) after the update is done. See [Mutation and Optimistic Updates](#mutation-and-optimistic-updates) for more information.

## Example

```tsx
import { Detail, ActionPanel, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

export default function Command() {
  const abortable = useRef<AbortController>();
  const { isLoading, data, revalidate } = useCachedPromise(
    async (url: string) => {
      const response = await fetch(url, { signal: abortable.current?.signal });
      const result = await response.text();
      return result;
    },
    ["https://api.example"],
    {
      initialData: "Some Text",
      abortable,
    },
  );

  return (
    <Detail
      isLoading={isLoading}
      markdown={data}
      actions={
        <ActionPanel>
          <Action title="Reload" onAction={() => revalidate()} />
        </ActionPanel>
      }
    />
  );
}
```

## Promise Argument dependent on List search text

By default, when an argument passed to the hook changes, the function will be executed again and the cache's value for those arguments will be returned immediately. This means that in the case of new arguments that haven't been used yet, the initial data will be returned.

This behaviour can cause some flickering (initial data -> fetched data -> arguments change -> initial data -> fetched data, etc.). To avoid that, we can set `keepPreviousData` to `true` and the hook will keep the latest fetched data if the cache is empty for the new arguments (initial data -> fetched data -> arguments change -> fetched data).

```tsx
import { useState } from "react";
import { List, ActionPanel, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { isLoading, data } = useCachedPromise(
    async (url: string) => {
      const response = await fetch(url);
      const result = await response.json();
      return result;
    },
    [`https://api.example?q=${searchText}`],
    {
      // to make sure the screen isn't flickering when the searchText changes
      keepPreviousData: true,
    },
  );

  return (
    <List isLoading={isLoading} searchText={searchText} onSearchTextChange={setSearchText} throttle>
      {(data || []).map((item) => (
        <List.Item key={item.id} title={item.title} />
      ))}
    </List>
  );
}
```

## Mutation and Optimistic Updates

In an optimistic update, the UI behaves as though a change was successfully completed before receiving confirmation from the server that it was - it is being optimistic that it will eventually get the confirmation rather than an error. This allows for a more responsive user experience.

You can specify an `optimisticUpdate` function to mutate the data in order to reflect the change introduced by the asynchronous update.

When doing so, you can specify a `rollbackOnError` function to mutate back the data if the asynchronous update fails. If not specified, the data will be automatically rolled back to its previous value (before the optimistic update).

```tsx
import { Detail, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

export default function Command() {
  const { isLoading, data, mutate } = useCachedPromise(
    async (url: string) => {
      const response = await fetch(url);
      const result = await response.text();
      return result;
    },
    ["https://api.example"],
  );

  const appendFoo = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Appending Foo" });
    try {
      await mutate(
        // we are calling an API to do something
        fetch("https://api.example/append-foo"),
        {
          // but we are going to do it on our local data right away,
          // without waiting for the call to return
          optimisticUpdate(data) {
            return data + "foo";
          },
        },
      );
      // yay, the API call worked!
      toast.style = Toast.Style.Success;
      toast.title = "Foo appended";
    } catch (err) {
      // oh, the API call didn't work :(
      // the data will automatically be rolled back to its previous value
      toast.style = Toast.Style.Failure;
      toast.title = "Could not append Foo";
      toast.message = err.message;
    }
  };

  return (
    <Detail
      isLoading={isLoading}
      markdown={data}
      actions={
        <ActionPanel>
          <Action title="Append Foo" onAction={() => appendFoo()} />
        </ActionPanel>
      }
    />
  );
}
```

## Pagination

{% hint style="info" %}
When paginating, the hook will only cache the result of the first page.
{% endhint %}

The hook has built-in support for pagination. In order to enable pagination, `fn`'s type needs to change from

> an asynchronous function or a function that returns a Promise

to

> a function that returns an asynchronous function or a function that returns a Promise

In practice, this means going from

```ts
const { isLoading, data } = useCachedPromise(
  async (searchText: string) => {
    const response = await fetch(`https://api.example?q=${searchText}`);
    const data = await response.json();
    return data;
  },
  [searchText],
  {
    // to make sure the screen isn't flickering when the searchText changes
    keepPreviousData: true,
  },
);
```

to

```ts
const { isLoading, data, pagination } = useCachedPromise(
  (searchText: string) => async (options) => {
    const response = await fetch(`https://api.example?q=${searchText}&page=${options.page}`);
    const { data } = await response.json();
    const hasMore = options.page < 50;
    return { data, hasMore };
  },
  [searchText],
  {
    // to make sure the screen isn't flickering when the searchText changes
    keepPreviousData: true,
  },
);
```

or, if your data source uses cursor-based pagination, you can return a `cursor` alongside `data` and `hasMore`, and the cursor will be passed as an argument the next time the function gets called:

```ts
const { isLoading, data, pagination } = useCachedPromise(
  (searchText: string) => async (options) => {
    const response = await fetch(`https://api.example?q=${searchText}&cursor=${options.cursor}`);
    const { data, nextCursor } = await response.json();
    const hasMore = nextCursor !== undefined;
    return { data, hasMore, cursor: nextCursor };
  },
  [searchText],
  {
    // to make sure the screen isn't flickering when the searchText changes
    keepPreviousData: true,
  },
);
```

You'll notice that, in the second case, the hook returns an additional item: `pagination`. This can be passed to Raycast's `List` or `Grid` components in order to enable pagination.
Another thing to notice is that the async function receives a [PaginationOptions](#paginationoptions) argument, and returns a specific data format:

```ts
{
  data: any[];
  hasMore: boolean;
  cursor?: any;
}
```

Every time the promise resolves, the hook needs to figure out if it should paginate further, or if it should stop, and it uses `hasMore` for this.
In addition to this, the hook also needs `data`, and needs it to be an array, because internally it appends it to a list, thus making sure the `data` that the hook _returns_ always contains the data for all of the pages that have been loaded so far.

### Full Example

```tsx
import { setTimeout } from "node:timers/promises";
import { useState } from "react";
import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { isLoading, data, pagination } = useCachedPromise(
    (searchText: string) => async (options: { page: number }) => {
      await setTimeout(200);
      const newData = Array.from({ length: 25 }, (_v, index) => ({
        index,
        page: options.page,
        text: searchText,
      }));
      return { data: newData, hasMore: options.page < 10 };
    },
    [searchText],
  );

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} pagination={pagination}>
      {data?.map((item) => (
        <List.Item
          key={`${item.page} ${item.index} ${item.text}`}
          title={`Page ${item.page} Item ${item.index}`}
          subtitle={item.text}
        />
      ))}
    </List>
  );
}
```

## Types

### AsyncState

An object corresponding to the execution state of the function.

```ts
// Initial State
{
  isLoading: true, // or `false` if `options.execute` is `false`
  data: undefined,
  error: undefined
}

// Success State
{
  isLoading: false,
  data: T,
  error: undefined
}

// Error State
{
  isLoading: false,
  data: undefined,
  error: Error
}

// Reloading State
{
  isLoading: true,
  data: T | undefined,
  error: Error | undefined
}
```

### MutatePromise

A method to wrap an asynchronous update and gives some control about how the `useCachedPromise`'s data should be updated while the update is going through.

```ts
export type MutatePromise<T> = (
  asyncUpdate?: Promise<any>,
  options?: {
    optimisticUpdate?: (data: T) => T;
    rollbackOnError?: boolean | ((data: T) => T);
    shouldRevalidateAfter?: boolean;
  },
) => Promise<any>;
```

### PaginationOptions

An object passed to a `PaginatedPromise`, it has two properties:

- `page`: 0-indexed, this it's incremented every time the promise resolves, and is reset whenever `revalidate()` is called.
- `lastItem`: this is a copy of the last item in the `data` array from the last time the promise was executed. Provided for APIs that implement cursor-based pagination.
- `cursor`: this is the `cursor` property returned after the previous execution of `PaginatedPromise`. Useful when working with APIs that provide the next cursor explicitly.

```ts
export type PaginationOptions<T = any> = {
  page: number;
  lastItem?: T;
  cursor?: any;
};
```


# `useCachedState`

Hook which returns a stateful value, and a function to update it. It is similar to React's `useState` but the value will be kept between command runs.

{% hint style="info" %}
The value needs to be JSON serializable.
{% endhint %}

## Signature

```ts
function useCachedState<T>(
  key: string,
  initialState?: T,
  config?: {
    cacheNamespace?: string;
  },
): [T, (newState: T | ((prevState: T) => T)) => void];
```

### Arguments

- `key` is the unique identifier of the state. This can be used to share the state across components and/or commands (hooks using the same key will share the same state, eg. updating one will update the others).

With a few options:

- `initialState` is the initial value of the state if there aren't any in the Cache yet.
- `config.cacheNamespace` is a string that can be used to namespace the key.

## Example

```tsx
import { List, ActionPanel, Action } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

export default function Command() {
  const [showDetails, setShowDetails] = useCachedState("show-details", false);

  return (
    <List
      isShowingDetail={showDetails}
      actions={
        <ActionPanel>
          <Action title={showDetails ? "Hide Details" : "Show Details"} onAction={() => setShowDetails((x) => !x)} />
        </ActionPanel>
      }
    >
      ...
    </List>
  );
}
```


# `useExec`

Hook that executes a command and returns the [AsyncState](#asyncstate) corresponding to the execution of the command.

It follows the `stale-while-revalidate` cache invalidation strategy popularized by [HTTP RFC 5861](https://tools.ietf.org/html/rfc5861). `useExec` first returns the data from cache (stale), then executes the command (revalidate), and finally comes with the up-to-date data again.

The last value will be kept between command runs.

## Signature

There are two ways to use the hook.

The first one should be preferred when executing a single file. The file and its arguments don't have to be escaped.

```ts
function useExec<T, U>(
  file: string,
  arguments: string[],
  options?: {
    shell?: boolean | string;
    stripFinalNewline?: boolean;
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    encoding?: BufferEncoding | "buffer";
    input?: string | Buffer;
    timeout?: number;
    parseOutput?: ParseExecOutputHandler<T>;
    initialData?: U;
    keepPreviousData?: boolean;
    execute?: boolean;
    onError?: (error: Error) => void;
    onData?: (data: T) => void;
    onWillExecute?: (args: string[]) => void;
    failureToastOptions?: Partial<Pick<Toast.Options, "title" | "primaryAction" | "message">>;
  }
): AsyncState<T> & {
  revalidate: () => void;
  mutate: MutatePromise<T | U | undefined>;
};
```

The second one can be used to execute more complex commands. The file and arguments are specified in a single `command` string. For example, `useExec('echo', ['Raycast'])` is the same as `useExec('echo Raycast')`.

If the file or an argument contains spaces, they must be escaped with backslashes. This matters especially if `command` is not a constant but a variable, for example with `environment.supportPath` or `process.cwd()`. Except for spaces, no escaping/quoting is needed.

The `shell` option must be used if the command uses shell-specific features (for example, `&&` or `||`), as opposed to being a simple file followed by its arguments.

```ts
function useExec<T, U>(
  command: string,
  options?: {
    shell?: boolean | string;
    stripFinalNewline?: boolean;
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    encoding?: BufferEncoding | "buffer";
    input?: string | Buffer;
    timeout?: number;
    parseOutput?: ParseExecOutputHandler<T>;
    initialData?: U;
    keepPreviousData?: boolean;
    execute?: boolean;
    onError?: (error: Error) => void;
    onData?: (data: T) => void;
    onWillExecute?: (args: string[]) => void;
    failureToastOptions?: Partial<Pick<Toast.Options, "title" | "primaryAction" | "message">>;
  }
): AsyncState<T> & {
  revalidate: () => void;
  mutate: MutatePromise<T | U | undefined>;
};
```

### Arguments

- `file` is the path to the file to execute.
- `arguments` is an array of strings to pass as arguments to the file.

or

- `command` is the string to execute.

With a few options:

- `options.shell` is a boolean or a string to tell whether to run the command inside of a shell or not. If `true`, uses `/bin/sh`. A different shell can be specified as a string. The shell should understand the `-c` switch.

  We recommend against using this option since it is:

  - not cross-platform, encouraging shell-specific syntax.
  - slower, because of the additional shell interpretation.
  - unsafe, potentially allowing command injection.

- `options.stripFinalNewline` is a boolean to tell the hook to strip the final newline character from the output. By default, it will.
- `options.cwd` is a string to specify the current working directory of the child process. By default, it will be `process.cwd()`.
- `options.env` is a key-value pairs to set as the environment of the child process. It will extend automatically from `process.env`.
- `options.encoding` is a string to specify the character encoding used to decode the `stdout` and `stderr` output. If set to `"buffer"`, then `stdout` and `stderr` will be a `Buffer` instead of a string.
- `options.input` is a string or a Buffer to write to the `stdin` of the file.
- `options.timeout` is a number. If greater than `0`, the parent will send the signal `SIGTERM` if the child runs longer than timeout milliseconds. By default, the execution will timeout after 10000ms (eg. 10s).
- `options.parseOutput` is a function that accepts the output of the child process as an argument and returns the data the hooks will return - see [ParseExecOutputHandler](#parseexecoutputhandler). By default, the hook will return `stdout`.

Including the [useCachedPromise](./useCachedPromise.md)'s options:

- `options.keepPreviousData` is a boolean to tell the hook to keep the previous results instead of returning the initial value if there aren't any in the cache for the new arguments. This is particularly useful when used for data for a List to avoid flickering. See [Argument dependent on user input](#argument-dependent-on-user-input) for more information.

Including the [useCachedState](./useCachedState.md)'s options:

- `options.initialData` is the initial value of the state if there aren't any in the Cache yet.

Including the [usePromise](./usePromise.md)'s options:

- `options.execute` is a boolean to indicate whether to actually execute the function or not. This is useful for cases where one of the function's arguments depends on something that might not be available right away (for example, depends on some user inputs). Because React requires every hook to be defined on the render, this flag enables you to define the hook right away but wait until you have all the arguments ready to execute the function.
- `options.onError` is a function called when an execution fails. By default, it will log the error and show a generic failure toast with an action to retry.
- `options.onData` is a function called when an execution succeeds.
- `options.onWillExecute` is a function called when an execution will start.
- `options.failureToastOptions` are the options to customize the title, message, and primary action of the failure toast.

### Return

Returns an object with the [AsyncState](#asyncstate) corresponding to the execution of the command as well as a couple of methods to manipulate it.

- `data`, `error`, `isLoading` - see [AsyncState](#asyncstate).
- `revalidate` is a method to manually call the function with the same arguments again.
- `mutate` is a method to wrap an asynchronous update and gives some control over how the `useFetch`'s data should be updated while the update is going through. By default, the data will be revalidated (eg. the function will be called again) after the update is done. See [Mutation and Optimistic Updates](#mutation-and-optimistic-updates) for more information.

## Example

```tsx
import { List } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { cpus } from "os";
import { useMemo } from "react";

const brewPath = cpus()[0].model.includes("Apple") ? "/opt/homebrew/bin/brew" : "/usr/local/bin/brew";

export default function Command() {
  const { isLoading, data } = useExec(brewPath, ["info", "--json=v2", "--installed"]);
  const results = useMemo<{ id: string; name: string }[]>(() => JSON.parse(data || "{}").formulae || [], [data]);

  return (
    <List isLoading={isLoading}>
      {results.map((item) => (
        <List.Item key={item.id} title={item.name} />
      ))}
    </List>
  );
}
```

## Argument dependent on user input

By default, when an argument passed to the hook changes, the function will be executed again and the cache's value for those arguments will be returned immediately. This means that in the case of new arguments that haven't been used yet, the initial data will be returned.

This behaviour can cause some flickering (initial data -> fetched data -> arguments change -> initial data -> fetched data, etc.). To avoid that, we can set `keepPreviousData` to `true` and the hook will keep the latest fetched data if the cache is empty for the new arguments (initial data -> fetched data -> arguments change -> fetched data).

```tsx
import { useState } from "react";
import { Detail, ActionPanel, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { isLoading, data } = useExec("brew", ["info", searchText]);

  return <Detail isLoading={isLoading} markdown={data} />;
}
```

{% hint style="info" %}
When passing a user input to a command, be very careful about using the `shell` option as it could be potentially dangerous.
{% endhint %}

## Mutation and Optimistic Updates

In an optimistic update, the UI behaves as though a change was successfully completed before receiving confirmation from the server that it was - it is being optimistic that it will eventually get the confirmation rather than an error. This allows for a more responsive user experience.

You can specify an `optimisticUpdate` function to mutate the data in order to reflect the change introduced by the asynchronous update.

When doing so, you can specify a `rollbackOnError` function to mutate back the data if the asynchronous update fails. If not specified, the data will be automatically rolled back to its previous value (before the optimistic update).

```tsx
import { Detail, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";

export default function Command() {
  const { isLoading, data, revalidate } = useExec("brew", ["info", "--json=v2", "--installed"]);
  const results = useMemo<{}[]>(() => JSON.parse(data || "[]"), [data]);

  const installFoo = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Installing Foo" });
    try {
      await mutate(
        // we are calling an API to do something
        installBrewCask("foo"),
        {
          // but we are going to do it on our local data right away,
          // without waiting for the call to return
          optimisticUpdate(data) {
            return data?.concat({ name: "foo", id: "foo" });
          },
        },
      );
      // yay, the API call worked!
      toast.style = Toast.Style.Success;
      toast.title = "Foo installed";
    } catch (err) {
      // oh, the API call didn't work :(
      // the data will automatically be rolled back to its previous value
      toast.style = Toast.Style.Failure;
      toast.title = "Could not install Foo";
      toast.message = err.message;
    }
  };

  return (
    <List isLoading={isLoading}>
      {(data || []).map((item) => (
        <List.Item
          key={item.id}
          title={item.name}
          actions={
            <ActionPanel>
              <Action title="Install Foo" onAction={() => installFoo()} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```

## Types

### AsyncState

An object corresponding to the execution state of the function.

```ts
// Initial State
{
  isLoading: true, // or `false` if `options.execute` is `false`
  data: undefined,
  error: undefined
}

// Success State
{
  isLoading: false,
  data: T,
  error: undefined
}

// Error State
{
  isLoading: false,
  data: undefined,
  error: Error
}

// Reloading State
{
  isLoading: true,
  data: T | undefined,
  error: Error | undefined
}
```

### MutatePromise

A method to wrap an asynchronous update and gives some control about how the `useFetch`'s data should be updated while the update is going through.

```ts
export type MutatePromise<T> = (
  asyncUpdate?: Promise<any>,
  options?: {
    optimisticUpdate?: (data: T) => T;
    rollbackOnError?: boolean | ((data: T) => T);
    shouldRevalidateAfter?: boolean;
  },
) => Promise<any>;
```

### ParseExecOutputHandler

A function that accepts the output of the child process as an argument and returns the data the hooks will return.

```ts
export type ParseExecOutputHandler<T> = (args: {
  /** The output of the process on stdout. */
  stdout: string | Buffer; // depends on the encoding option
  /** The output of the process on stderr. */
  stderr: string | Buffer; // depends on the encoding option
  error?: Error | undefined;
  /** The numeric exit code of the process that was run. */
  exitCode: number | null;
  /** The name of the signal that was used to terminate the process. For example, SIGFPE. */
  signal: NodeJS.Signals | null;
  /** Whether the process timed out. */
  timedOut: boolean;
  /** The command that was run, for logging purposes. */
  command: string;
  /** The options passed to the child process, for logging purposes. */
  options?: ExecOptions | undefined;
}) => T;
```


# `useFetch`

Hook which fetches the URL and returns the [AsyncState](#asyncstate) corresponding to the execution of the fetch.

It follows the `stale-while-revalidate` cache invalidation strategy popularized by [HTTP RFC 5861](https://tools.ietf.org/html/rfc5861). `useFetch` first returns the data from cache (stale), then sends the request (revalidate), and finally comes with the up-to-date data again.

The last value will be kept between command runs.

## Signature

```ts
export function useFetch<V, U, T = V>(
  url: RequestInfo,
  options?: RequestInit & {
    parseResponse?: (response: Response) => Promise<V>;
    mapResult?: (result: V) => { data: T };
    initialData?: U;
    keepPreviousData?: boolean;
    execute?: boolean;
    onError?: (error: Error) => void;
    onData?: (data: T) => void;
    onWillExecute?: (args: [string, RequestInit]) => void;
    failureToastOptions?: Partial<Pick<Toast.Options, "title" | "primaryAction" | "message">>;
  },
): AsyncState<T> & {
  revalidate: () => void;
  mutate: MutatePromise<T | U | undefined>;
};
```

### Arguments

- `url` is the string representation of the URL to fetch.

With a few options:

- `options` extends [`RequestInit`](https://github.com/nodejs/undici/blob/v5.7.0/types/fetch.d.ts#L103-L117) allowing you to specify a body, headers, etc. to apply to the request.
- `options.parseResponse` is a function that accepts the Response as an argument and returns the data the hook will return. By default, the hook will return `response.json()` if the response has a JSON `Content-Type` header or `response.text()` otherwise.
- `options.mapResult` is an optional function that accepts whatever `options.parseResponse` returns as an argument, processes the response, and returns an object wrapping the result, i.e. `(response) => { return { data: response> } };`.

Including the [useCachedPromise](./useCachedPromise.md)'s options:

- `options.keepPreviousData` is a boolean to tell the hook to keep the previous results instead of returning the initial value if there aren't any in the cache for the new arguments. This is particularly useful when used for data for a List to avoid flickering. See [Argument dependent on List search text](#argument-dependent-on-list-search-text) for more information.

Including the [useCachedState](./useCachedState.md)'s options:

- `options.initialData` is the initial value of the state if there aren't any in the Cache yet.

Including the [usePromise](./usePromise.md)'s options:

- `options.execute` is a boolean to indicate whether to actually execute the function or not. This is useful for cases where one of the function's arguments depends on something that might not be available right away (for example, depends on some user inputs). Because React requires every hook to be defined on the render, this flag enables you to define the hook right away but wait until you have all the arguments ready to execute the function.
- `options.onError` is a function called when an execution fails. By default, it will log the error and show a generic failure toast with an action to retry.
- `options.onData` is a function called when an execution succeeds.
- `options.onWillExecute` is a function called when an execution will start.
- `options.failureToastOptions` are the options to customize the title, message, and primary action of the failure toast.

### Return

Returns an object with the [AsyncState](#asyncstate) corresponding to the execution of the fetch as well as a couple of methods to manipulate it.

- `data`, `error`, `isLoading` - see [AsyncState](#asyncstate).
- `revalidate` is a method to manually call the function with the same arguments again.
- `mutate` is a method to wrap an asynchronous update and gives some control over how the `useFetch`'s data should be updated while the update is going through. By default, the data will be revalidated (eg. the function will be called again) after the update is done. See [Mutation and Optimistic Updates](#mutation-and-optimistic-updates) for more information.

## Example

```tsx
import { Detail, ActionPanel, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";

export default function Command() {
  const { isLoading, data, revalidate } = useFetch("https://api.example");

  return (
    <Detail
      isLoading={isLoading}
      markdown={data}
      actions={
        <ActionPanel>
          <Action title="Reload" onAction={() => revalidate()} />
        </ActionPanel>
      }
    />
  );
}
```

## Argument dependent on List search text

By default, when an argument passed to the hook changes, the function will be executed again and the cache's value for those arguments will be returned immediately. This means that in the case of new arguments that haven't been used yet, the initial data will be returned.

This behaviour can cause some flickering (initial data -> fetched data -> arguments change -> initial data -> fetched data, etc.). To avoid that, we can set `keepPreviousData` to `true` and the hook will keep the latest fetched data if the cache is empty for the new arguments (initial data -> fetched data -> arguments change -> fetched data).

```tsx
import { useState } from "react";
import { List, ActionPanel, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { isLoading, data } = useFetch(`https://api.example?q=${searchText}`, {
    // to make sure the screen isn't flickering when the searchText changes
    keepPreviousData: true,
  });

  return (
    <List isLoading={isLoading} searchText={searchText} onSearchTextChange={setSearchText} throttle>
      {(data || []).map((item) => (
        <List.Item key={item.id} title={item.title} />
      ))}
    </List>
  );
}
```

## Mutation and Optimistic Updates

In an optimistic update, the UI behaves as though a change was successfully completed before receiving confirmation from the server that it was - it is being optimistic that it will eventually get the confirmation rather than an error. This allows for a more responsive user experience.

You can specify an `optimisticUpdate` function to mutate the data in order to reflect the change introduced by the asynchronous update.

When doing so, you can specify a `rollbackOnError` function to mutate back the data if the asynchronous update fails. If not specified, the data will be automatically rolled back to its previous value (before the optimistic update).

```tsx
import { Detail, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";

export default function Command() {
  const { isLoading, data, mutate } = useFetch("https://api.example");

  const appendFoo = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Appending Foo" });
    try {
      await mutate(
        // we are calling an API to do something
        fetch("https://api.example/append-foo"),
        {
          // but we are going to do it on our local data right away,
          // without waiting for the call to return
          optimisticUpdate(data) {
            return data + "foo";
          },
        },
      );
      // yay, the API call worked!
      toast.style = Toast.Style.Success;
      toast.title = "Foo appended";
    } catch (err) {
      // oh, the API call didn't work :(
      // the data will automatically be rolled back to its previous value
      toast.style = Toast.Style.Failure;
      toast.title = "Could not append Foo";
      toast.message = err.message;
    }
  };

  return (
    <Detail
      isLoading={isLoading}
      markdown={data}
      actions={
        <ActionPanel>
          <Action title="Append Foo" onAction={() => appendFoo()} />
        </ActionPanel>
      }
    />
  );
}
```

## Pagination

{% hint style="info" %}
When paginating, the hook will only cache the result of the first page.
{% endhint %}

The hook has built-in support for pagination. In order to enable pagination, `url`s type needs to change from `RequestInfo` to a function that receives a [PaginationOptions](#paginationoptions) argument, and returns a `RequestInfo`.

In practice, this means going from

```ts
const { isLoading, data } = useFetch(
  "https://api.ycombinator.com/v0.1/companies?" + new URLSearchParams({ q: searchText }).toString(),
  {
    mapResult(result: SearchResult) {
      return {
        data: result.companies,
      };
    },
    keepPreviousData: true,
    initialData: [],
  },
);
```

to

```ts
const { isLoading, data, pagination } = useFetch(
  (options) =>
    "https://api.ycombinator.com/v0.1/companies?" +
    new URLSearchParams({ page: String(options.page + 1), q: searchText }).toString(),
  {
    mapResult(result: SearchResult) {
      return {
        data: result.companies,
        hasMore: result.page < result.totalPages,
      };
    },
    keepPreviousData: true,
    initialData: [],
  },
);
```

or, if your data source uses cursor-based pagination, you can return a `cursor` alongside `data` and `hasMore`, and the cursor will be passed as an argument the next time the function gets called:

```ts
const { isLoading, data, pagination } = useFetch(
  (options) =>
    "https://api.ycombinator.com/v0.1/companies?" +
    new URLSearchParams({ cursor: options.cursor, q: searchText }).toString(),
  {
    mapResult(result: SearchResult) {
      const { companies, nextCursor } = result;
      const hasMore = nextCursor !== undefined;
      return { data: companies, hasMore, cursor: nextCursor, };
    },
    keepPreviousData: true,
    initialData: [],
  },
);
```

You'll notice that, in the second case, the hook returns an additional item: `pagination`. This can be passed to Raycast's `List` or `Grid` components in order to enable pagination.
Another thing to notice is that `mapResult`, which is normally optional, is actually required when using pagination. Furthermore, its return type is

```ts
{
  data: any[],
  hasMore?: boolean;
  cursor?: any;
}
```

Every time the URL is fetched, the hook needs to figure out if it should paginate further, or if it should stop, and it uses the `hasMore` for this.
In addition to this, the hook also needs `data`, and needs it to be an array, because internally it appends it to a list, thus making sure the `data` that the hook _returns_ always contains the data for all of the pages that have been fetched so far.

### Full Example

```tsx
import { Icon, Image, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

type SearchResult = { companies: Company[]; page: number; totalPages: number };
type Company = { id: number; name: string; smallLogoUrl?: string };
export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { isLoading, data, pagination } = useFetch(
    (options) =>
      "https://api.ycombinator.com/v0.1/companies?" +
      new URLSearchParams({ page: String(options.page + 1), q: searchText }).toString(),
    {
      mapResult(result: SearchResult) {
        return {
          data: result.companies,
          hasMore: result.page < result.totalPages,
        };
      },
      keepPreviousData: true,
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading} pagination={pagination} onSearchTextChange={setSearchText}>
      {data.map((company) => (
        <List.Item
          key={company.id}
          icon={{ source: company.smallLogoUrl ?? Icon.MinusCircle, mask: Image.Mask.RoundedRectangle }}
          title={company.name}
        />
      ))}
    </List>
  );
}
```

## Types

### AsyncState

An object corresponding to the execution state of the function.

```ts
// Initial State
{
  isLoading: true, // or `false` if `options.execute` is `false`
  data: undefined,
  error: undefined
}

// Success State
{
  isLoading: false,
  data: T,
  error: undefined
}

// Error State
{
  isLoading: false,
  data: undefined,
  error: Error
}

// Reloading State
{
  isLoading: true,
  data: T | undefined,
  error: Error | undefined
}
```

### MutatePromise

A method to wrap an asynchronous update and gives some control about how the `useFetch`'s data should be updated while the update is going through.

```ts
export type MutatePromise<T> = (
  asyncUpdate?: Promise<any>,
  options?: {
    optimisticUpdate?: (data: T) => T;
    rollbackOnError?: boolean | ((data: T) => T);
    shouldRevalidateAfter?: boolean;
  },
) => Promise<any>;
```

### PaginationOptions

An object passed to a `PaginatedRequestInfo`, it has two properties:

- `page`: 0-indexed, this it's incremented every time the promise resolves, and is reset whenever `revalidate()` is called.
- `lastItem`: this is a copy of the last item in the `data` array from the last time the promise was executed. Provided for APIs that implement cursor-based pagination.
- `cursor`: this is the `cursor` property returned after the previous execution of `PaginatedPromise`. Useful when working with APIs that provide the next cursor explicitly.

```ts
export type PaginationOptions<T = any> = {
  page: number;
  lastItem?: T;
  cursor?: any;
};
```


# `useForm`

Hook that provides a high-level interface to work with Forms, and more particularly, with Form validations. It incorporates all the good practices to provide a great User Experience for your Forms.

## Signature

```ts
function useForm<T extends Form.Values>(props: {
  onSubmit: (values: T) => void | boolean | Promise<void | boolean>;
  initialValues?: Partial<T>;
  validation?: {
    [id in keyof T]?: ((value: T[id]) => string | undefined | null) | FormValidation;
  };
}): {
  handleSubmit: (values: T) => void | boolean | Promise<void | boolean>;
  itemProps: {
    [id in keyof T]: Partial<Form.ItemProps<T[id]>> & {
      id: string;
    };
  };
  setValidationError: (id: keyof T, error: ValidationError) => void;
  setValue: <K extends keyof T>(id: K, value: T[K]) => void;
  values: T;
  focus: (id: keyof T) => void;
  reset: (initialValues?: Partial<T>) => void;
};
```

### Arguments

- `onSubmit` is a callback that will be called when the form is submitted and all validations pass.

With a few options:

- `initialValues` are the initial values to set when the Form is first rendered.
- `validation` are the validation rules for the Form. A validation for a Form item is a function that takes the current value of the item as an argument and must return a string when the validation is failing. We also provide some shorthands for common cases, see [FormValidation](#formvalidation).

### Return

Returns an object which contains the necessary methods and props to provide a good User Experience in your Form.

- `handleSubmit` is a function to pass to the `onSubmit` prop of the `<Action.SubmitForm>` element. It wraps the initial `onSubmit` argument with some goodies related to the validation.
- `itemProps` are the props that must be passed to the `<Form.Item>` elements to handle the validations.

It also contains some additions for easy manipulation of the Form's data.

- `values` is the current values of the Form.
- `setValue` is a function that can be used to programmatically set the value of a specific field.
- `setValidationError` is a function that can be used to programmatically set the validation of a specific field.
- `focus` is a function that can be used to programmatically focus a specific field.
- `reset` is a function that can be used to reset the values of the Form. Optionally, you can specify the values to set when the Form is reset.

## Example

```tsx
import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";

interface SignUpFormValues {
  firstName: string;
  lastName: string;
  birthday: Date | null;
  password: string;
  number: string;
  hobbies: string[];
}

export default function Command() {
  const { handleSubmit, itemProps } = useForm<SignUpFormValues>({
    onSubmit(values) {
      showToast({
        style: Toast.Style.Success,
        title: "Yay!",
        message: `${values.firstName} ${values.lastName} account created`,
      });
    },
    validation: {
      firstName: FormValidation.Required,
      lastName: FormValidation.Required,
      password: (value) => {
        if (value && value.length < 8) {
          return "Password must be at least 8 symbols";
        } else if (!value) {
          return "The item is required";
        }
      },
      number: (value) => {
        if (value && value !== "2") {
          return "Please select '2'";
        }
      },
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="First Name" placeholder="Enter first name" {...itemProps.firstName} />
      <Form.TextField title="Last Name" placeholder="Enter last name" {...itemProps.lastName} />
      <Form.DatePicker title="Date of Birth" {...itemProps.birthday} />
      <Form.PasswordField
        title="Password"
        placeholder="Enter password at least 8 characters long"
        {...itemProps.password}
      />
      <Form.Dropdown title="Your Favorite Number" {...itemProps.number}>
        {[1, 2, 3, 4, 5, 6, 7].map((num) => {
          return <Form.Dropdown.Item value={String(num)} title={String(num)} key={num} />;
        })}
      </Form.Dropdown>
    </Form>
  );
}
```

## Types

### FormValidation

Shorthands for common validation cases

#### Enumeration members

| Name     | Description                                       |
| :------- | :------------------------------------------------ |
| Required | Show an error when the value of the item is empty |


# `useFrecencySorting`

Hook to sort an array by its frecency and provide methods to update the frecency of its items.

Frecency is a measure that combines frequency and recency. The more often an item is visited, and the more recently an item is visited, the higher it will rank.

## Signature

```ts
function useFrecencySorting<T>(
  data?: T[],
  options?: {
    namespace?: string;
    key?: (item: T) => string;
    sortUnvisited?: (a: T, b: T) => number;
  },
): {
  data: T[];
  visitItem: (item: T) => Promise<void>;
  resetRanking: (item: T) => Promise<void>;
};
```

### Arguments

- `data` is the array to sort

With a few options:

- `options.namespace` is a string that can be used to namespace the frecency data (if you have multiple arrays that you want to sort in the same extension).
- `options.key` is a function that should return a unique string for each item of the array to sort. By default, it will use `item.id`. If the items do not have an `id` field, this option is required.
- `options.sortUnvisited` is a function to sort the items that have never been visited. By default, the order of the input will be preserved.

### Return

Returns an object with the sorted array and some methods to update the frecency of the items.

- `data` is the sorted array. The order will be preserved for items that have never been visited
- `visitItem` is a method to use when an item is visited/used. It will increase its frecency.
- `resetRanking` is a method that can be used to reset the frecency of an item.

## Example

```tsx
import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useFetch, useFrecencySorting } from "@raycast/utils";

export default function Command() {
  const { isLoading, data } = useFetch("https://api.example");
  const { data: sortedData, visitItem, resetRanking } = useFrecencySorting(data);

  return (
    <List isLoading={isLoading}>
      {sortedData.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={item.url} onOpen={() => visitItem(item)} />
              <Action.CopyToClipboard title="Copy Link" content={item.url} onCopy={() => visitItem(item)} />
              <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={() => resetRanking(item)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```


# `useLocalStorage`

A hook to manage a value in the local storage.

## Signature

```ts
function useLocalStorage<T>(key: string, initialValue?: T): {
  value: T | undefined;
  setValue: (value: T) => Promise<void>;
  removeValue: () => Promise<void>;
  isLoading: boolean;
}
```

### Arguments

- `key` - The key to use for the value in the local storage.
- `initialValue` - The initial value to use if the key doesn't exist in the local storage.

### Return

Returns an object with the following properties:

- `value` - The value from the local storage or the initial value if the key doesn't exist.
- `setValue` - A function to update the value in the local storage.
- `removeValue` - A function to remove the value from the local storage.
- `isLoading` - A boolean indicating if the value is loading.

## Example

```tsx
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";

const exampleTodos = [
  { id: "1", title: "Buy milk", done: false },
  { id: "2", title: "Walk the dog", done: false },
  { id: "3", title: "Call mom", done: false },
];

export default function Command() {
  const { value: todos, setValue: setTodos, isLoading } = useLocalStorage("todos", exampleTodos);

  async function toggleTodo(id: string) {
    const newTodos = todos?.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)) ?? [];
    await setTodos(newTodos);
  }

  return (
    <List isLoading={isLoading}>
      {todos?.map((todo) => (
        <List.Item
          icon={todo.done ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.Circle}
          key={todo.id}
          title={todo.title}
          actions={
            <ActionPanel>
              <Action title={todo.done ? "Uncomplete" : "Complete"} onAction={() => toggleTodo(todo.id)} />
              <Action title="Delete" style={Action.Style.Destructive} onAction={() => toggleTodo(todo.id)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```


# `usePromise`

Hook which wraps an asynchronous function or a function that returns a Promise and returns the [AsyncState](#asyncstate) corresponding to the execution of the function.

{% hint style="info" %}
The function is assumed to be constant (eg. changing it won't trigger a revalidation).
{% endhint %}

## Signature

```ts
type Result<T> = `type of the returned value of the returned Promise`;

function usePromise<T>(
  fn: T,
  args?: Parameters<T>,
  options?: {
    abortable?: MutableRefObject<AbortController | null | undefined>;
    execute?: boolean;
    onError?: (error: Error) => void;
    onData?: (data: Result<T>) => void;
    onWillExecute?: (args: Parameters<T>) => void;
    failureToastOptions?: Partial<Pick<Toast.Options, "title" | "primaryAction" | "message">>;
  },
): AsyncState<Result<T>> & {
  revalidate: () => void;
  mutate: MutatePromise<Result<T> | undefined>;
};
```

### Arguments

- `fn` is an asynchronous function or a function that returns a Promise.
- `args` is the array of arguments to pass to the function. Every time they change, the function will be executed again. You can omit the array if the function doesn't require any argument.

With a few options:

- `options.abortable` is a reference to an [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) to cancel a previous call when triggering a new one.
- `options.execute` is a boolean to indicate whether to actually execute the function or not. This is useful for cases where one of the function's arguments depends on something that might not be available right away (for example, depends on some user inputs). Because React requires every hook to be defined on the render, this flag enables you to define the hook right away but wait until you have all the arguments ready to execute the function.
- `options.onError` is a function called when an execution fails. By default, it will log the error and show a generic failure toast with an action to retry.
- `options.onData` is a function called when an execution succeeds.
- `options.onWillExecute` is a function called when an execution will start.
- `options.failureToastOptions` are the options to customize the title, message, and primary action of the failure toast.

### Returns

Returns an object with the [AsyncState](#asyncstate) corresponding to the execution of the function as well as a couple of methods to manipulate it.

- `data`, `error`, `isLoading` - see [AsyncState](#asyncstate).
- `revalidate` is a method to manually call the function with the same arguments again.
- `mutate` is a method to wrap an asynchronous update and gives some control about how the `usePromise`'s data should be updated while the update is going through. By default, the data will be revalidated (eg. the function will be called again) after the update is done. See [Mutation and Optimistic Updates](#mutation-and-optimistic-updates) for more information.

## Example

```tsx
import { Detail, ActionPanel, Action } from "@raycast/api";
import { usePromise } from "@raycast/utils";

export default function Command() {
  const abortable = useRef<AbortController>();
  const { isLoading, data, revalidate } = usePromise(
    async (url: string) => {
      const response = await fetch(url, { signal: abortable.current?.signal });
      const result = await response.text();
      return result;
    },
    ["https://api.example"],
    {
      abortable,
    },
  );

  return (
    <Detail
      isLoading={isLoading}
      markdown={data}
      actions={
        <ActionPanel>
          <Action title="Reload" onAction={() => revalidate()} />
        </ActionPanel>
      }
    />
  );
}
```

## Mutation and Optimistic Updates

In an optimistic update, the UI behaves as though a change was successfully completed before receiving confirmation from the server that it was - it is being optimistic that it will eventually get the confirmation rather than an error. This allows for a more responsive user experience.

You can specify an `optimisticUpdate` function to mutate the data in order to reflect the change introduced by the asynchronous update.

When doing so, you can specify a `rollbackOnError` function to mutate back the data if the asynchronous update fails. If not specified, the data will be automatically rolled back to its previous value (before the optimistic update).

```tsx
import { Detail, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";

export default function Command() {
  const { isLoading, data, mutate } = usePromise(
    async (url: string) => {
      const response = await fetch(url);
      const result = await response.text();
      return result;
    },
    ["https://api.example"],
  );

  const appendFoo = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Appending Foo" });
    try {
      await mutate(
        // we are calling an API to do something
        fetch("https://api.example/append-foo"),
        {
          // but we are going to do it on our local data right away,
          // without waiting for the call to return
          optimisticUpdate(data) {
            return data + "foo";
          },
        },
      );
      // yay, the API call worked!
      toast.style = Toast.Style.Success;
      toast.title = "Foo appended";
    } catch (err) {
      // oh, the API call didn't work :(
      // the data will automatically be rolled back to its previous value
      toast.style = Toast.Style.Failure;
      toast.title = "Could not append Foo";
      toast.message = err.message;
    }
  };

  return (
    <Detail
      isLoading={isLoading}
      markdown={data}
      actions={
        <ActionPanel>
          <Action title="Append Foo" onAction={() => appendFoo()} />
        </ActionPanel>
      }
    />
  );
}
```

## Pagination

The hook has built-in support for pagination. In order to enable pagination, `fn`'s type needs to change from

> an asynchronous function or a function that returns a Promise

to

> a function that returns an asynchronous function or a function that returns a Promise

In practice, this means going from

```ts
const { isLoading, data } = usePromise(
  async (searchText: string) => {
    const data = await getUser(); // or any asynchronous logic you need to perform
    return data;
  },
  [searchText],
);
```

to

```ts
const { isLoading, data, pagination } = usePromise(
  (searchText: string) =>
    async ({ page, lastItem, cursor }) => {
      const { data } = await getUsers(page); // or any other asynchronous logic you need to perform
      const hasMore = page < 50;
      return { data, hasMore };
    },
  [searchText],
);
```

or, if your data source uses cursor-based pagination, you can return a `cursor` alongside `data` and `hasMore`, and the cursor will be passed as an argument the next time the function gets called:

```ts
const { isLoading, data, pagination } = usePromise(
  (searchText: string) =>
    async ({ page, lastItem, cursor }) => {
      const { data, nextCursor } = await getUsers(cursor); // or any other asynchronous logic you need to perform
      const hasMore = nextCursor !== undefined;
      return { data, hasMore, cursor: nextCursor };
    },
  [searchText],
);
```

You'll notice that, in the second case, the hook returns an additional item: `pagination`. This can be passed to Raycast's `List` or `Grid` components in order to enable pagination.
Another thing to notice is that the async function receives a [PaginationOptions](#paginationoptions) argument, and returns a specific data format:

```ts
{
  data: any[];
  hasMore: boolean;
  cursor?: any;
}
```

Every time the promise resolves, the hook needs to figure out if it should paginate further, or if it should stop, and it uses `hasMore` for this.
In addition to this, the hook also needs `data`, and needs it to be an array, because internally it appends it to a list, thus making sure the `data` that the hook _returns_ always contains the data for all of the pages that have been loaded so far.
Additionally, you can also pass a `cursor` property, which will be included along with `page` and `lastItem` in the next pagination call.

### Full Example

```tsx
import { setTimeout } from "node:timers/promises";
import { useState } from "react";
import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { isLoading, data, pagination } = usePromise(
    (searchText: string) => async (options: { page: number }) => {
      await setTimeout(200);
      const newData = Array.from({ length: 25 }, (_v, index) => ({
        index,
        page: options.page,
        text: searchText,
      }));
      return { data: newData, hasMore: options.page < 10 };
    },
    [searchText],
  );

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} pagination={pagination}>
      {data?.map((item) => (
        <List.Item
          key={`${item.page} ${item.index} ${item.text}`}
          title={`Page ${item.page} Item ${item.index}`}
          subtitle={item.text}
        />
      ))}
    </List>
  );
}
```

## Types

### AsyncState

An object corresponding to the execution state of the function.

```ts
// Initial State
{
  isLoading: true, // or `false` if `options.execute` is `false`
  data: undefined,
  error: undefined
}

// Success State
{
  isLoading: false,
  data: T,
  error: undefined
}

// Error State
{
  isLoading: false,
  data: undefined,
  error: Error
}

// Reloading State
{
  isLoading: true,
  data: T | undefined,
  error: Error | undefined
}
```

### MutatePromise

A method to wrap an asynchronous update and gives some control about how the `usePromise`'s data should be updated while the update is going through.

```ts
export type MutatePromise<T> = (
  asyncUpdate?: Promise<any>,
  options?: {
    optimisticUpdate?: (data: T) => T;
    rollbackOnError?: boolean | ((data: T) => T);
    shouldRevalidateAfter?: boolean;
  },
) => Promise<any>;
```

### PaginationOptions

An object passed to a `PaginatedPromise`, it has two properties:

- `page`: 0-indexed, this it's incremented every time the promise resolves, and is reset whenever `revalidate()` is called.
- `lastItem`: this is a copy of the last item in the `data` array from the last time the promise was executed. Provided for APIs that implement cursor-based pagination.
- `cursor`: this is the `cursor` property returned after the previous execution of `PaginatedPromise`. Useful when working with APIs that provide the next cursor explicitly.

```ts
export type PaginationOptions<T = any> = {
  page: number;
  lastItem?: T;
  cursor?: any;
};
```


# `useSQL`

Hook which executes a query on a local SQL database and returns the [AsyncState](#asyncstate) corresponding to the execution of the query.

## Signature

```ts
function useSQL<T>(
  databasePath: string,
  query: string,
  options?: {
    permissionPriming?: string;
    execute?: boolean;
    onError?: (error: Error) => void;
    onData?: (data: T) => void;
    onWillExecute?: (args: string[]) => void;
    failureToastOptions?: Partial<Pick<Toast.Options, "title" | "primaryAction" | "message">>;
  }
): AsyncState<T> & {
  revalidate: () => void;
  mutate: MutatePromise<T | U | undefined>;
  permissionView: React.ReactNode | undefined;
};
```

### Arguments

- `databasePath` is the path to the local SQL database.
- `query` is the SQL query to run on the database.

With a few options:

- `options.permissionPriming` is a string explaining why the extension needs full disk access. For example, the Apple Notes extension uses `"This is required to search your Apple Notes."`. While it is optional, we recommend setting it to help users understand.

Including the [usePromise](./usePromise.md)'s options:

- `options.execute` is a boolean to indicate whether to actually execute the function or not. This is useful for cases where one of the function's arguments depends on something that might not be available right away (for example, depends on some user inputs). Because React requires every hook to be defined on the render, this flag enables you to define the hook right away but wait until you have all the arguments ready to execute the function.
- `options.onError` is a function called when an execution fails. By default, it will log the error and show a generic failure toast with an action to retry.
- `options.onData` is a function called when an execution succeeds.
- `options.onWillExecute` is a function called when an execution will start.
- `options.failureToastOptions` are the options to customize the title, message, and primary action of the failure toast.

### Return

Returns an object with the [AsyncState](#asyncstate) corresponding to the execution of the function as well as a couple of methods to manipulate it.

- `data`, `error`, `isLoading` - see [AsyncState](#asyncstate).
- `permissionView` is a React Node that should be returned when present. It will prompt users to grant full disk access (which is required for the hook to work).
- `revalidate` is a method to manually call the function with the same arguments again.
- `mutate` is a method to wrap an asynchronous update and gives some control over how the `useSQL`'s data should be updated while the update is going through. By default, the data will be revalidated (eg. the function will be called again) after the update is done. See [Mutation and Optimistic Updates](#mutation-and-optimistic-updates) for more information.

## Example

```tsx
import { useSQL } from "@raycast/utils";
import { resolve } from "path";
import { homedir } from "os";

const NOTES_DB = resolve(homedir(), "Library/Group Containers/group.com.apple.notes/NoteStore.sqlite");
const notesQuery = `SELECT id, title FROM ...`;
type NoteItem = {
  id: string;
  title: string;
};

export default function Command() {
  const { isLoading, data, permissionView } = useSQL<NoteItem>(NOTES_DB, notesQuery);

  if (permissionView) {
    return permissionView;
  }

  return (
    <List isLoading={isLoading}>
      {(data || []).map((item) => (
        <List.Item key={item.id} title={item.title} />
      ))}
    </List>
  );
}
```

## Mutation and Optimistic Updates

In an optimistic update, the UI behaves as though a change was successfully completed before receiving confirmation from the server that it was - it is being optimistic that it will eventually get the confirmation rather than an error. This allows for a more responsive user experience.

You can specify an `optimisticUpdate` function to mutate the data in order to reflect the change introduced by the asynchronous update.

When doing so, you can specify a `rollbackOnError` function to mutate back the data if the asynchronous update fails. If not specified, the data will be automatically rolled back to its previous value (before the optimistic update).

```tsx
import { Detail, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useSQL } from "@raycast/utils";

const NOTES_DB = resolve(homedir(), "Library/Group Containers/group.com.apple.notes/NoteStore.sqlite");
const notesQuery = `SELECT id, title FROM ...`;
type NoteItem = {
  id: string;
  title: string;
};

export default function Command() {
  const { isLoading, data, mutate, permissionView } = useFetch("https://api.example");

  if (permissionView) {
    return permissionView;
  }

  const createNewNote = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating new Note" });
    try {
      await mutate(
        // we are calling an API to do something
        somehowCreateANewNote(),
        {
          // but we are going to do it on our local data right away,
          // without waiting for the call to return
          optimisticUpdate(data) {
            return data?.concat([{ id: "" + Math.random(), title: "New Title" }]);
          },
        },
      );
      // yay, the API call worked!
      toast.style = Toast.Style.Success;
      toast.title = "Note created";
    } catch (err) {
      // oh, the API call didn't work :(
      // the data will automatically be rolled back to its previous value
      toast.style = Toast.Style.Failure;
      toast.title = "Could not create Note";
      toast.message = err.message;
    }
  };

  return (
    <List isLoading={isLoading}>
      {(data || []).map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          actions={
            <ActionPanel>
              <Action title="Create new Note" onAction={() => createNewNote()} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```

## Types

### AsyncState

An object corresponding to the execution state of the function.

```ts
// Initial State
{
  isLoading: true, // or `false` if `options.execute` is `false`
  data: undefined,
  error: undefined
}

// Success State
{
  isLoading: false,
  data: T,
  error: undefined
}

// Error State
{
  isLoading: false,
  data: undefined,
  error: Error
}

// Reloading State
{
  isLoading: true,
  data: T | undefined,
  error: Error | undefined
}
```

### MutatePromise

A method to wrap an asynchronous update and gives some control about how the `useSQL`'s data should be updated while the update is going through.

```ts
export type MutatePromise<T> = (
  asyncUpdate?: Promise<any>,
  options?: {
    optimisticUpdate?: (data: T) => T;
    rollbackOnError?: boolean | ((data: T) => T);
    shouldRevalidateAfter?: boolean;
  },
) => Promise<any>;
```


# `useStreamJSON`

Hook which takes a `http://`, `https://` or `file:///` URL pointing to a JSON resource, caches it to the command's support folder, and streams through its content. Useful when dealing with large JSON arrays which would be too big to fit in the command's memory.

## Signature

```ts
export function useStreamJSON<T, U>(
  url: RequestInfo,
  options: RequestInit & {
    filter?: (item: T) => boolean;
    transform?: (item: any) => T;
    pageSize?: number;
    initialData?: U;
    keepPreviousData?: boolean;
    execute?: boolean;
    onError?: (error: Error) => void;
    onData?: (data: T) => void;
    onWillExecute?: (args: [string, RequestInit]) => void;
    failureToastOptions?: Partial<Pick<Toast.Options, "title" | "primaryAction" | "message">>;
  },
): AsyncState<Result<T>> & {
  revalidate: () => void;
};
```

### Arguments

- `url` - The [`RequestInfo`](https://github.com/nodejs/undici/blob/v5.7.0/types/fetch.d.ts#L12) describing the resource that needs to be fetched. Strings starting with `http://`, `https://` and `Request` objects will use `fetch`, while strings starting with `file:///` will be copied to the cache folder.

With a few options:

- `options` extends [`RequestInit`](https://github.com/nodejs/undici/blob/v5.7.0/types/fetch.d.ts#L103-L117) allowing you to specify a body, headers, etc. to apply to the request.
- `options.pageSize` the amount of items to fetch at a time. By default, 20 will be used
- `options.dataPath` is a string or regular expression informing the hook that the array (or arrays) of data you want to stream through is wrapped inside one or multiple objects, and it indicates the path it needs to take to get to it.
- `options.transform` is a function called with each top-level object encountered while streaming. If the function returns an array, the hook will end up streaming through its children, and each array item will be passed to `options.filter`. If the function returns something other than an array, _it_ will be passed to `options.filter`. Note that the hook will revalidate every time the filter function changes, so you need to use [useCallback](https://react.dev/reference/react/useCallback) to make sure it only changes when it needs to.
- `options.filter` is a function called with each object encountered while streaming. If it returns `true`, the object will be kept, otherwise it will be discarded. Note that the hook will revalidate every time the filter function changes, so you need to use [useCallback](https://react.dev/reference/react/useCallback) to make sure it only changes when it needs to.

Including the [useCachedPromise](./useCachedPromise.md)'s options:

- `options.keepPreviousData` is a boolean to tell the hook to keep the previous results instead of returning the initial value if there aren't any in the cache for the new arguments. This is particularly useful when used for data for a List to avoid flickering.

Including the [useCachedState](./useCachedState.md)'s options:

- `options.initialData` is the initial value of the state if there aren't any in the Cache yet.

Including the [usePromise](./usePromise.md)'s options:

- `options.execute` is a boolean to indicate whether to actually execute the function or not. This is useful for cases where one of the function's arguments depends on something that might not be available right away (for example, depends on some user inputs). Because React requires every hook to be defined on the render, this flag enables you to define the hook right away but wait until you have all the arguments ready to execute the function.
- `options.onError` is a function called when an execution fails. By default, it will log the error and show a generic failure toast with an action to retry.
- `options.onData` is a function called when an execution succeeds.
- `options.onWillExecute` is a function called when an execution will start.
- `options.failureToastOptions` are the options to customize the title, message, and primary action of the failure toast.

### Return

Returns an object with the [AsyncState](#asyncstate) corresponding to the execution of the fetch as well as a couple of methods to manipulate it.

- `data`, `error`, `isLoading` - see [AsyncState](#asyncstate).
- `pagination` - the pagination object that Raycast [`List`s](https://developers.raycast.com/api-reference/user-interface/list#props) and [`Grid`s](https://developers.raycast.com/api-reference/user-interface/grid#props) expect.
- `revalidate` is a method to manually call the function with the same arguments again.
- `mutate` is a method to wrap an asynchronous update and gives some control over how the hook's data should be updated while the update is going through. By default, the data will be revalidated (eg. the function will be called again) after the update is done. See [Mutation and Optimistic Updates](#mutation-and-optimistic-updates) for more information.

## Example

```ts
import { Action, ActionPanel, List, environment } from "@raycast/api";
import { useStreamJSON } from "@raycast/utils";
import { join } from "path";
import { useCallback, useState } from "react";

type Formula = { name: string; desc?: string };

export default function Main(): JSX.Element {
  const [searchText, setSearchText] = useState("");

  const formulaFilter = useCallback(
    (item: Formula) => {
      if (!searchText) return true;
      return item.name.toLocaleLowerCase().includes(searchText);
    },
    [searchText],
  );

  const formulaTransform = useCallback((item: any): Formula => {
    return { name: item.name, desc: item.desc };
  }, []);

  const { data, isLoading, pagination } = useStreamJSON("https://formulae.brew.sh/api/formula.json", {
    initialData: [] as Formula[],
    pageSize: 20,
    filter: formulaFilter,
    transform: formulaTransform
  });

  return (
    <List isLoading={isLoading} pagination={pagination} onSearchTextChange={setSearchText}>
      <List.Section title="Formulae">
        {data.map((d) => (
          <List.Item key={d.name} title={d.name} subtitle={d.desc} />
        ))}
      </List.Section>
    </List>
  );
}
```

## Mutation and Optimistic Updates

In an optimistic update, the UI behaves as though a change was successfully completed before receiving confirmation from the server that it was - it is being optimistic that it will eventually get the confirmation rather than an error. This allows for a more responsive user experience.

You can specify an `optimisticUpdate` function to mutate the data in order to reflect the change introduced by the asynchronous update.

When doing so, you can specify a `rollbackOnError` function to mutate back the data if the asynchronous update fails. If not specified, the data will be automatically rolled back to its previous value (before the optimistic update).

```tsx
import { Action, ActionPanel, List, environment } from "@raycast/api";
import { useStreamJSON } from "@raycast/utils";
import { join } from "path";
import { useCallback, useState } from "react";
import { setTimeout } from "timers/promises";

type Formula = { name: string; desc?: string };

export default function Main(): JSX.Element {
  const [searchText, setSearchText] = useState("");

  const formulaFilter = useCallback(
    (item: Formula) => {
      if (!searchText) return true;
      return item.name.toLocaleLowerCase().includes(searchText);
    },
    [searchText],
  );

  const formulaTransform = useCallback((item: any): Formula => {
    return { name: item.name, desc: item.desc };
  }, []);

  const { data, isLoading, mutate, pagination } = useStreamJSON("https://formulae.brew.sh/api/formula.json", {
    initialData: [] as Formula[],
    pageSize: 20,
    filter: formulaFilter,
    transform: formulaTransform,
  });

  return (
    <List isLoading={isLoading} pagination={pagination} onSearchTextChange={setSearchText}>
      <List.Section title="Formulae">
        {data.map((d) => (
          <List.Item
            key={d.name}
            title={d.name}
            subtitle={d.desc}
            actions={
              <ActionPanel>
                <Action
                  title="Delete All Items But This One"
                  onAction={async () => {
                    mutate(setTimeout(1000), {
                      optimisticUpdate: () => {
                        return [d];
                      },
                    });
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
```

## Types

### AsyncState

An object corresponding to the execution state of the function.

```ts
// Initial State
{
  isLoading: true, // or `false` if `options.execute` is `false`
  data: undefined,
  error: undefined
}

// Success State
{
  isLoading: false,
  data: T,
  error: undefined
}

// Error State
{
  isLoading: false,
  data: undefined,
  error: Error
}

// Reloading State
{
  isLoading: true,
  data: T | undefined,
  error: Error | undefined
}
```

