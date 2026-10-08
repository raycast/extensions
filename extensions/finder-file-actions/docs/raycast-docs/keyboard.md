# Keyboard

The Keyboard APIs are useful to make your actions accessible via the keyboard shortcuts. Shortcuts help users to use your command without touching the mouse.

{% hint style="info" %}
Use the [Common shortcuts](#keyboard.shortcut.common) whenever possible to keep a consistent user experience throughout Raycast.
{% endhint %}

## Types

### Keyboard.Shortcut

A keyboard shortcut is defined by one or more modifier keys (command, control, etc.) and a single key equivalent (a character or special key).

See [KeyModifier](#keyboard.keymodifier) and [KeyEquivalent](#keyboard.keyequivalent) for supported values.

#### Example

```typescript
import { Action, ActionPanel, Detail, Keyboard } from "@raycast/api";

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
          <Action title="Open" shortcut={Keyboard.Shortcut.Common.Open} onAction={() => console.log("Open")} />
        </ActionPanel>
      }
    />
  );
}
```

#### Properties

| Property                                    | Description                                 | Type                                                |
| ------------------------------------------- | ------------------------------------------- | --------------------------------------------------- |
| key<mark style="color:red;">\*</mark>       | The key of the keyboard shortcut.           | [`Keyboard.KeyEquivalent`](#keyboard.keyequivalent) |
| modifiers<mark style="color:red;">\*</mark> | The modifier keys of the keyboard shortcut. | [`Keyboard.KeyModifier`](#keyboard.keymodifier)`[]` |

If the shortcut contains some "ambiguous" modifiers (eg. `ctrl`, or `cmd`, or `windows`), you will need to specify the shortcut for both platforms:

```js
{
  macOS: { modifiers: ["cmd", "shift"], key: "c" },
  Windows: { modifiers: ["ctrl", "shift"], key: "c" },
}
```

### Keyboard.Shortcut.Common

A collection of shortcuts that are commonly used throughout Raycast. Using them should help provide a more consistent experience and preserve muscle memory.

| Name            | macOS     | Windows              |
| --------------- | --------- | -------------------- |
| Copy            | ⌘ + ⇧ + C | `ctrl` + `shift` + C |
| CopyDeeplink    | ⌘ + ⇧ + C | `ctrl` + `shift` + C |
| CopyName        | ⌘ + ⇧ + . | `ctrl` + `alt` + C   |
| CopyPath        | ⌘ + ⇧ + , | `alt` + `shift` + C  |
| Save            | ⌘ + S     | `ctrl` + S           |
| Duplicate       | ⌘ + D     | `ctrl` + `shift` + S |
| Edit            | ⌘ + E     | `ctrl` + E           |
| MoveDown        | ⌘ + ⇧ + ↓ | `ctrl` + `shift` + ↓ |
| MoveUp          | ⌘ + ⇧ + ↑ | `ctrl` + `shift` + ↑ |
| New             | ⌘ + N     | `ctrl` + N           |
| Open            | ⌘ + O     | `ctrl` + O           |
| OpenWith        | ⌘ + ⇧ + O | `ctrl` + `shift` + O |
| Pin             | ⌘ + ⇧ + P | `ctrl` + .           |
| Refresh         | ⌘ + R     | `ctrl` + R           |
| Remove          | ⌃ + X     | `ctrl` + D           |
| RemoveAll       | ⌃ + ⇧ + X | `ctrl` + `shift` + D |
| ToggleQuickLook | ⌘ + Y     | `ctrl` + Y           |

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
KeyModifier: "cmd" | "ctrl" | "opt" | "shift" | "alt" | "windows";
```

Modifier of a [Shortcut](#keyboard.shortcut).

Note that `"alt"` and `"opt"` are the same key, they are just named differently on macOS and Windows.
