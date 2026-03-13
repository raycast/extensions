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
