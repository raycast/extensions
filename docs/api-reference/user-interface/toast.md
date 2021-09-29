# Toast

## API Reference

### showHUD

A HUD will automatically hide the main window and show a compact Toast at the bottom of the screen.

#### Signature

```typescript
async function showHUD(title: string): Promise<void>
```

#### Parameters

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| title | `string` | Yes | The title that will be displayed for the HUD. |

#### Return

A promise that resolves when the HUD is shown.

### showToast

Creates and shows a Toast with the the given style, title, and message.

#### Signature

```typescript
async function showToast(style: ToastStyle, title: string, message: string): Promise<Toast>
```

#### Parameters

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| style | `ToastStyle` | Yes | The visual style of the Toast. |
| title | `string` | Yes | The title that will be displayed in the Toast. |
| message | `string` | No | The message that will be displayed in the Toast. |

#### Return

A promise that resolves with the shown toast. The toast can be used to change or hide it.

### Toast

A Toast with a certain style, title, and message. Use [showToast](toast.md#showtoast) as shortcut for creating and showing a Toast.

#### Constructors

| Name | Type | Description |
| :--- | :--- | :--- |
| constructor | `(options: ToastOptions) => Toast` |  |

#### Accessors

| Name | Type | Description |
| :--- | :--- | :--- |
| message | `undefined` or `string` |  |
| style | `ToastStyle` |  |
| title | `string` |  |

#### Methods

| Name | Type | Description |
| :--- | :--- | :--- |
| hide | `() => Promise` | Hides the Toast. |
| show | `() => Promise` | Shows the Toast. |

### ToastOptions

The options to create a [Toast](toast.md#toast).

#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| message | `string` | No |  |
| style | `ToastStyle` | Yes |  |
| title | `string` | Yes |  |

### ToastStyle

Defines the visual style of the Toast.

#### Enumeration members

| Name | Value |
| :--- | :--- |
| Animated | "ANIMATED" |
| Failure | "FAILURE" |
| Success | "SUCCESS" |

