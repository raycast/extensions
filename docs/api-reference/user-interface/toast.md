# Toast

## API Reference

### showHUD

A HUD will automatically hide the main window and show a compact Toast at the bottom of the screen.

#### Signature

```typescript
async function showHUD(title: string): Promise<void>
```

#### Example

```typescript
import { showHUD } from "@raycast/api";

export default async () => {
  await showHUD("Hey there 👋");
};
```

#### Parameters

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| title | <code>string</code> | Yes | The title that will be displayed for the HUD. |

#### Return

A promise that resolves when the HUD is shown.

### showToast

Creates and shows a Toast with the given style, title, and message.

#### Signature

```typescript
async function showToast(style: ToastStyle, title: string, message: string): Promise<Toast>
```

#### Example

```typescript
import { showToast, ToastStyle } from "@raycast/api";

export default async () => {
  const success = false;

  if (success) {
    await showToast(ToastStyle.Success, "Dinner is ready", "Pizza margherita");
  } else {
    await showToast(ToastStyle.Failure, "Dinner isn't ready", "Pizza dropped on the floor");
  }
};
```

#### Parameters

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| style | <code>[ToastStyle](https://developers.raycast.com/api-reference/user-interface/toast#toaststyle)</code> | Yes | The visual style of the Toast. |
| title | <code>string</code> | Yes | The title that will be displayed in the Toast. |
| message | <code>string</code> | No | The message that will be displayed in the Toast. |

#### Return

A promise that resolves with the shown toast. The toast can be used to change or hide it.

### Toast

A Toast with a certain style, title, and message.

Use [showToast](https://developers.raycast.com/api-reference/user-interface/toast#showtoast) as shortcut for creating and showing a Toast.

#### Example

```typescript
import { Toast, ToastStyle } from "@raycast/api";
import { setTimeout } from "timers/promises";

export default async () => {
  const toast = new Toast({ style: ToastStyle.Animated, title: "Uploading image" });
  await toast.show();

  await setTimeout(1000);

  toast.style = ToastStyle.Success;
  toast.title = "Uploaded image";
};
```

#### Constructors

| Name | Type | Description |
| :--- | :--- | :--- |
| constructor | <code>(props: ToastOptions) => [Toast](https://developers.raycast.com/api-reference/user-interface/toast#toast)</code> |  |

#### Accessors

| Name | Type | Description |
| :--- | :--- | :--- |
| message | <code>undefined</code> or <code>string</code> |  |
| primaryAction | <code>undefined</code> or <code>[ToastActionOptions](https://developers.raycast.com/api-reference/user-interface/toast#toastactionoptions)</code> |  |
| secondaryAction | <code>undefined</code> or <code>[ToastActionOptions](https://developers.raycast.com/api-reference/user-interface/toast#toastactionoptions)</code> |  |
| style | <code>[ToastStyle](https://developers.raycast.com/api-reference/user-interface/toast#toaststyle)</code> |  |
| title | <code>string</code> |  |

#### Methods

| Name | Type | Description |
| :--- | :--- | :--- |
| hide | <code>() => Promise&lt;void></code> | Hides the Toast. |
| show | <code>() => Promise&lt;void></code> | Shows the Toast. |

### ToastActionOptions

The options to create a [Toast](https://developers.raycast.com/api-reference/user-interface/toast#toast) Action.

#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| shortcut | <code>[KeyboardShortcut](https://developers.raycast.com/api-reference/keyboard#keyboardshortcut)</code> | No | The keyboard shortcut for the action. |
| title | <code>string</code> | Yes | The title of the action. |
| onAction | <code>() => void</code> | Yes | A callback called when the action is triggered. |

### ToastOptions

The options to create a [Toast](https://developers.raycast.com/api-reference/user-interface/toast#toast).

#### Example

```typescript
import { Toast, ToastOptions, ToastStyle } from "@raycast/api";

export default async () => {
  const options: ToastOptions = {
    style: ToastStyle.Success,
    title: "Finished cooking",
    message: "Delicious pasta for lunch",
    primaryAction: {
      title: 'Do something',
      onAction: () => {
        console.log("The toast action has been triggered")
      }
    }
  };
  const toast = new Toast(options);
  await toast.show();
};
```

#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| message | <code>string</code> | No | An additional message for the toast. Useful to show more information, e.g. an identifier of a newly created asset. |
| primaryAction | <code>[ToastActionOptions](https://developers.raycast.com/api-reference/user-interface/toast#toastactionoptions)</code> | No | The primary Action the user can take when hovering on the Toast. |
| secondaryAction | <code>[ToastActionOptions](https://developers.raycast.com/api-reference/user-interface/toast#toastactionoptions)</code> | No | The secondary Action the user can take when hovering on the Toast. |
| style | <code>[ToastStyle](https://developers.raycast.com/api-reference/user-interface/toast#toaststyle)</code> | Yes | The style of a toast. |
| title | <code>string</code> | Yes | The title of a toast. Displayed on the top. |

### ToastStyle

Defines the visual style of the Toast.

Use [ToastStyle.Success](https://developers.raycast.com/api-reference/user-interface/toast#toaststyle) for confirmations and [ToastStyle.Failure](https://developers.raycast.com/api-reference/user-interface/toast#toaststyle) for displaying errors.
Use [ToastStyle.Animated](https://developers.raycast.com/api-reference/user-interface/toast#toaststyle) when your Toast should be shown until a process is completed.
You can hide it later by using [Toast.hide](https://developers.raycast.com/api-reference/user-interface/toast#toast) or update the properties of an existing Toast.

#### Enumeration members

| Name | Value |
| :--- | :--- |
| Animated | "ANIMATED" |
| Failure | "FAILURE" |
| Success | "SUCCESS" |
