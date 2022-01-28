# Environment

The Environment APIs are useful to get context about the setup in which your command runs. You can get information about the extension and command itself as well as Raycast. Furthermore, a few paths are injected that are helpful to construct file paths that are related to the command's assets.

## API Reference

### getSelectedFinderItems

Gets the selected items from Finder.

#### Signature

```typescript
async function getSelectedFinderItems(): Promise<FileSystemItem[]>
```

#### Example

```typescript
import { getSelectedFinderItems, pasteText, showToast, ToastStyle } from "@raycast/api";

export default async () => {
  try {
    const selectedItems = await getSelectedFinderItems();
    if (selectedItems.length) {
      await pasteText(selectedItems[0].path);
    }
  } catch (error) {
    await showToast(ToastStyle.Failure, "Cannot copy file path", String(error));
  }
};
```

#### Return

Returns a promise that resolves with the selected file system items.

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

### environment

```typescript
environment: Environment = ...
```

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
```

### Environment

Holds data about the environment the command is running in. Use the global [environment](#environment) object to retrieve values.

#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| assetsPath | <code>string</code> | Yes | The absolute path to the assets directory of the extension. |
| commandName | <code>string</code> | Yes | The name of the launched command, as specified in package.json |
| extensionName | <code>string</code> | Yes | The name of the extension, as specified in package.json |
| isDevelopment | <code>boolean</code> | Yes | Indicates whether the command is a development command (vs. an installed command from the Store). |
| raycastVersion | <code>string</code> | Yes | The version of the main Raycast app |
| supportPath | <code>string</code> | Yes | The absolute path for the support directory of an extension. Use it to read and write files related to your extension or command. |

### FileSystemItem

Holds data about a File System item. Use the [getSelectedFinderItems](#getselectedfinderitems) method to retrieve values.

#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| path | <code>string</code> | Yes | The path to the item |
