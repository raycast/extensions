## Arguments

Raycast supports arguments for your commands so that users can enter values right from Root Search before opening the command.

![](../.gitbook/assets/arguments.png)

Arguments are configured in the [manifest](../information/manifest.md#argument-properties) per command.

{% hint style="info" %}

- **Maximum number of arguments:** 3 (if you have a use case that requires more, please let us know via feedback or in the [Slack community](https://www.raycast.com/community))
- The order of the arguments specified in manifest is important and is reflected by the fields shown in Root Search. To provide a better UX, put the required arguments before optional ones.
  {% endhint %}

Here's an example of a simple command with two arguments:

```typescript
import { Form } from "@raycast/api";

interface TodoArguments {
  title: string;
  subtitle?: string;
}

export default function Todoist(props: { arguments: TodoArguments }) {
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

And the `package.json` will look like this:

```json
{
  "name": "arguments",
  "title": "API Arguments",
  "description": "Example of Arguments usage in the API",
  "icon": "command-icon.png",
  "author": "mattisssa",
  "license": "MIT",
  "commands": [
    {
      "name": "arguments",
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
          "placeholder": "Subtitle",
          "type": "text"
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

#### Return

An object with the argument name as property key and the typed value as property value.

Depending on the type of the argument, the type of its value will be different. For `text` and `password`, the value type is `string`.

| Argument type         | Value type          |
| :-------------------- | :------------------ |
| <code>text</code>     | <code>string</code> |
| <code>password</code> | <code>string</code> |
