# Keyboard

The Keyboard APIs are useful to make your actions accessible via the keyboard shortcuts. Shortcuts help users to use your command without touching the mouse. 

## API Reference

### KeyboardShortcut

A keyboard shortcut is defined by one or more modifier keys \(command, control, etc.\) and a single key equivalent \(a character or special key\). See [KeyModifier](https://github.com/raycast/extensions/tree/ef0fe3a5aa10de46959a3f9b6134713ef093f068/docs/keyboard.md#keymodifier) and [KeyEquivalent](https://github.com/raycast/extensions/tree/ef0fe3a5aa10de46959a3f9b6134713ef093f068/docs/keyboard.md#keyequivalent) for supported values.

#### Example

```typescript
import { ActionPanel, Detail } from "@raycast/api";

export default function Command() {
  return (
    <Detail markdown="Let's play some games 👾">
      <ActionPanel title="Game controls">
        <ActionPanel.Item
          title="Up"
          shortcut={{ modifiers: ["opt"], key: "arrowUp" }}
          onAction={() => console.log("Go up")}
        />
        <ActionPanel.Item
          title="Down"
          shortcut={{ modifiers: ["opt"], key: "arrowDown" }}
          onAction={() => console.log("Go down")}
        />
        <ActionPanel.Item
          title="Left"
          shortcut={{ modifiers: ["opt"], key: "arrowLeft" }}
          onAction={() => console.log("Go left")}
        />
        <ActionPanel.Item
          title="Right"
          shortcut={{ modifiers: ["opt"], key: "arrowRight" }}
          onAction={() => console.log("Go right")}
        />
      </ActionPanel>
    </Detail>
  );
}
```

#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| key | `KeyEquivalent` | Yes |  |
| modifiers | `KeyModifier[]` | Yes |  |

### KeyEquivalent

```typescript
KeyEquivalent: "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m" | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z" | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "." | "," | ";" | "=" | "+" | "-" | "[" | "]" | "{" | "}" | "«" | "»" | "(" | ")" | "/" | "\\" | "'" | "`" | "§" | "^" | "@" | "$" | "return" | "delete" | "deleteForward" | "tab" | "arrowUp" | "arrowDown" | "arrowLeft" | "arrowRight" | "pageUp" | "pageDown" | "home" | "end" | "space" | "escape" | "enter" | "backspace"
```

KeyEquivalent of a [KeyboardShortcut](https://github.com/raycast/extensions/tree/ef0fe3a5aa10de46959a3f9b6134713ef093f068/docs/keyboard.md#keyboardshortcut)

### KeyModifier

```typescript
KeyModifier: "cmd" | "ctrl" | "opt" | "shift"
```

Modifier of a [KeyboardShortcut](https://github.com/raycast/extensions/tree/ef0fe3a5aa10de46959a3f9b6134713ef093f068/docs/keyboard.md#keyboardshortcut)

