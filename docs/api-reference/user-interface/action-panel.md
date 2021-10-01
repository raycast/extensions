# Action Panel

## API Reference

### ActionPanel

Represents a list of actions in the user interface, accessible through the action panel.

The items can be grouped into sections and they can be assigned keyboard shortcuts. Use the menu for context-specific actions on list items or detail screens.

Note that when used for the action panel, the first \(ENTER\) and second \(CMD + ENTER\) menu items have automatically assigned keyboard shortcuts. Custom shortcuts will work in addition to the default shortcuts.

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| children | `ActionPanelChildren` | No | - | Sections or items. If [ActionPanel.Item](action-panel.md#actionpanelitem) elements are specified, a default section is automatically created. |
| title | `string` | No | - | The title displayed at the top of the panel |

### ActionPanel.Item

Represents a context-specific action that can be selected in the user interface or triggered through an assigned keyboard shortcut on the respective view.

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| icon | `ImageLike` | No | - | The icon displayed for the action. |
| id | `string` | No | - | ID of the item. |
| shortcut | `KeyboardShortcut` | No | - | The keyboard shortcut for the item. |
| title | `string` | Yes | - | The title displayed for the item. |
| onAction | `() => void` | No | - |  |

### ActionPanel.Section

Visually separated group of items. Use sections to group related menu items together.

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| children | `ActionPanelSectionChildren` | No | - | The item elements of the section. When used for the action panel, the first item in the list is the _primary_ action that will be triggered by the default shortcut \(ENTER\), while the second item is the _secondary_ action triggered by CMD + ENTER. |
| title | `string` | No | - | Title displayed above the section |

### ActionPanel.Submenu

Represents a context-specific action that can be selected in the user interface or triggered through an assigned keyboard shortcut on the respective view.

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

A ActionPanelActions object with an ActionPanelHook.update function. Use the function to update the global Action Panel.

### ActionPanelState

Return type of the [useActionPanel](action-panel.md#useactionpanel) hook to perform global Action Panel updates.

#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| update | `(actionPanel: null | ActionPanel) => void` | Yes | Updates the global Action Panel. |

### ActionPanelChildren

```typescript
ActionPanelChildren: ActionPanel.Section | ActionPanel.Section[] | ActionPanelSectionChildren | null
```

Supported children for the [ActionPanel](action-panel.md#actionpanel) and [ActionPanelSubmenu](action-panel.md#actionpanelsubmenu) components.

### ActionPanelSectionChildren

```typescript
ActionPanelSectionChildren: ActionPanel.Item | ActionPanel.Item[] | ReactElement<ActionPanelSubmenuProps> | ReactElement<ActionPanelSubmenuProps>[] | null
```

Supported children for the [ActionPanelSection](action-panel.md#actionpanelsection) component.

