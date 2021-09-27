# Actions

## API Reference

### CopyToClipboardAction

Action that copies the content to the clipboard.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| content | `string` or `number` | Yes | - | The contents that will be written to the clipboard as string. |
| icon | [`ImageLike`](icons-and-images.md#imagelike) | No | Icon.Clipboard | A optional icon displayed for the item. See [ImageLike](icons-and-images.md#imagelike) for the supported formats and types. |
| shortcut | [`KeyboardShortcut`](https://github.com/raycast/api-docs/tree/321f849e249b8db494717dccaf744773ff492d89/api-reference/keyboard.md#keyboardshortcut) | No | - | The keyboard shortcut for the action. |
| title | `string` | No | - | An optional title for the action. |
| onCopy | `(content: string | number) => void` | No | - |  |

### OpenAction

An action to open a file or folder with a specific application, just as if you had double-clicked the file's icon.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| application | `string` or [`Application`](../utilities/application.md#application) | No | - | The application name to use for opening the file. |
| icon | [`ImageLike`](icons-and-images.md#imagelike) | No | Icon.Finder | The icon displayed for the action. |
| shortcut | [`KeyboardShortcut`](https://github.com/raycast/api-docs/tree/321f849e249b8db494717dccaf744773ff492d89/api-reference/keyboard.md#keyboardshortcut) | No | - | The keyboard shortcut for the action. |
| target | `string` | Yes | - | The file, folder or URL to open. |
| title | `string` | Yes | - | The title for the action. |
| onOpen | `(target: string) => void` | No | - |  |

### OpenInBrowserAction

Action that opens a URL in the default browser..

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| icon | [`ImageLike`](icons-and-images.md#imagelike) | No | Icon.Globe | The icon displayed for the action. |
| shortcut | [`KeyboardShortcut`](https://github.com/raycast/api-docs/tree/321f849e249b8db494717dccaf744773ff492d89/api-reference/keyboard.md#keyboardshortcut) | No | - | The optional keyboard shortcut for the menu item |
| title | `string` | No | - | An optional title for the action. |
| url | `string` | Yes | - | The URL to open. |
| onOpen | `(url: string) => void` | No | - |  |

### OpenWithAction

An action to open a file or folder with a specific application.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| icon | [`ImageLike`](icons-and-images.md#imagelike) | No | Icon.Upload | The icon displayed for the action. |
| path | `string` | Yes | - | The path to open. |
| shortcut | [`KeyboardShortcut`](https://github.com/raycast/api-docs/tree/321f849e249b8db494717dccaf744773ff492d89/api-reference/keyboard.md#keyboardshortcut) | No | - | The keyboard shortcut for the action. |
| title | `string` | No | Open With | The title for the action. |
| onOpen | `(path: string) => void` | No | - |  |

### PasteAction

Action that pastes the content to the front-most applications.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| content | `string` or `number` | Yes | - | The contents that will be written to the clipboard as string. |
| icon | [`ImageLike`](icons-and-images.md#imagelike) | No | Icon.Clipboard | The icon displayed for the action. |
| shortcut | [`KeyboardShortcut`](https://github.com/raycast/api-docs/tree/321f849e249b8db494717dccaf744773ff492d89/api-reference/keyboard.md#keyboardshortcut) | No | - | The keyboard shortcut for the action. |
| title | `string` | No | - | An optional title for the action. |
| onPaste | `(content: string | number) => void` | No | - |  |

### PushAction

Action that allows to push a new view to the navigation stack.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| icon | [`ImageLike`](icons-and-images.md#imagelike) | No | - | The icon displayed for the action. |
| shortcut | [`KeyboardShortcut`](https://github.com/raycast/api-docs/tree/321f849e249b8db494717dccaf744773ff492d89/api-reference/keyboard.md#keyboardshortcut) | No | - | The keyboard shortcut for the action. |
| target | `ReactNode` | Yes | - | The target view that will be pushed to the navigation stack. |
| title | `string` | Yes | - | The title displayed for the item. |
| onPush | `() => void` | No | - |  |

### ShowInFinderAction

Action that shows a file or folder in the Finder.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| icon | [`ImageLike`](icons-and-images.md#imagelike) | No | Icon.Finder | A optional icon displayed for the item. See [ImageLike](icons-and-images.md#imagelike) for the supported formats and types. |
| path | `PathLike` | Yes | - | The path to open. |
| shortcut | [`KeyboardShortcut`](https://github.com/raycast/api-docs/tree/321f849e249b8db494717dccaf744773ff492d89/api-reference/keyboard.md#keyboardshortcut) | No | - | The keyboard shortcut for the action. |
| title | `string` | No | Show in Finder | An optional title for the action. |
| onShow | `(path: PathLike) => void` | No | - |  |

### TrashAction

Action that moves a file or folder to the Trash.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| icon | [`ImageLike`](icons-and-images.md#imagelike) | No | Icon.Trash | A optional icon displayed for the action. |
| paths | `PathLike` or `PathLike[]` | Yes | - | The item or items to move to the trash. |
| shortcut | [`KeyboardShortcut`](https://github.com/raycast/api-docs/tree/321f849e249b8db494717dccaf744773ff492d89/api-reference/keyboard.md#keyboardshortcut) | No | - | The optional keyboard shortcut for the action. |
| title | `string` | No | Move to Trash | An optional title for the action. |
| onTrash | `(paths: PathLike | PathLike[]) => void` | No | - |  |

