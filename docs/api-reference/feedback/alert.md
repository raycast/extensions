# Alert

When the user takes an important action (for example when irreversibly deleting something), you can ask for confirmation by using `confirmAlert`.

![](../../.gitbook/assets/alert.webp)

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
| Default     | ![](../../.gitbook/assets/alert-action-default.webp)     |
| Destructive | ![](../../.gitbook/assets/alert-action-destructive.webp) |
| Cancel      | ![](../../.gitbook/assets/alert-action-cancel.webp)      |
