# Actions

Our API includes a few built-in actions that can be used for common interactions such as opening a link or copying some content to the clipboard. By using them, you make sure to follow our human interface guidelines. If you need something custom, use the [`ActionPanel.Item`](action-panel.md#actionpanel-item) component. All built-in actions are just abstractions on top of it.

## API Reference

### CopyToClipboardAction

Action that copies the content to the clipboard.

The main window is closed and a HUD is shown after the content was copied to the clipboard.

#### Example

```typescript
import { ActionPanel, CopyToClipboardAction, Detail } from "@raycast/api";

export default function Command() {
  return (
    <Detail
      markdown="Press `⌘ + .` and share some love."
      actions={
        <ActionPanel>
          <CopyToClipboardAction content="I ❤️ Raycast" shortcut={{ modifiers: ["cmd"], key: "." }} />
        </ActionPanel>
      }
    />
  );
}
```

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| content | `string` or `number` | Yes | - | The contents that will be written to the clipboard as string. |
| icon | `ImageLike` | No | [Icon.Clipboard](icons-and-images.md#icon) | A optional icon displayed for the item. See [ImageLike](icons-and-images.md#imagelike) for the supported formats and types. |
| shortcut | `KeyboardShortcut` | No | - | The keyboard shortcut for the action. |
| title | `string` | No | - | An optional title for the action. |
| onCopy | `(content: string | number) => void` | No | - |  |

### OpenAction

An action to open a file or folder with a specific application, just as if you had double-clicked the file's icon.

The main window is closed, after the file was opened.

#### Example

```typescript
import { ActionPanel, Detail, OpenAction } from "@raycast/api";

export default function Command() {
  return (
    <Detail
      markdown="Check out your extension code."
      actions={
        <ActionPanel>
          <OpenAction title="Open Folder" target={__dirname} />
        </ActionPanel>
      }
    />
  );
}
```

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| application | `string` or `Application` | No | - | The application name to use for opening the file. |
| icon | `ImageLike` | No | [Icon.Finder](icons-and-images.md#icon) | The icon displayed for the action. |
| shortcut | `KeyboardShortcut` | No | - | The keyboard shortcut for the action. |
| target | `string` | Yes | - | The file, folder or URL to open. |
| title | `string` | Yes | - | The title for the action. |
| onOpen | `(target: string) => void` | No | - |  |

### OpenInBrowserAction

Action that opens a URL in the default browser..

The main window is closed, after the URL was opened in the browser.

#### Example

```typescript
import { ActionPanel, Detail, OpenInBrowserAction } from "@raycast/api";

export default function Command() {
  return (
    <Detail
      markdown="Join the gang!"
      actions={
        <ActionPanel>
          <OpenInBrowserAction url="https://raycast.com/jobs" />
        </ActionPanel>
      }
    />
  );
}
```

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| icon | `ImageLike` | No | [Icon.Globe](icons-and-images.md#icon) | The icon displayed for the action. |
| shortcut | `KeyboardShortcut` | No | - | The optional keyboard shortcut for the menu item |
| title | `string` | No | - | An optional title for the action. |
| url | `string` | Yes | - | The URL to open. |
| onOpen | `(url: string) => void` | No | - |  |

### OpenWithAction

An action to open a file or folder with a specific application.

The action opens a sub-menu with all applications that can open the file or folder. The main window is closed after the file was opened in the specified application.

#### Example

```typescript
import { ActionPanel, Detail, OpenWithAction } from "@raycast/api";
import { homedir } from "os";

const DESKTOP_DIR = `${homedir()}/Desktop`;

export default function Command() {
  return (
    <Detail
      markdown="What do you want to use to open your desktop with?"
      actions={
        <ActionPanel>
          <OpenWithAction path={DESKTOP_DIR} />
        </ActionPanel>
      }
    />
  );
}
```

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| icon | `ImageLike` | No | [Icon.Upload](icons-and-images.md#icon) | The icon displayed for the action. |
| path | `string` | Yes | - | The path to open. |
| shortcut | `KeyboardShortcut` | No | - | The keyboard shortcut for the action. |
| title | `string` | No | Open With | The title for the action. |
| onOpen | `(path: string) => void` | No | - |  |

### PasteAction

Action that pastes the content to the front-most applications.

The main window is closed, after the content was pasted to the front-most application.

#### Example

```typescript
import { ActionPanel, Detail, PasteAction } from "@raycast/api";

export default function Command() {
  return (
    <Detail
      markdown="Let us know what you think about the Raycast API?"
      actions={
        <ActionPanel>
          <PasteAction content="api@raycast.com" />
        </ActionPanel>
      }
    />
  );
}
```

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| content | `string` or `number` | Yes | - | The contents that will be written to the clipboard as string. |
| icon | `ImageLike` | No | [Icon.Clipboard](icons-and-images.md#icon) | The icon displayed for the action. |
| shortcut | `KeyboardShortcut` | No | - | The keyboard shortcut for the action. |
| title | `string` | No | - | An optional title for the action. |
| onPaste | `(content: string | number) => void` | No | - |  |

### PushAction

Action that allows to push a new view to the navigation stack.

#### Example

```typescript
import { ActionPanel, Detail, PushAction } from "@raycast/api";

function Ping() {
  return (
    <Detail
      markdown="Ping"
      actions={
        <ActionPanel>
          <PushAction title="Push Pong" target={<Pong />} />
        </ActionPanel>
      }
    />
  );
}

function Pong() {
  return <Detail markdown="Pong" />;
}

export default function Command() {
  return <Ping />;
}
```

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| icon | `ImageLike` | No | - | The icon displayed for the action. |
| shortcut | `KeyboardShortcut` | No | - | The keyboard shortcut for the action. |
| target | `ReactNode` | Yes | - | The target view that will be pushed to the navigation stack. |
| title | `string` | Yes | - | The title displayed for the item. |
| onPush | `() => void` | No | - |  |

### ShowInFinderAction

Action that shows a file or folder in the Finder.

The main window is closed, after the file or folder was revealed in the Finder.

#### Example

```typescript
import { ActionPanel, Detail, ShowInFinderAction } from "@raycast/api";
import { homedir } from "os";

const DOWNLOADS_DIR = `${homedir()}/Downloads`;

export default function Command() {
  return (
    <Detail
      markdown="Are your downloads pilling up again?"
      actions={
        <ActionPanel>
          <ShowInFinderAction path={DOWNLOADS_DIR} />
        </ActionPanel>
      }
    />
  );
}
```

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| icon | `ImageLike` | No | [Icon.Finder](icons-and-images.md#icon) | A optional icon displayed for the item. See [ImageLike](icons-and-images.md#imagelike) for the supported formats and types. |
| path | `PathLike` | Yes | - | The path to open. |
| shortcut | `KeyboardShortcut` | No | - | The keyboard shortcut for the action. |
| title | `string` | No | Show in Finder | An optional title for the action. |
| onShow | `(path: PathLike) => void` | No | - |  |

### SubmitFormAction

Action that allows to add a submit handler for capturing form values.

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| icon | `ImageLike` | No | - | The icon displayed for the action. |
| shortcut | `KeyboardShortcut` | No | - | The keyboard shortcut for the action. |
| title | `string` | No | - | The title displayed for the item. |
| onSubmit | `(input: Values) => void` | No | - |  |

### TrashAction

Action that moves a file or folder to the Trash.

#### Example

```typescript
import { ActionPanel, Detail, TrashAction } from "@raycast/api";
import { homedir } from "os";

const FILE = `${homedir()}/Downloads/get-rid-of-me.txt`;

export default function Command() {
  return (
    <Detail
      markdown="Some spring cleaning?"
      actions={
        <ActionPanel>
          <TrashAction paths={FILE} />
        </ActionPanel>
      }
    />
  );
}
```

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| icon | `ImageLike` | No | [Icon.Trash](icons-and-images.md#icon) | A optional icon displayed for the action. |
| paths | `PathLike` or `PathLike[]` | Yes | - | The item or items to move to the trash. |
| shortcut | `KeyboardShortcut` | No | - | The optional keyboard shortcut for the action. |
| title | `string` | No | Move to Trash | An optional title for the action. |
| onTrash | `(paths: PathLike | PathLike[]) => void` | No | - |  |

