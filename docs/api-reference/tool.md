# Tool

Tools are a type of entry point for an extension. As opposed to a [command](../information/terminology.md#command), they don’t show up in the root search and the user can’t directly interact with them. Instead, they are functionalities that the AI can use to interact with an extension.

## Types

### Tool.Confirmation

A tool confirmation is used to ask the user to validate the side-effects of the tool.

{% hint style="info" %}
The tool confirmation is executed _before_ the actual tool is executed and receives the same input as the tool.
A confirmation returns an optional object that describes what the tool is about to do. It is important to be as clear as possible.

If the user confirms the action, the tool will be executed afterwards. If the user cancels the action, the tool will not be executed.
{% endhint %}

```ts
type Confirmation<T> = (input: T) => Promise<
  | undefined
  | {
      /**
       * Defines the visual style of the Confirmation.
       *
       * @remarks
       * Use {@link Action.Style.Regular} to display a regular action.
       * Use {@link Action.Style.Destructive} when your action performs something irreversible like deleting data.
       *
       * @defaultValue {@link Action.Style.Regular}
       */
      style?: Action.Style;
      /**
       * Some name/value pairs that represents the side-effects of the tool.
       *
       * @remarks
       * Use it to provide more context about the tool to the user. For example, list the files that will be deleted.
       *
       * A name/value pair with an optional value won't be displayed if the value is `undefined`.
       */
      info?: {
        name: string;
        value?: string;
      }[];
      /**
       * A string that represents the side-effects of the tool.
       *
       * @remarks
       * Often times this is a question that the user needs to answer. For Example, "Are you sure you want to delete the file?"
       */
      message?: string;
      /**
       * An image that visually represents the side-effects of the tool.
       *
       * @remarks
       * Use an image that is relevant to the side-effects of the tool. For example, a screenshot of the files that will be deleted.
       */
      image?: Image.URL | FileIcon;
    }
>;
```

You can return `undefined` to skip the confirmation. This is useful for tools that conditionally perform destructive actions.
F.e. when moving a file, you don't need to confirm the action if the file doesn't overwrite another file.

#### Example

```typescript
import { Tool } from "@raycast/api";

type Input = {
  /**
   * The first name of the user to greet
   */
  name: string;
};

export const confirmation: Tool.Confirmation<Input> = (input) => {
  return {
    message: `Are you sure you want to greet ${input.name}?`,
  };
};
```

## Composer mentions

Besides tools the AI calls, an extension can offer the items it knows (issues, notes, documents, records) for the user to mention from the AI Chat composer's `@` menu. Mentioning an item puts it in the message the way a pasted record would, without the AI having to search for it. Tools with a `functionalities` entry in the manifest make this work; none of them is shown to the AI as a tool.

### Mention search

A tool with `"functionalities": ["AI mention search"]` is a search in the extension's section of the `@` menu, its own row under the extension's. An extension may declare several, say one for issues and one for projects, each with its own row and items. The tool takes the text the user has typed, empty for a default list, and returns the matching items:

```typescript
type Input = {
  /** What the user typed after choosing the search, empty for the default list. */
  query: string;
};

type Item = {
  title: string;
  /** Identifies the item; what the extension's resource provider is asked for. */
  uri?: string;
  /** The item itself, when it is short enough to ride the message (a few kilobytes at most). */
  content?: string;
  description?: string;
  /** An icon for the item, as `Image.ImageLike`: a built-in icon, an emoji, or an asset. */
  icon?: string;
};

export default async function (input: Input): Promise<Item[]> {
  const issues = await searchIssues(input.query);
  return issues.map((issue) => ({
    title: issue.title,
    uri: `issues://${issue.id}`,
    description: issue.state,
    icon: "circle",
  }));
}
```

An item needs a `uri`, `content`, or both. An item with `content` is complete in itself: the content goes into the message when the user sends it. An item with only a `uri` is a pointer: when the user sends the message, Raycast asks the extension's resource provider for the item, and the AI can read it again later, so a `uri` suits anything too long to inline or worth re-reading. Content past the limit is dropped in favor of the `uri`, and an item with neither is not offered.

A tool that takes no `query` offers a fixed list instead: Raycast calls it once, when the user narrows the menu to the extension, and matches what they type against the items' titles and descriptions itself. That suits an extension with a few known items, such as boards or templates, and spares it a search of its own. A list is capped at 50 items, so anything larger should take the `query`.

### Resource provider

The extension's resource provider returns the content of an item by its `uri`, whichever of the extension's searches offered it. It is not a tool but an entry point of the extension itself, named by `resourceProvider` in the manifest:

```typescript
// src/read-issue.ts
type Input = {
  /** The `uri` of an item a mention search returned. */
  uri: string;
};

export default async function (input: Input): Promise<string> {
  const issue = await getIssue(input.uri.replace("issues://", ""));
  return `# ${issue.title}\n\n${issue.body}`;
}
```

Return the content as a string, which is read as Markdown, or as `{ text: string; mimeType?: string }` to say what it is. The provider is called when a message mentioning the item is sent and whenever the AI reads the item again, so it should be cheap and idempotent.
