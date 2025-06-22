---
description: Get to know the core concepts of AI extensions.
---

# Learn Core Concepts of AI Extensions

AI Extensions rely on three core concepts: Tools, Instructions, and Evals. Each of these concepts plays a crucial role in the development of AI Extensions. Let's take a closer look at each of them.

## Tools

To turn a regular extension into an AI extension, you need to add a set of tools that allow Raycast AI to interact with your extension. A tool is a function that takes an input and returns a value.

Here's an example of a simple tool:

```typescript
export default function tool() {
  return "Hello, world!";
}
```

### Inputs

Tools can take an input. For example, a `greet` tool takes a `name` as an input and returns a greeting to the user.

```typescript
type Input = {
  name: string;
};

export default function tool(input: Input) {
  return `Hello, ${input.name}!`;
}
```

Those inputs can be used to provide more context to the tool. For example, you can pass a title, a description, and a due date to a `createTask` tool.

```typescript
type Input = {
  /**
   * The title of the task
   */
  title: string;
  /**
   * The description of the task
   */
  description?: string;
  /**
   * The due date of the task in ISO 8601 format
   */
  dueDate?: string;
};

export default function tool(input: Input) {
  // ... create the task
}
```

{% hint style="info" %}
A tool expects a single object as its input.
{% endhint %}

### Descriptions

To better teach AI how to use your tools, you can add descriptions as JSDoc comments (eg. `/** ... */`) to tools and their inputs. The better you describe your tools, the more likely AI is to use them correctly.

```typescript
type Input = {
  /**
   * The first name of the user to greet
   */
  name: string;
};

/**
 * Greet the user with a friendly message
 */
export default function tool(input: Input) {
  return `Hello, ${input.name}!`;
}
```

### Confirmations

Sometimes you want to keep the human in the loop. For example, you can ask the user to confirm an action before it is executed. For this, you can export a `confirmation` function.

```typescript
import { Tool } from "@raycast/api";

type Input = {
  /**
   * The first name of the user to greet
   */
  name: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: `Are you sure you want to greet ${input.name}?`,
  };
};

/**
 * Greet the user with a friendly message
 */
export default function tool(input: Input) {
  return `Hello, ${input.name}!`;
}
```

The `confirmation` function is called before the actual tool is executed. If the user confirms, the tool is executed afterwards. If the user cancels, the tool is not executed.

You can customize the confirmation further by providing details about the action that needs to be confirmed. See [Tool Reference](../api-reference/tool.md) for more information.

## Instructions

Sometimes you want to provide additional instructions to the AI that are not specific to a single tool but to the entire AI extension. For example, you can provide a list of do's and don'ts for the AI to follow. Those are defined in the [`package.json` file](../information/manifest.md) under the `ai` key.

```json
{
  "ai": {
    "instructions": "When you don't know the user's first name, ask for it."
  }
}
```

A user can use multiple AI Extensions in a conversation. Therefore, you should make sure that your instructions don't conflict with the instructions of other AI Extensions. For example, avoid phrases like "You are a ... assistant" because other AI Extensions might provide a different skill set. Instead, you should focus on providing general instructions that describe the specifics of your AI Extension. For example, describe the relationship between issues, projects, and teams for a project management app.

## Evals

Evals are a way to test your AI extension. Think of them as integrations tests. They are defined in the [`package.json` file](../information/manifest.md) under the `ai` key. They are also used as suggested prompts for the user to learn how to make the most out of your AI Extension.

## Structure

An eval consists of the following parts:

- `input` is a text prompt that you expect from users of your AI Extension. It should include `@` mention the name of your extension (`name` from `package.json`).
- `mocks` – mocked results of tool calls. It is required to give AI the context, i.e. if you write an eval for `@todo-list What are my todos?` you need to provide the actual list in `get-todos` mock.
- `expected` – array of expectations, similar to `expect` statements in unit / integration tests.
- `usedAsExample` – if true, the eval will be used as an example prompt for the user. True by default.

## Expectations

Expectations are used to check if the AI response matches the expected behavior. You have different options to choose from:

- `includes`: Check that AI response includes some substring (case-insensitive), for example `{"includes": "added" }`
- `matches`: Check that AI response matches some regexp, for example check if response contains a Markdown link `{ "matches": "\\[([^\\]]+)\\]\\(([^\\s\\)]+)(?:\\s+\"([^\"]+)\")?\\)" }`
- `meetsCriteria`: Check that AI response meets some plain-text criteria (validated using AI). Useful when AI varies the response and it is hard to match it using `includes` or `matches`. Example: `{ "meetsCriteria": "Tells that label with this name doesn't exist" }`
- `callsTool`: Check that during the request AI called some tool included from your AI extension. There are two forms:
  - Short form to check if AI tool with specific name was called. Example: `{ "callsTool": "get-todos" }`
  - Long form to check tool arguments: `{ callsTool: { name: "name", arguments: { arg1: matcher, arg2: matcher } } }`. Matches could be complex and combine any supported rules:
    - `eq` (used by default for any value that is not object or array)
    - `includes`
    - `matches`
    - `and` (used by default if array is used)
    - `or`
    - `not`

#### Example

{% tabs %}
{% tab title="Simple Expectation" %}

```json
{
  "ai": {
    "evals": [
      {
        "expected": [
          {
            "callsTool": {
              "name": "greet",
              "arguments": {
                "name": "thomas"
              }
            }
          }
        ]
      }
    ]
  }
}
```

{% endtab %}
{% tab title="Nested Expectations" %}

```json
{
  "ai": {
    "evals": [
      {
        "expected": [
          {
            "callsTool": {
              "name": "create-comment",
              "arguments": {
                "issueId": "ISS-1",
                "body": {
                  "includes": "waiting for design"
                }
              }
            }
          }
        ]
      }
    ]
  }
}
```

{% endtab %}
{% tab title="Nested Expectations With Dot Notation" %}

```json
{
  "ai": {
    "evals": [
      {
        "expected": [
          {
            "callsTool": {
              "name": "greet",
              "arguments": {
                "user.name": "thomas"
              }
            }
          }
        ]
      }
    ]
  }
}
```

{% endtab %}
{% tab title="Negative Expectation" %}

```json
{
  "ai": {
    "evals": [
      {
        "expected": [
          {
            "not": {
              "callsTool": "create-issue"
            }
          }
        ]
      }
    ]
  }
}
```

{% endtab %}
{% endtabs %}

## AI File

If your instructions or evals start getting too long and clutter your `package.json` file, you can move them to a separate file. It can be either a `ai.json`, `ai.yaml`, or `ai.json5` file in the root of your extension next to the `package.json` file.

The structure of the AI file is the same as in the `package.json` file.

{% tabs %}
{% tab title="ai.json" %}

```json
{
  "instructions": "When you don't know the user's first name, ask for it."
}
```

{% endtab %}

{% tab title="ai.yaml" %}

```yaml
instructions: |
  When you don't know the user's first name, ask for it.
```

{% endtab %}

{% tab title="ai.json5" %}

```json5
{
  instructions: "When you don't know the user's first name, ask for it.",
}
```
{% endtab %}
{% endtabs %}

{% hint style="info" %}
The AI file is optional. If you don't provide it, Raycast will use the instructions and evals from the `package.json` file. We found that [`yaml`](https://yaml.org/) and [`json5`](https://json5.org/) can be more readable for long instructions.
{% endhint %}
