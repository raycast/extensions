# Environment

The Environment APIs are useful to get context about the setup in which your command runs. You can get information about the extension and command itself as well as Raycast. Furthermore, a few paths are injected and are helpful to construct file paths that are related to the command's assets.

## API Reference

### environment

Contains environment values such as the Raycast version, extension info, and paths.

#### Example

```typescript
import { environment } from "@raycast/api";

export default async function Command() {
  console.log(`Raycast version: ${environment.raycastVersion}`);
  console.log(`Owner or Author name: ${environment.ownerOrAuthorName}`);
  console.log(`Extension name: ${environment.extensionName}`);
  console.log(`Command name: ${environment.commandName}`);
  console.log(`Command mode: ${environment.commandMode}`);
  console.log(`Assets path: ${environment.assetsPath}`);
  console.log(`Support path: ${environment.supportPath}`);
  console.log(`Is development mode: ${environment.isDevelopment}`);
  console.log(`Appearance: ${environment.appearance}`);
  console.log(`Text size: ${environment.textSize}`);
  console.log(`LaunchType: ${environment.launchType}`);
}
```

#### Properties

| Property | Description | Type |
| :--- | :--- | :--- |
| appearance<mark style="color:red;">*</mark> | The appearance used by the Raycast application. | <code>"dark"</code> or <code>"light"</code> |
| assetsPath<mark style="color:red;">*</mark> | The absolute path to the assets directory of the extension. | <code>string</code> |
| commandMode<mark style="color:red;">*</mark> | The mode of the launched command, as specified in package.json | <code>"view"</code> or <code>"no-view"</code> or <code>"menu-bar"</code> |
| commandName<mark style="color:red;">*</mark> | The name of the launched command, as specified in package.json | <code>string</code> |
| extensionName<mark style="color:red;">*</mark> | The name of the extension, as specified in package.json | <code>string</code> |
| isDevelopment<mark style="color:red;">*</mark> | Indicates whether the command is a development command (vs. an installed command from the Store). | <code>boolean</code> |
| launchType<mark style="color:red;">*</mark> | The type of launch for the command (user initiated or background). | <code>[LaunchType](environment.md#launchtype)</code> |
| ownerOrAuthorName<mark style="color:red;">*</mark> | The name of the extension owner (if any) or author, as specified in package.json | <code>string</code> |
| raycastVersion<mark style="color:red;">*</mark> | The version of the main Raycast app | <code>string</code> |
| supportPath<mark style="color:red;">*</mark> | The absolute path for the support directory of an extension. Use it to read and write files related to your extension or command. | <code>string</code> |
| textSize<mark style="color:red;">*</mark> | The text size used by the Raycast application. | <code>"medium"</code> or <code>"large"</code> |
| canAccess<mark style="color:red;">*</mark> |  | <code>(api: unknown) => boolean</code> |

### environment.canAccess

Checks whether the user can access a specific API or not.

#### Signature

```typescript
function canAccess(api: any): bool;
```

#### Example

```typescript
import { AI, showHUD, environment } from "@raycast/api";
import fs from "fs";

export default async function main() {
  if (environment.canAccess(AI)) {
    const answer = await AI.ask("Suggest 5 jazz songs");
    await Clipboard.copy(answer);
  } else {
    await showHUD("You don't have access :(");
  }
}
```

#### Return

A Boolean indicating whether the user running the command has access to the API.

### getSelectedFinderItems

Gets the selected items from Finder.

#### Signature

```typescript
async function getSelectedFinderItems(): Promise<FileSystemItem[]>;
```

#### Example

```typescript
import { getSelectedFinderItems, showToast, Toast } from "@raycast/api";

export default async function Command() {
  try {
    const selectedItems = await getSelectedFinderItems();
    console.log(selectedItems);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot copy file path",
      message: String(error),
    });
  }
}
```

#### Return

A Promise that resolves with the [selected file system items](#filesystemitem). If Finder is not the frontmost application, the promise will be rejected.

### getSelectedText

Gets the selected text of the frontmost application.

#### Signature

```typescript
async function getSelectedText(): Promise<string>;
```

#### Example

```typescript
import { getSelectedText, Clipboard, showToast, Toast } from "@raycast/api";

export default async function Command() {
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
}
```

#### Return

A Promise that resolves with the selected text. If no text is selected in the frontmost application, the promise will be rejected.

## Types

### FileSystemItem

Holds data about a File System item. Use the [getSelectedFinderItems](#getselectedfinderitems) method to retrieve values.

#### Properties

| Property | Description | Type |
| :--- | :--- | :--- |
| path<mark style="color:red;">*</mark> | The path to the item | <code>string</code> |

### LaunchType

Indicates the type of command launch. Use this to detect whether the command has been launched from the background.

#### Enumeration members

| Name          | Description                                                |
| :------------ | :--------------------------------------------------------- |
| UserInitiated | A regular launch through user interaction                  |
| Background    | Scheduled through an interval and launched from background |
