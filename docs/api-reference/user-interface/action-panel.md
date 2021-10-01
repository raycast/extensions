# Action Panel

## API Reference

### ActionPanel

Represents a list of actions in the user interface, accessible through the action panel.

The items can be grouped into sections and they can be assigned keyboard shortcuts.
Use the menu for context-specific actions on list items or detail screens.

The first and second action become the primary and secondary action and get automatically the default keyboard shortcuts assigned.
In list and details, this is `↵` for the primary action and `⌘` `↵` for the secondary.
In forms it's `⌘` `↵` for the primary and `⌘` `⇧` `↵` for the secondary.

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
| children | `ActionPanelChildren` | No | - | Sections or items. If [ActionPanel.Item](../user-interface/action-panel.md#actionpanelitem) elements are specified, a default section is automatically created. |
| title | `string` | No | - | The title displayed at the top of the panel |

### ActionPanel.Item

Represents a context-specific action that can be selected in the user interface or triggered through an assigned keyboard shortcut on the respective view.

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
| icon | `ImageLike` | No | - | The icon displayed for the action. |
| id | `string` | No | - | ID of the item. |
| shortcut | `KeyboardShortcut` | No | - | The keyboard shortcut for the item. |
| title | `string` | Yes | - | The title displayed for the item. |
| onAction | <code>() => void</code> | No | - |  |

### ActionPanel.Section

Visually separated group of items. Use sections to group related menu items together.

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
| children | `ActionPanelSectionChildren` | No | - | The item elements of the section. When used for the action panel, the first item in the list is the *primary* action that will be triggered by the default shortcut (ENTER), while the second item is the *secondary* action triggered by CMD + ENTER. |
| title | `string` | No | - | Title displayed above the section |

### ActionPanel.Submenu

Represents a context-specific action that can be selected in the user interface or triggered through an assigned keyboard shortcut on the respective view.

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
| children | `ActionPanelChildren` | No | - | Items of the submenu. |
| icon | `ImageLike` | No | - | The icon displayed for the submenu. |
| id | `string` | No | - | ID of the submenu. Make sure to assign each section a unique ID or a UUID will be auto-generated. |
| shortcut | `KeyboardShortcut` | No | - | The keyboard shortcut for the submenu. |
| title | `string` | Yes | - | The title displayed for submenu. |

### useActionPanel

A hook that lets you update the global Action Panel.

#### Signature

```typescript
function useActionPanel(): ActionPanelState
```

#### Return

A ActionPanelActions object with an ActionPanelHook.update function.
Use the function to update the global Action Panel.

### ActionPanelState

Return type of the [useActionPanel](../user-interface/action-panel.md#useactionpanel) hook to perform global Action Panel updates.

#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| update | <code>(actionPanel: null \| ActionPanel) => void</code> | Yes | Updates the global Action Panel. |

### ActionPanelChildren

```typescript
ActionPanelChildren: ActionPanel.Section | ActionPanel.Section[] | ActionPanelSectionChildren | null
```

Supported children for the [ActionPanel](../user-interface/action-panel.md#actionpanel) and [ActionPanelSubmenu](../user-interface/action-panel.md#actionpanelsubmenu) components.

### ActionPanelSectionChildren

```typescript
ActionPanelSectionChildren: ActionPanel.Item | ActionPanel.Item[] | ReactElement<ActionPanelSubmenuProps> | ReactElement<ActionPanelSubmenuProps>[] | null
```

Supported children for the [ActionPanelSection](../user-interface/action-panel.md#actionpanelsection) component.
