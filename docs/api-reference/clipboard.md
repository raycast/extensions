# Clipboard

Use the Clipboard APIs to work with content from your clipboard. You can write contents to the clipboard through [`Clipboard.copy`](clipboard.md#clipboard.copy) and clear it through [`Clipboard.clear`](clipboard.md#clipboard.clear). The [`Clipboard.paste`](clipboard.md#clipboard.paste) function inserts text at the current cursor position in your frontmost app.

The action [`Action.CopyToClipboard`](user-interface/actions.md#action.copytoclipboard) can be used to copy content of a selected list item to the clipboard and the action [`Action.Paste`](user-interface/actions.md#action.paste) can be used to insert text in your frontmost app.

## API Reference

### Clipboard.copy

Copies text or a file to the clipboard.

#### Signature

```typescript
async function copy(content: string | number | Content, options?: CopyOptions): Promise<void>;
```

#### Example

```typescript
import { Clipboard } from "@raycast/api";

export default async function Command() {
  // copy some text
  await Clipboard.copy("https://raycast.com");

  const textContent: Clipboard.Content = {
    text: "https://raycast.com",
  };
  await Clipboard.copy(textContent);

  // copy a file
  const file = "/path/to/file.pdf";
  try {
    const fileContent: Clipboard.Content = { file };
    await Clipboard.copy(fileContent);
  } catch (error) {
    console.log(`Could not copy file '${file}'. Reason: ${error}`);
  }

  // copy confidential data
  await Clipboard.copy("my-secret-password", { concealed: true });
}
```

#### Parameters

<FunctionParametersTableFromJSDoc name="Clipboard.copy" />

#### Return

A Promise that resolves when the content is copied to the clipboard.

### Clipboard.paste

Pastes text or a file to the current selection of the frontmost application.

#### Signature

```typescript
async function paste(content: string | Content): Promise<void>;
```

#### Example

```typescript
import { Clipboard } from "@raycast/api";

export default async function Command() {
  await Clipboard.paste("I really like Raycast's API");
}
```

#### Parameters

<FunctionParametersTableFromJSDoc name="Clipboard.paste" />

#### Return

A Promise that resolves when the content is pasted.

### Clipboard.clear

Clears the current clipboard contents.

#### Signature

```typescript
async function clear(): Promise<void>;
```

#### Example

```typescript
import { Clipboard } from "@raycast/api";

export default async function Command() {
  await Clipboard.clear();
}
```

#### Return

A Promise that resolves when the clipboard is cleared.

### Clipboard.read

Reads the clipboard content as plain text, file name, or HTML.

#### Signature

```typescript
async function read(options?: { offset?: number }): Promise<ReadContent>;
```

#### Example

```typescript
import { Clipboard } from "@raycast/api";

export default async () => {
  const { text, file, html } = await Clipboard.read();
  console.log(text);
  console.log(file);
  console.log(html);
};
```

#### Parameters

<FunctionParametersTableFromJSDoc name="Clipboard.read" />

#### Return

A promise that resolves when the clipboard content was read as plain text, file name, or HTML.

### Clipboard.readText

Reads the clipboard as plain text.

#### Signature

```typescript
async function readText(options?: { offset?: number }): Promise<string | undefined>;
```

#### Example

```typescript
import { Clipboard } from "@raycast/api";

export default async function Command() {
  const text = await Clipboard.readText();
  console.log(text);
}
```

#### Parameters

<FunctionParametersTableFromJSDoc name="Clipboard.readText" />

#### Return

A promise that resolves once the clipboard content is read as plain text.

## Types

### Clipboard.Content

Type of content that is copied and pasted to and from the Clipboard

```typescript
type Content =
  | {
      text: string;
    }
  | {
      file: PathLike;
    }
  | {
      html: string;
      text?: string; // The alternative text representation of the content.
    };
```

### Clipboard.ReadContent

Type of content that is read from the Clipboard

```typescript
type Content =
  | {
      text: string;
    }
  | {
      file?: string;
    }
  | {
      html?: string;
    };
```

### Clipboard.CopyOptions

Type of options passed to `Clipboard.copy`.

#### Properties

<InterfaceTableFromJSDoc name="Clipboard.CopyOptions" />
