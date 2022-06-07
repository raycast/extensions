# Clipboard

Use the Clipboard APIs to work with text from your clipboard and current selection. You can write contents to the clipboard through [`Clipboard.copy`](clipboard.md#clipboard.copy) and clear it through [`Clipboard.clear`](clipboard.md#clipboard.clear). The [`Clipboard.paste`](clipboard.md#clipboard.paste) function inserts text at the current cursor position in your frontmost app.

The action [`Action.CopyToClipboard`](user-interface/actions.md#action.copytoclipboard) can be used to copy content of a selected list item to the clipboard and the action [`Action.Paste`](user-interface/actions.md#action.paste) can be used to insert text at in your frontmost app.

## API Reference

### Clipboard.copy

Copies text to the clipboard.

#### Signature

```typescript
async function copy(text: string): Promise<void>;
```

#### Example

```typescript
import { Clipboard } from "@raycast/api";

export default async () => {
  await Clipboard.copy("https://raycast.com");
};
```

#### Parameters

| Name | Description | Type |
| :--- | :--- | :--- |
| text<mark style="color:red;">*</mark> | The text to copy to the clipboard. | <code>string</code> |

#### Return

A Promise that resolves when the text is copied to the clipboard.

### Clipboard.paste

Pastes text to the current selection of the frontmost application.

#### Signature

```typescript
async function paste(text: string): Promise<void>;
```

#### Example

```typescript
import { Clipboard } from "@raycast/api";

export default async () => {
  await Clipboard.paste("I really like Raycast's API");
};
```

#### Parameters

| Name | Description | Type |
| :--- | :--- | :--- |
| text<mark style="color:red;">*</mark> | The text to insert at the cursor. | <code>string</code> |

#### Return

A Promise that resolves when the text is pasted.

### Clipboard.clear

Clears the current clipboard contents.

#### Signature

```typescript
async function clear(): Promise<void>;
```

#### Example

```typescript
import { Clipboard } from "@raycast/api";

export default async () => {
  await Clipboard.clear();
};
```

#### Return

A Promise that resolves when the clipboard is cleared.

### Clipboard.readText

Reads the clipboard as plain text.

#### Signature

```typescript
async function readText(): Promise<string | undefined>;
```

#### Example

```typescript
import { Clipboard } from "@raycast/api";

export default async () => {
  const text = await Clipboard.readText();
  console.log(text);
};
```

#### Return

A promise that resolves when the clipboard content was read as plain text.
