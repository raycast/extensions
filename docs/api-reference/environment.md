# Environment

The Environment APIs are useful to get context about the setup in which your command runs. You can get information about the extension and command itself as well as Raycast. Furthermore, a few paths are injected and are helpful to construct file paths that are related to the command's assets.

## API Reference

### environment

Contains environment values such as the Raycast version, extension info, and paths.

#### Example

```typescript
import { environment } from "@raycast/api";

console.log(`Raycast version: ${environment.raycastVersion}`);
console.log(`Extension name: ${environment.extensionName}`);
console.log(`Command name: ${environment.commandName}`);
console.log(`Assets path: ${environment.assetsPath}`);
console.log(`Support path: ${environment.supportPath}`);
console.log(`Is development mode: ${environment.isDevelopment}`);
console.log(`Theme: ${environment.theme}`);
```

#### Properties

<InterfaceTableFromJSDoc name="Environment" />

### getSelectedFinderItems

Gets the selected items from Finder.

#### Signature

```typescript
async function getSelectedFinderItems(): Promise<FileSystemItem[]>;
```

#### Example

```typescript
import { getSelectedFinderItems, Clipboard, showToast, Toast } from "@raycast/api";

export default async () => {
  try {
    const selectedItems = await getSelectedFinderItems();
    if (selectedItems.length) {
      await Clipboard.paste(selectedItems[0].path);
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot copy file path",
      message: String(error),
    });
  }
};
```

#### Return

A Promise that resolves with the [selected file system items](#filesystemitem).

### getSelectedText

Gets the selected text of the frontmost application.

#### Signature

```typescript
async function getSelectedText(): Promise<string>;
```

#### Example

```typescript
import { getSelectedText, Clipboard, showToast, Toast } from "@raycast/api";

export default async () => {
  try {
    const selectedText = await getSelectedText();
    const transformedText = selectedText.toUpperCase();
    await Clipboard.paste(transformedText);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot transform text",
      message: String(error),
    });
  }
};
```

#### Return

A Promise that resolves with the selected text.

## Types

### FileSystemItem

Holds data about a File System item. Use the [getSelectedFinderItems](#getselectedfinderitems) method to retrieve values.

#### Properties

<InterfaceTableFromJSDoc name="FileSystemItem" />
