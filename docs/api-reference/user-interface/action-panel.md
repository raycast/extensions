# Action Panel

![](../../.gitbook/assets/action-panel.png)

## API Reference

### ActionPanel

Exposes a list of [actions](./actions.md) that can be performed by the user.

Often items are context-aware, e.g., based on the selected list item. Actions can be grouped into semantic
sections and can have keyboard shortcuts assigned.

The first and second action become the primary and secondary action. They automatically get the default keyboard shortcuts assigned.
In [List](./list.md) and [Detail](./detail.md), this is `↵` for the primary and `⌘` `↵` for the secondary action. In [Form](./form.md) it's `⌘` `↵` for the primary and `⌘` `⇧` `↵` for the secondary.

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

| Prop     | Type                                                       | Required | Default | Description                                                                                                        |
| :------- | :--------------------------------------------------------- | :------- | :------ | :----------------------------------------------------------------------------------------------------------------- |
| children | <code>[ActionPanel.Children](#actionpanel.children)</code> | No       | -       | Sections or Actions. If [Action](./actions.md) elements are specified, a default section is automatically created. |
| title    | <code>string</code>                                        | No       | -       | The title displayed at the top of the panel                                                                        |

### ActionPanel.Section

A group of visually separated items.

Use sections when the [ActionPanel](#actionpanel) contains a lot of actions to help guide the user to related actions.
For example, create a section for all copy actions.

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
            <ActionPanel.Section title="Copy">
              <Action.CopyToClipboard
                title="Copy Pull Request Number"
                content="#1"
              />
              <Action.CopyToClipboard
                title="Copy Pull Request URL"
                content="https://github.com/raycast/extensions/pull/1"
              />
              <Action.CopyToClipboard
                title="Copy Pull Request Title"
                content="Docs: Update API Reference"
              />
            </ActionPanel.Section>
            <ActionPanel.Section title="Danger zone">
              <Action
                title="Close Pull Request"
                onAction={() => console.log("Close PR #1")}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    </List>
  );
}
```

#### Props

| Prop     | Type                                                                       | Required | Default | Description                       |
| :------- | :------------------------------------------------------------------------- | :------- | :------ | :-------------------------------- |
| children | <code>[ActionPanel.Section.Children](#actionpanel.section.children)</code> | No       | -       | The item elements of the Section. |
| title    | <code>string</code>                                                        | No       | -       | Title displayed above the section |

### ActionPanel.Submenu

A very specific action that replaces the current [ActionPanel](#actionpanel) with its children when selected.

This is handy when an action needs to select from a range of options. For example, to add a label to a GitHub pull request or an assignee to a todo.

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
              <Action
                icon={{ source: Icon.Circle, tintColor: Color.Red }}
                title="Bug"
                onAction={() => console.log("Add bug label")}
              />
              <Action
                icon={{ source: Icon.Circle, tintColor: Color.Yellow }}
                title="Enhancement"
                onAction={() => console.log("Add enhancement label")}
              />
              <Action
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

| Prop     | Type                                                                       | Required | Default | Description                                                                                       |
| :------- | :------------------------------------------------------------------------- | :------- | :------ | :------------------------------------------------------------------------------------------------ |
| children | <code>[ActionPanel.Submenu.Children](#actionpanel.submenu.children)</code> | No       | -       | Items of the submenu.                                                                             |
| icon     | <code>[ImageLike](./icons-and-images.md#imagelike)</code>                  | No       | -       | The icon displayed for the submenu.                                                               |
| id       | <code>string</code>                                                        | No       | -       | ID of the submenu. Make sure to assign each submenu a unique ID or a UUID will be auto-generated. |
| shortcut | <code>[Keyboard.Shortcut](../keyboard.md#shortcut)</code>                  | No       | -       | The keyboard shortcut for the submenu.                                                            |
| title    | <code>string</code>                                                        | Yes      | -       | The title displayed for submenu.                                                                  |

## Types

### ActionPanel.Children

```typescript
ActionPanel.Children: ActionPanel.Section | ActionPanel.Section[] | ActionPanel.Section.Children | null
```

Supported children for the [ActionPanel](#actionpanel) component.

### ActionPanel.Section.Children

```typescript
ActionPanel.Section.Children: Action | Action[] | ReactElement<ActionPanel.Submenu.Props> | ReactElement<ActionPanel.Submenu.Props>[] | null
```

Supported children for the [ActionPanel.Section](#actionpanel.section) component.

### ActionPanel.Submenu.Children

```typescript
ActionPanel.Children: ActionPanel.Section | ActionPanel.Section[] | ActionPanel.Section.Children | null
```

Supported children for the [ActionPanel.Submenu](#actionpanel.submenu) component.
