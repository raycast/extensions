# Alert

## API Reference

### confirmAlert

Creates and shows a confirmation Alert with the given options.

#### Signature

```typescript
async function confirmAlert(options: AlertOptions): Promise<boolean>
```

#### Example

```typescript
import { confirmAlert } from "@raycast/api";

export default async () => {
  if (await confirmAlert({ title: "Are you sure?" })) {
    // do something
  }
};
```

#### Parameters

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| options | <code>[AlertOptions](#alertoptions)</code> | Yes | The options used to create the Alert. |

#### Return

A promise that resolves to a boolean when the user takes an action.
It will be `true` for the primary Action, `false` for the dismiss Action.

### AlertActionOptions

The options to create an Alert Action.

#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| style | <code>[AlertActionStyle](#alertactionstyle)</code> | No | The style of the action. |
| title | <code>string</code> | Yes | The title of the action. |
| onAction | <code>() => void</code> | No | A callback called when the action is triggered. |

### AlertOptions

The options to create an Alert.

#### Example

```typescript
import { AlertOptions } from "@raycast/api";

export default async () => {
  const options: AlertOptions = {
    title: "Finished cooking",
    message: "Delicious pasta for lunch",
    primaryAction: {
      title: 'Do something',
      onAction: () => {
        // while you can register a handler for an action, it's more elegant
        // to use the `if (await confirmAlert(...)) { ... }` pattern
        console.log("The alert action has been triggered")
      }
    }
  };
  await confirmAlert(options);
};
```

#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| dismissAction | <code>[AlertActionOptions](#alertactionoptions)</code> | No | The Action to dismiss the alert. There usually shouldn't be any side effects when the user takes this action. |
| icon | <code>[ImageLike](./icons-and-images.md#imagelike)</code> | No | The icon of an alert to illustrate the action. Displayed on the top. |
| message | <code>string</code> | No | An additional message for an Alert. Useful to show more information, e.g. a confirmation message for a destructive action. |
| primaryAction | <code>[AlertActionOptions](#alertactionoptions)</code> | No | The primary Action the user can take. |
| title | <code>string</code> | Yes | The title of an alert. Displayed below the icon. |

### AlertActionStyle

Defines the visual style of an Action of the Alert.

Use [AlertActionStyle.Default](#alertactionstyle) for confirmations of a positive action.
Use [AlertActionStyle.Destructive](#alertactionstyle) for confirmations of a destructive action (eg. deleting a file).

#### Enumeration members

| Name | Value |
| :--- | :--- |
| Cancel | "CANCEL" |
| Default | "DEFAULT" |
| Destructive | "DESTRUCTIVE" |
