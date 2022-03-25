# Actions

Our API includes a few built-in actions that can be used for common interactions, such as opening a link or copying some content to the clipboard. By using them, you make sure to follow our human interface guidelines. If you need something custom, use the [`Action`](#action) component. All built-in actions are just abstractions on top of it.

## API Reference

### Action

A context-specific action that can be performed by the user.

Assign keyboard shortcuts to items to make it easier for users to perform frequently used actions.

#### Example

```typescript
import { ActionPanel, Action, List } from "@raycast/api";

export default function Command() {
  return (
    <List navigationTitle="Open Pull Requests">
      <List.Item
        title="Docs: Update API Reference"
        subtitle="#1"
        actions={
          <ActionPanel title="#1 in raycast/extensions">
            <Action.OpenInBrowser url="https://github.com/raycast/extensions/pull/1" />
            <Action.CopyToClipboard
              title="Copy Pull Request Number"
              content="#1"
            />
            <Action
              title="Close Pull Request"
              onAction={() => console.log("Close PR #1")}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
```

#### Props

| Prop     | Type                                                      | Required | Default | Description                                                                                                                                                                                                                                                                                                                                                                                      |
| :------- | :-------------------------------------------------------- | :------- | :------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| icon     | <code>[ImageLike](./icons-and-images.md#imagelike)</code> | No       | -       | The icon displayed for the action.                                                                                                                                                                                                                                                                                                                                                               |
| id       | <code>string</code>                                       | No       | -       | ID of the item.                                                                                                                                                                                                                                                                                                                                                                                  |
| shortcut | <code>[Keyboard.Shortcut](../keyboard.md#shortcut)</code> | No       | -       | <p>The keyboard shortcut for the item.</p> <p>The first and second action in an [Action Panel](./action-panel.md) become the primary and secondary action, so they automatically get the default keyboard shortcuts assigned. In [List](./list.md) and [Detail](./detail.md), this is `↵` for the primary and `⌘` `↵` for the secondary action. In [Form](./form.md) it's `⌘` `↵` for the primary and `⌘` `⇧` `↵` for the secondary.</p>  |
| title    | <code>string</code>                                       | Yes      | -       | The title displayed for the item.                                                                                                                                                                                                                                                                                                                                                                |
| onAction | <code>() => void</code>                                   | No       | -       |                                                                                                                                                                                                                                                                                                                                                                                                  |

### Action.CopyToClipboard

Action that copies the content to the clipboard.

The main window is closed, and a HUD is shown after the content was copied to the clipboard.

#### Example

```typescript
import { ActionPanel, Action, Detail } from "@raycast/api";

export default function Command() {
  return (
    <Detail
      markdown="Press `⌘ + .` and share some love."
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            content="I ❤️ Raycast"
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}
```

#### Props

| Prop     | Type                                                      | Required | Default                                      | Description                                                   |
| :------- | :-------------------------------------------------------- | :------- | :------------------------------------------- | :------------------------------------------------------------ |
| content  | <code>string</code> or <code>number</code>                | Yes      | -                                            | The contents that will be written to the clipboard as string. |
| icon     | <code>[ImageLike](./icons-and-images.md#imagelike)</code> | No       | [Icon.Clipboard](./icons-and-images.md#icon) | A optional icon displayed for the item.                       |
| shortcut | <code>[Keyboard.Shortcut](../keyboard.md#shortcut)</code> | No       | -                                            | The keyboard shortcut for the action.                         |
| title    | <code>string</code>                                       | No       | -                                            | An optional title for the action.                             |
| onCopy   | <code>(content: string \| number) => void</code>          | No       | -                                            |                                                               |

### Action.Open

An action to open a file or folder with a specific application, just as if you had double-clicked the
file's icon.

The main window is closed after the file is opened.

#### Example

```typescript
import { ActionPanel, Detail, Action } from "@raycast/api";

export default function Command() {
  return (
    <Detail
      markdown="Check out your extension code."
      actions={
        <ActionPanel>
          <Action.Open title="Open Folder" target={__dirname} />
        </ActionPanel>
      }
    />
  );
}
```

#### Props

| Prop        | Type                                                                           | Required | Default                                   | Description                                       |
| :---------- | :----------------------------------------------------------------------------- | :------- | :---------------------------------------- | :------------------------------------------------ |
| application | <code>string</code> or <code>[Application](../utilities.md#application)</code> | No       | -                                         | The application name to use for opening the file. |
| icon        | <code>[ImageLike](./icons-and-images.md#imagelike)</code>                      | No       | [Icon.Finder](./icons-and-images.md#icon) | The icon displayed for the action.                |
| shortcut    | <code>[Keyboard.Shortcut](../keyboard.md#shortcut)</code>                      | No       | -                                         | The keyboard shortcut for the action.             |
| target      | <code>string</code>                                                            | Yes      | -                                         | The file, folder or URL to open.                  |
| title       | <code>string</code>                                                            | Yes      | -                                         | The title for the action.                         |
| onOpen      | <code>(target: string) => void</code>                                          | No       | -                                         |                                                   |

### Action.OpenInBrowser

Action that opens a URL in the default browser.

The main window is closed after the URL is opened in the browser.

#### Example

```typescript
import { ActionPanel, Detail, Action } from "@raycast/api";

export default function Command() {
  return (
    <Detail
      markdown="Join the gang!"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url="https://raycast.com/jobs" />
        </ActionPanel>
      }
    />
  );
}
```

#### Props

| Prop     | Type                                                      | Required | Default                                  | Description                                      |
| :------- | :-------------------------------------------------------- | :------- | :--------------------------------------- | :----------------------------------------------- |
| icon     | <code>[ImageLike](./icons-and-images.md#imagelike)</code> | No       | [Icon.Globe](./icons-and-images.md#icon) | The icon displayed for the action.               |
| shortcut | <code>[Shortcut](../keyboard.md#shortcut)</code>          | No       | -                                        | The optional keyboard shortcut for the menu item |
| title    | <code>string</code>                                       | No       | -                                        | An optional title for the action.                |
| url      | <code>string</code>                                       | Yes      | -                                        | The URL to open.                                 |
| onOpen   | <code>(url: string) => void</code>                        | No       | -                                        |                                                  |

### Action.OpenWith

Action that opens a file or folder with a specific application.

The action opens a sub-menu with all applications that can open the file or folder.
The main window is closed after the file is opened in the specified application.

#### Example

```typescript
import { ActionPanel, Detail, Action } from "@raycast/api";
import { homedir } from "os";

const DESKTOP_DIR = `${homedir()}/Desktop`;

export default function Command() {
  return (
    <Detail
      markdown="What do you want to use to open your desktop with?"
      actions={
        <ActionPanel>
          <Action.OpenWith path={DESKTOP_DIR} />
        </ActionPanel>
      }
    />
  );
}
```

#### Props

| Prop     | Type                                                      | Required | Default                                   | Description                           |
| :------- | :-------------------------------------------------------- | :------- | :---------------------------------------- | :------------------------------------ |
| icon     | <code>[ImageLike](./icons-and-images.md#imagelike)</code> | No       | [Icon.Upload](./icons-and-images.md#icon) | The icon displayed for the action.    |
| path     | <code>string</code>                                       | Yes      | -                                         | The path to open.                     |
| shortcut | <code>[Keyboard.Shortcut](../keyboard.md#shortcut)</code> | No       | -                                         | The keyboard shortcut for the action. |
| title    | <code>string</code>                                       | No       | Open With                                 | The title for the action.             |
| onOpen   | <code>(path: string) => void</code>                       | No       | -                                         |                                       |

### Action.Paste

Action that pastes the content to the front-most applications.

The main window is closed after the content is pasted to the front-most application.

#### Example

```typescript
import { ActionPanel, Detail, Action } from "@raycast/api";

export default function Command() {
  return (
    <Detail
      markdown="Let us know what you think about the Raycast API?"
      actions={
        <ActionPanel>
          <Action.Paste content="api@raycast.com" />
        </ActionPanel>
      }
    />
  );
}
```

#### Props

| Prop     | Type                                                      | Required | Default                                      | Description                                                   |
| :------- | :-------------------------------------------------------- | :------- | :------------------------------------------- | :------------------------------------------------------------ |
| content  | <code>string</code> or <code>number</code>                | Yes      | -                                            | The contents that will be written to the clipboard as string. |
| icon     | <code>[ImageLike](./icons-and-images.md#imagelike)</code> | No       | [Icon.Clipboard](./icons-and-images.md#icon) | The icon displayed for the action.                            |
| shortcut | <code>[Keyboard.Shortcut](../keyboard.md#shortcut)</code> | No       | -                                            | The keyboard shortcut for the action.                         |
| title    | <code>string</code>                                       | No       | -                                            | An optional title for the action.                             |
| onPaste  | <code>(content: string \| number) => void</code>          | No       | -                                            |                                                               |

### Action.Push

Action that pushes a new view to the navigation stack.

#### Example

```typescript
import { ActionPanel, Detail, Action } from "@raycast/api";

function Ping() {
  return (
    <Detail
      markdown="Ping"
      actions={
        <ActionPanel>
          <Action.Push title="Push Pong" target={<Pong />} />
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

| Prop     | Type                                                      | Required | Default | Description                                                  |
| :------- | :-------------------------------------------------------- | :------- | :------ | :----------------------------------------------------------- |
| icon     | <code>[ImageLike](./icons-and-images.md#imagelike)</code> | No       | -       | The icon displayed for the action.                           |
| shortcut | <code>[Shortcut](../keyboard.md#shortcut)</code>          | No       | -       | The keyboard shortcut for the action.                        |
| target   | <code>ReactNode</code>                                    | Yes      | -       | The target view that will be pushed to the navigation stack. |
| title    | <code>string</code>                                       | Yes      | -       | The title displayed for the item.                            |
| onPush   | <code>() => void</code>                                   | No       | -       |                                                              |

### Action.ShowInFinder

Action that shows a file or folder in the Finder.

The main window is closed after the file or folder is revealed in the Finder.

#### Example

```typescript
import { ActionPanel, Detail, Action } from "@raycast/api";
import { homedir } from "os";

const DOWNLOADS_DIR = `${homedir()}/Downloads`;

export default function Command() {
  return (
    <Detail
      markdown="Are your downloads pilling up again?"
      actions={
        <ActionPanel>
          <Action.ShowInFinder path={DOWNLOADS_DIR} />
        </ActionPanel>
      }
    />
  );
}
```

#### Props

| Prop     | Type                                                      | Required | Default                                   | Description                             |
| :------- | :-------------------------------------------------------- | :------- | :---------------------------------------- | :-------------------------------------- |
| icon     | <code>[ImageLike](./icons-and-images.md#imagelike)</code> | No       | [Icon.Finder](./icons-and-images.md#icon) | A optional icon displayed for the item. |
| path     | <code>PathLike</code>                                     | Yes      | -                                         | The path to open.                       |
| shortcut | <code>[Keyboard.Shortcut](../keyboard.md#shortcut)</code> | No       | -                                         | The keyboard shortcut for the action.   |
| title    | <code>string</code>                                       | No       | Show in Finder                            | An optional title for the action.       |
| onShow   | <code>(path: PathLike) => void</code>                     | No       | -                                         |                                         |

### Action.SubmitForm

Action that adds a submit handler for capturing form values.

#### Example

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit Answer"
            onSubmit={(values) => console.log(values)}
          />
        </ActionPanel>
      }
    >
      <Form.Checkbox id="answer" label="Are you happy?" defaultValue={true} />
    </Form>
  );
}
```

#### Props

| Prop     | Type                                                      | Required | Default | Description                           |
| :------- | :-------------------------------------------------------- | :------- | :------ | :------------------------------------ |
| icon     | <code>[ImageLike](./icons-and-images.md#imagelike)</code> | No       | -       | The icon displayed for the action.    |
| shortcut | <code>[Keyboard.Shortcut](../keyboard.md#shortcut)</code> | No       | -       | The keyboard shortcut for the action. |
| title    | <code>string</code>                                       | No       | -       | The title displayed for the item.     |
| onSubmit | <code>(input: [Values](./form.md#values)) => void</code>  | No       | -       |                                       |

### Action.Trash

Action that moves a file or folder to the Trash.

#### Example

```typescript
import { ActionPanel, Detail, Action } from "@raycast/api";
import { homedir } from "os";

const FILE = `${homedir()}/Downloads/get-rid-of-me.txt`;

export default function Command() {
  return (
    <Detail
      markdown="Some spring cleaning?"
      actions={
        <ActionPanel>
          <Action.Trash paths={FILE} />
        </ActionPanel>
      }
    />
  );
}
```

#### Props

| Prop     | Type                                                      | Required | Default                                  | Description                                    |
| :------- | :-------------------------------------------------------- | :------- | :--------------------------------------- | :--------------------------------------------- |
| icon     | <code>[ImageLike](./icons-and-images.md#imagelike)</code> | No       | [Icon.Trash](./icons-and-images.md#icon) | A optional icon displayed for the action.      |
| paths    | <code>PathLike</code> or <code>PathLike[]</code>          | Yes      | -                                        | The item or items to move to the trash.        |
| shortcut | <code>[Keyboard.Shortcut](../keyboard.md#shortcut)</code> | No       | -                                        | The optional keyboard shortcut for the action. |
| title    | <code>string</code>                                       | No       | Move to Trash                            | An optional title for the action.              |
| onTrash  | <code>(paths: PathLike \| PathLike[]) => void</code>      | No       | -                                        |                                                |

### Action.CreateSnippet

Action that navigates to the the Create Snippet command with some or all of the fields prefilled.

#### Example

```typescript
import { ActionPanel, Detail, Action } from "@raycast/api";

export default function Command() {
  return (
    <Detail
      markdown="Test out snippet creation"
      actions={
        <ActionPanel>
          <Action.CreateSnippet snippet={{ text: "DE75512108001245126199" }} />
        </ActionPanel>
      }
    />
  );
}
```

#### Props

| Prop     | Type                                                      | Required | Default                                  | Description                                    |
| :------- | :-------------------------------------------------------- | :------- | :--------------------------------------- | :--------------------------------------------- |
| snippet  | <code>[Snippet](#snippet)</code>                          | yes      | -                                        | The Snippet to create.                         |
| icon     | <code>[ImageLike](./icons-and-images.md#imagelike)</code> | No       | [Icon.Link](./icons-and-images.md#icon)  | A optional icon displayed for the action.      |
| shortcut | <code>[Keyboard.Shortcut](../keyboard.md#shortcut)</code> | No       | -                                        | The optional keyboard shortcut for the action. |
| title    | <code>string</code>                                       | No       | Move to Trash                            | An optional title for the action.              |

### Action.CreateQuicklink

Action that navigates to the the Create Quicklink command with some or all of the fields prefilled.

#### Example

```typescript
import { ActionPanel, Detail, Action } from "@raycast/api";

export default function Command() {
  return (
    <Detail
      markdown="Test out quicklink creation"
      actions={
        <ActionPanel>
          <Action.CreateQuicklink quicklink={{ link: "https://duckduckgo.com/?q={Query}" }} />
        </ActionPanel>
      }
    />
  );
}
```

#### Props

| Prop      | Type                                                      | Required | Default                                         | Description                                    |
| :-------- | :-------------------------------------------------------- | :------- | ----------------------------------------------- | :--------------------------------------------- |
| quicklink | <code>[Quicklink](#quicklink)</code>                      | Yes      | -                                               | The Quicklink to create.                       |
| icon      | <code>[ImageLike](./icons-and-images.md#imagelike)</code> | No       | [Icon.TextDocument](./icons-and-images.md#icon) | A optional icon displayed for the action.      |
| shortcut  | <code>[Keyboard.Shortcut](../keyboard.md#shortcut)</code> | No       | -                                               | The optional keyboard shortcut for the action. |
| title     | <code>string</code>                                       | No       | Move to Trash                                   | An optional title for the action.              |

## Types

### Snippet

#### Properties

| Property  | Type                 | Required | Default  | Description                         |
| :-------- | :------------------- | :------- | :------- | :---------------------------------- |
| text      | <code>string</code>  | Yes      | -        | The snippet contents.               |
| name      | <code>string</code>  | No       | -        | The snippet name.                   |
| keyword   | <code>string</code>  | No       | -        | The keyword to trigger the snippet. |

### Quicklink

#### Properties

| Property    | Type                                                                           | Required | Default  | Description                                                                                              |
| :---------- | ------------------------------------------------------------------------------ | :------- | :------- | -------------------------------------------------------------------------------------------------------- |
| link        | <code>string</code>                                                            | Yes      | -        | The URL or file path, optionally including placeholders such as in "https://google.com/search?q={Query}" |
| name        | <code>string</code>                                                            | No       | -        | The quicklink name.                                                                                      |
| application | <code>string</code> or <code>[Application](../utilities.md#application)</code> | No       | -        | The application that the quicklink should be opened in.                                                  |
