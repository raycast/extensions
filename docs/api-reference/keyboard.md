# Keyboard

## API Reference

### KeyboardShortcut

A keyboard shortcut is defined by one or more modifier keys (command, control, etc.) and a single key equivalent (a character or special key).
See [KeyModifier](../keyboard.md#keymodifier) and [KeyEquivalent](../keyboard.md#keyequivalent) for supported values.

#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| key | `KeyEquivalent` | Yes |  |
| modifiers | `KeyModifier[]` | Yes |  |

### KeyEquivalent

```typescript
KeyEquivalent: "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m" | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z" | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "." | "," | ";" | "=" | "+" | "-" | "[" | "]" | "{" | "}" | "«" | "»" | "(" | ")" | "/" | "\\" | "'" | "`" | "§" | "^" | "@" | "$" | "return" | "delete" | "deleteForward" | "tab" | "arrowUp" | "arrowDown" | "arrowLeft" | "arrowRight" | "pageUp" | "pageDown" | "home" | "end" | "space" | "escape" | "enter" | "backspace"
```

KeyEquivalent of a [KeyboardShortcut](../keyboard.md#keyboardshortcut)

### KeyModifier

```typescript
KeyModifier: "cmd" | "ctrl" | "opt" | "shift"
```

Modifier of a [KeyboardShortcut](../keyboard.md#keyboardshortcut)
