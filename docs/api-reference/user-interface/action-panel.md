# Action Panel

## API Reference

### ActionPanel

Represents a list of actions in the user interface, accessible through the action panel.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| children | `ActionPanelChildren` | No | - | Sections or items. If [ActionPanel.Item](../user-interface/action-panel.md#actionpanelitem) elements are specified, a default section is automatically created. |
| title | `string` | No | - | The title displayed at the top of the panel |

### ActionPanel.Item

Represents a context-specific action that can be selected in the user interface or triggered through an assigned keyboard shortcut on the respective view.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| icon | `ImageLike` | No | - | The icon displayed for the action. |
| id | `string` | No | - | ID of the item. |
| shortcut | `KeyboardShortcut` | No | - | The keyboard shortcut for the item. |
| title | `string` | Yes | - | The title displayed for the item. |
| onAction | <code>() => void</code> | No | - |  |

### ActionPanel.Section

Visually separated group of items.
Use sections to group related menu items together.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| children | `ActionPanelSectionChildren` | No | - | The item elements of the section. When used for the action panel, the first item in the list is the *primary* action that will be triggered by the default shortcut (ENTER), while the second item is the *secondary* action triggered by CMD + ENTER. |
| title | `string` | No | - | Title displayed above the section |

### ActionPanel.Submenu

Represents a context-specific action that can be selected in the user interface or triggered through an assigned keyboard shortcut on the respective view.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| children | `ActionPanelChildren` | No | - | Items of the submenu. |
| icon | `ImageLike` | No | - | The icon displayed for the submenu. |
| id | `string` | No | - | ID of the submenu. Make sure to assign each section a unique ID or a UUID will be auto-generated. |
| shortcut | `KeyboardShortcut` | No | - | The keyboard shortcut for the submenu. |
| title | `string` | Yes | - | The title displayed for submenu. |

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
