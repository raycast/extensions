# Clipboard

## Overview

You can write contents to the clipboard through [copyTextToClipboard](clipboard.md#copytexttoclipboard) and clear it through [clearClipboard](clipboard.md#clearclipboard). We also provide convenience actions such as [CopyToClipboardAction](user-interface/actions.md#CopyToClipboardAction).

## API Reference

### clearClipboard

Clears the current clipboard contents.

#### Signature

```typescript
async function clearClipboard(): Promise<void>
```

#### Example

```typescript
import { clearClipboard } from "@raycast/api";

export default async () => {
  await clearClipboard();
};
```

#### Return

A promise that resolves when the clipboard is cleared.

### copyTextToClipboard

Copies text to the clipboard.

#### Signature

```typescript
async function copyTextToClipboard(text: string): Promise<void>
```

#### Example

```typescript
import { copyTextToClipboard } from "@raycast/api";

export default async () => {
  await copyTextToClipboard("https://raycast.com");
};
```

#### Parameters

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| text | `string` | Yes |  |

#### Return

A promise that resolves when the text got copied to the clipboard.

### getSelectedText

Gets the selected text of the frontmost application.

#### Signature

```typescript
async function getSelectedText(): Promise<string>
```

#### Example

```typescript
import { getSelectedText, pasteText, showToast, ToastStyle } from "@raycast/api";

export default async () => {
  try {
    const selectedText = await getSelectedText();
    const transformedText = selectedText.toUpperCase();
    await pasteText(transformedText);
  } catch (error) {
    await showToast(ToastStyle.Failure, "Cannot transform text", String(error));
  }
};
```

#### Return

Returns a promise that resolves with the selected text.

### pasteText

Pastes text to the current selection of the frontmost application.

#### Signature

```typescript
async function pasteText(text: string): Promise<void>
```

#### Example

```typescript
import { pasteText } from "@raycast/api";

export default async () => {
  await pasteText("I really like Raycast's API");
};
```

#### Parameters

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| text | `string` | Yes | The text contents to insert at the cursor. |

#### Return

A promise that resolves when the text got pasted.
