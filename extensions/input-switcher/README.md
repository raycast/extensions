## Keyboard Layout Switcher
The extension allows **switching the keyboard layout**.

On **macOS** it uses [keyboardSwitcher](https://github.com/Lutzifer/keyboardSwitcher) by [Wolfgang Lutz](https://github.com/Lutzifer) to _list_ and _switch_ available layouts and depends on the binary.

On **Windows** it uses a native Rust helper to enumerate the installed keyboard layouts and switches the input language of the focused application.

**Tip (Windows):** Assign `Alt` `Shift` to **Toggle Next Layout** to switch layouts and see confirmation in the HUD. If Windows already uses this shortcut, disable its built-in input-language shortcut in **Settings → Time & Language → Typing → Advanced keyboard settings → Input language hot keys → Between input languages → Change Key Sequence…**, then set both options to **Not Assigned**.
