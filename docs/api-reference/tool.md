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
