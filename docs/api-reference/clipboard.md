# Clipboard

Use the Clipboard APIs to work with text from your clipboard and current selection. You can write contents to the clipboard through [`copyTextToClipboard`](clipboard.md#copytexttoclipboard) and clear it through [`clearClipboard`](clipboard.md#clearclipboard). The convenience action [`CopyToClipboardAction`](user-interface/actions.md#CopyToClipboardAction) can be used to copy content of a selected list item to the clipboard.The [`getSelectedText`](clipboard.md#getselectedtext) API allows to get the current text selection of the frontmost application. This can be handy if you need to transform or act on the selection. The [`pasteText`](clipboard.md#pastetext) function inserts text at the current cursor position. We use this in the Clipboard History to paste an entry to your frontmost app. You can use the [`PasteAction`](user-interface/actions.md#pasteaction) to add this functionality to your list or form.

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
| text | <code>string</code> | Yes | The text to copy to the clipboard. |

#### Return

A promise that resolves when the text got copied to the clipboard.

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
| text | <code>string</code> | Yes | The text to insert at the cursor. |

#### Return

A promise that resolves when the text got pasted.
