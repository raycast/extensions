# Keyboard

The Keyboard APIs are useful to make your actions accessible via the keyboard shortcuts. Shortcuts help users to use your command without touching the mouse.

## Types

### Keyboard.Shortcut

A keyboard shortcut is defined by one or more modifier keys (command, control, etc.) and a single key equivalent (a character or special key).

See [KeyModifier](#keyboard.keymodifier) and [KeyEquivalent](#keyboard.keyequivalent) for supported values.

### Keyboard.Shortcut.Common

A collection of shortcuts that are commonly used throughout Raycast. Using them should help provide a more consistent experience and preserve muscle memory.

| Name            | Shortcut  |
| --------------- | --------- |
| Copy            | ⌘ + ⇧ + C |
| CopyDeeplink    | ⌘ + ⇧ + C |
| CopyName        | ⌘ + ⇧ + . |
| CopyPath        | ⌘ + ⇧ + , |
| Duplicate       | ⌘ + D     |
| Edit            | ⌘ + E     |
| MoveDown        | ⌘ + ⇧ + ↓ |
| MoveUp          | ⌘ + ⇧ + ↑ |
| New             | ⌘ + N     |
| Open            | ⌘ + O     |
| OpenWith        | ⌘ + ⇧ + O |
| Pin             | ⌘ + ⇧ + P |
| Refresh         | ⌘ + R     |
| Remove          | ⌃ + X     |
| RemoveAll       | ⌃ + ⇧ + X |
| ToggleQuickLook | ⌘ + Y     |

#### Example

```typescript
import { Action, ActionPanel, Detail } from "@raycast/api";

export default function Command() {
  return (
    <Detail
      markdown="Let's play some games 👾"
      actions={
        <ActionPanel title="Game controls">
          <Action title="Up" shortcut={{ modifiers: ["opt"], key: "arrowUp" }} onAction={() => console.log("Go up")} />
          <Action
            title="Down"
            shortcut={{ modifiers: ["opt"], key: "arrowDown" }}
            onAction={() => console.log("Go down")}
          />
          <Action
            title="Left"
            shortcut={{ modifiers: ["opt"], key: "arrowLeft" }}
            onAction={() => console.log("Go left")}
          />
          <Action
            title="Right"
            shortcut={{ modifiers: ["opt"], key: "arrowRight" }}
            onAction={() => console.log("Go right")}
          />
        </ActionPanel>
      }
    />
  );
}
```

#### Properties

<InterfaceTableFromJSDoc name="Keyboard.Shortcut" />

### Keyboard.KeyEquivalent

```typescript
KeyEquivalent: "a" |
  "b" |
  "c" |
  "d" |
  "e" |
  "f" |
  "g" |
  "h" |
  "i" |
  "j" |
  "k" |
  "l" |
  "m" |
  "n" |
  "o" |
  "p" |
  "q" |
  "r" |
  "s" |
  "t" |
  "u" |
  "v" |
  "w" |
  "x" |
  "y" |
  "z" |
  "0" |
  "1" |
  "2" |
  "3" |
  "4" |
  "5" |
  "6" |
  "7" |
  "8" |
  "9" |
  "." |
  "," |
  ";" |
  "=" |
  "+" |
  "-" |
  "[" |
  "]" |
  "{" |
  "}" |
  "«" |
  "»" |
  "(" |
  ")" |
  "/" |
  "\\" |
  "'" |
  "`" |
  "§" |
  "^" |
  "@" |
  "$" |
  "return" |
  "delete" |
  "deleteForward" |
  "tab" |
  "arrowUp" |
  "arrowDown" |
  "arrowLeft" |
  "arrowRight" |
  "pageUp" |
  "pageDown" |
  "home" |
  "end" |
  "space" |
  "escape" |
  "enter" |
  "backspace";
```

KeyEquivalent of a [Shortcut](#keyboard.shortcut)

### Keyboard.KeyModifier

```typescript
KeyModifier: "cmd" | "ctrl" | "opt" | "shift";
```

Modifier of a [Shortcut](#keyboard.shortcut)
