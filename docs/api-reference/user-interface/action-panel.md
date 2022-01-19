# Action Panel

## API Reference

### ActionPanel

Exposes a list of actions that can be performed by the user.

Often items are context-aware, e.g. based on the selected list item. Actions can be grouped into semantic
section and can have keyboard shortcuts assigned.

The first and second action become the primary and secondary action. They get automatically the default keyboard shortcuts assigned.
In list and details, this is `↵` for the primary and `⌘` `↵` for the secondary action. In forms it's `⌘` `↵` for the primary and
`⌘` `⇧` `↵` for the secondary.

#### Example

```typescript
import { ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction } from "@raycast/api";

export default function Command() {
  return (
    <List navigationTitle="Open Pull Requests">
      <List.Item
        title="Docs: Update API Reference"
        subtitle="#1"
        actions={
          <ActionPanel title="#1 in raycast/extensions">
            <OpenInBrowserAction url="https://github.com/raycast/extensions/pull/1" />
            <CopyToClipboardAction
              title="Copy Pull Request URL"
              content="https://github.com/raycast/extensions/pull/1"
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
```

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| children | <code>[ActionPanelChildren](#actionpanelchildren)</code> | No | - | Sections or items. If [ActionPanel.Item](#actionpanel.item) elements are specified, a default section is automatically created. |
| title | <code>string</code> | No | - | The title displayed at the top of the panel |

### ActionPanel.Item

A context-specific action that can be performed by the user.

Assign keyboard shortcuts to items to make it easier for users to perform frequently used actions.

#### Example

```typescript
import { ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction } from "@raycast/api";

export default function Command() {
  return (
    <List navigationTitle="Open Pull Requests">
      <List.Item
        title="Docs: Update API Reference"
        subtitle="#1"
        actions={
          <ActionPanel title="#1 in raycast/extensions">
            <OpenInBrowserAction url="https://github.com/raycast/extensions/pull/1" />
            <CopyToClipboardAction title="Copy Pull Request Number" content="#1" />
            <ActionPanel.Item title="Close Pull Request" onAction={() => console.log("Close PR #1")} />
          </ActionPanel>
        }
      />
    </List>
  );
}
```

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| icon | <code>[ImageLike](./icons-and-images.md#imagelike)</code> | No | - | The icon displayed for the action. |
| id | <code>string</code> | No | - | ID of the item. |
| shortcut | <code>[KeyboardShortcut](../keyboard.md#keyboardshortcut)</code> | No | - | The keyboard shortcut for the item. |
| title | <code>string</code> | Yes | - | The title displayed for the item. |
| onAction | <code>() => void</code> | No | - |  |

### ActionPanel.Section

A group of visually separated items.

Use sections if the [ActionPanel](#actionpanel) contains a lot of actions to help guide the user to related actions.
For example, create a section for all copy actions.

#### Example

```typescript
import { ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction } from "@raycast/api";

export default function Command() {
  return (
    <List navigationTitle="Open Pull Requests">
      <List.Item
        title="Docs: Update API Reference"
        subtitle="#1"
        actions={
          <ActionPanel title="#1 in raycast/extensions">
            <ActionPanel.Section title="Copy">
              <CopyToClipboardAction title="Copy Pull Request Number" content="#1" />
              <CopyToClipboardAction
                title="Copy Pull Request URL"
                content="https://github.com/raycast/extensions/pull/1"
              />
              <CopyToClipboardAction title="Copy Pull Request Title" content="Docs: Update API Reference" />
            </ActionPanel.Section>
            <ActionPanel.Section title="Danger zone">
              <ActionPanel.Item title="Close Pull Request" onAction={() => console.log("Close PR #1")} />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    </List>
  );
}
```

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| children | <code>[ActionPanelSectionChildren](#actionpanelsectionchildren)</code> | No | - | The item elements of the section. When used for the action panel, the first item in the list is the *primary* action that will be triggered by the default shortcut (ENTER), while the second item is the *secondary* action triggered by CMD + ENTER. |
| title | <code>string</code> | No | - | Title displayed above the section |

### ActionPanel.Submenu

An action that shows more actions in a submenu.

This is handy when an action needs to select from a range of options. For example, to add a label to a GitHub pull request
or an assignee to a todo.

#### Example

```typescript
import { ActionPanel, Color, Icon, List } from "@raycast/api";

export default function Command() {
  return (
    <List navigationTitle="Open Pull Requests">
      <List.Item
        title="Docs: Update API Reference"
        subtitle="#1"
        actions={
          <ActionPanel title="#1 in raycast/extensions">
            <ActionPanel.Submenu title="Add Label">
              <ActionPanel.Item
                icon={{ source: Icon.Circle, tintColor: Color.Red }}
                title="Bug"
                onAction={() => console.log("Add bug label")}
              />
              <ActionPanel.Item
                icon={{ source: Icon.Circle, tintColor: Color.Yellow }}
                title="Enhancement"
                onAction={() => console.log("Add enhancement label")}
              />
              <ActionPanel.Item
                icon={{ source: Icon.Circle, tintColor: Color.Blue }}
                title="Help Wanted"
                onAction={() => console.log("Add help wanted label")}
              />
            </ActionPanel.Submenu>
          </ActionPanel>
        }
      />
    </List>
  );
}
```

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| children | <code>[ActionPanelChildren](#actionpanelchildren)</code> | No | - | Items of the submenu. |
| icon | <code>[ImageLike](./icons-and-images.md#imagelike)</code> | No | - | The icon displayed for the submenu. |
| id | <code>string</code> | No | - | ID of the submenu. Make sure to assign each submenu a unique ID or a UUID will be auto-generated. |
| shortcut | <code>[KeyboardShortcut](../keyboard.md#keyboardshortcut)</code> | No | - | The keyboard shortcut for the submenu. |
| title | <code>string</code> | Yes | - | The title displayed for submenu. |

### useActionPanel

A hook that lets you update the global Action Panel.

#### Signature

```typescript
function useActionPanel(): ActionPanelState
```

#### Return

A [ActionPanelState](#actionpanelstate) object with an update function.
Use the function to update the global Action Panel.

### ActionPanelState

Return type of the [useActionPanel](#useactionpanel) hook to perform global Action Panel updates.

#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| update | <code>(actionPanel: null \| ActionPanel) => void</code> | Yes | Updates the global Action Panel. |

### ActionPanelChildren

```typescript
ActionPanelChildren: ActionPanel.Section | ActionPanel.Section[] | ActionPanelSectionChildren | null
```

Supported children for the [ActionPanel](#actionpanel) and [ActionPanel.Submenu](#actionpanel.submenu) components.

### ActionPanelSectionChildren

```typescript
ActionPanelSectionChildren: ActionPanel.Item | ActionPanel.Item[] | ReactElement<ActionPanelSubmenuProps> | ReactElement<ActionPanelSubmenuProps>[] | null
```

Supported children for the [ActionPanel.Section](#actionpanel.section) component.
