# Actions

## API Reference

### CopyToClipboardAction

Action that copies the content to the clipboard.

The main window is closed and a HUD is shown after the content was copied to the clipboard.

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| content | `string` or `number` | Yes | - | The contents that will be written to the clipboard as string. |
| icon | `ImageLike` | No | [Icon.Clipboard](../user-interface/icons-and-images.md#icon) | A optional icon displayed for the item. See [ImageLike](../user-interface/icons-and-images.md#imagelike) for the supported formats and types. |
| shortcut | `KeyboardShortcut` | No | - | The keyboard shortcut for the action. |
| title | `string` | No | - | An optional title for the action. |
| onCopy | <code>(content: string \| number) => void</code> | No | - |  |

### OpenAction

An action to open a file or folder with a specific application, just as if you had double-clicked the
file's icon.

The main window is closed, after the file was opened.

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| application | `string` or `Application` | No | - | The application name to use for opening the file. |
| icon | `ImageLike` | No | [Icon.Finder](../user-interface/icons-and-images.md#icon) | The icon displayed for the action. |
| shortcut | `KeyboardShortcut` | No | - | The keyboard shortcut for the action. |
| target | `string` | Yes | - | The file, folder or URL to open. |
| title | `string` | Yes | - | The title for the action. |
| onOpen | <code>(target: string) => void</code> | No | - |  |

### OpenInBrowserAction

Action that opens a URL in the default browser..

The main window is closed, after the URL was opened in the browser.

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| icon | `ImageLike` | No | [Icon.Globe](../user-interface/icons-and-images.md#icon) | The icon displayed for the action. |
| shortcut | `KeyboardShortcut` | No | - | The optional keyboard shortcut for the menu item |
| title | `string` | No | - | An optional title for the action. |
| url | `string` | Yes | - | The URL to open. |
| onOpen | <code>(url: string) => void</code> | No | - |  |

### OpenWithAction

An action to open a file or folder with a specific application.

The action opens a sub-menu with all applications that can open the file or folder.
The main window is closed after the file was opened in the specified application.

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| icon | `ImageLike` | No | [Icon.Upload](../user-interface/icons-and-images.md#icon) | The icon displayed for the action. |
| path | `string` | Yes | - | The path to open. |
| shortcut | `KeyboardShortcut` | No | - | The keyboard shortcut for the action. |
| title | `string` | No | Open With | The title for the action. |
| onOpen | <code>(path: string) => void</code> | No | - |  |

### PasteAction

Action that pastes the content to the front-most applications.

The main window is closed, after the content was pasted to the front-most application.

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| content | `string` or `number` | Yes | - | The contents that will be written to the clipboard as string. |
| icon | `ImageLike` | No | [Icon.Clipboard](../user-interface/icons-and-images.md#icon) | The icon displayed for the action. |
| shortcut | `KeyboardShortcut` | No | - | The keyboard shortcut for the action. |
| title | `string` | No | - | An optional title for the action. |
| onPaste | <code>(content: string \| number) => void</code> | No | - |  |

### PushAction

Action that allows to push a new view to the navigation stack.

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| icon | `ImageLike` | No | - | The icon displayed for the action. |
| shortcut | `KeyboardShortcut` | No | - | The keyboard shortcut for the action. |
| target | `ReactNode` | Yes | - | The target view that will be pushed to the navigation stack. |
| title | `string` | Yes | - | The title displayed for the item. |
| onPush | <code>() => void</code> | No | - |  |

### ShowInFinderAction

Action that shows a file or folder in the Finder.

The main window is closed, after the file or folder was revealed in the Finder.

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| icon | `ImageLike` | No | [Icon.Finder](../user-interface/icons-and-images.md#icon) | A optional icon displayed for the item. See [ImageLike](../user-interface/icons-and-images.md#imagelike) for the supported formats and types. |
| path | `PathLike` | Yes | - | The path to open. |
| shortcut | `KeyboardShortcut` | No | - | The keyboard shortcut for the action. |
| title | `string` | No | Show in Finder | An optional title for the action. |
| onShow | <code>(path: PathLike) => void</code> | No | - |  |

### TrashAction

Action that moves a file or folder to the Trash.

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| icon | `ImageLike` | No | [Icon.Trash](../user-interface/icons-and-images.md#icon) | A optional icon displayed for the action. |
| paths | `PathLike` or `PathLike[]` | Yes | - | The item or items to move to the trash. |
| shortcut | `KeyboardShortcut` | No | - | The optional keyboard shortcut for the action. |
| title | `string` | No | Move to Trash | An optional title for the action. |
| onTrash | <code>(paths: PathLike \| PathLike[]) => void</code> | No | - |  |
