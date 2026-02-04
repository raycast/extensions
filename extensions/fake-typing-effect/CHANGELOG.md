# Fake Typing Effect Changelog

## [Initial Version] - 2026-02-04

### Features

- Simulate realistic typing with configurable delays
- Support for delay markers like `[0.5]` for 500ms or `[2]` for 2 seconds
- **Dynamic speed control** with `[speed:X]` to change typing speed on-the-fly and `[speed:default]` to reset
- **Special key support**:
  - `[enter]` - Press Enter/Return key
  - `[tab]` - Press Tab key
  - `[escape]` - Press Escape key
  - `[space]` - Press Space key
  - `[delete]` - Press Delete/Backspace key
- **Modifier key combinations**:
  - Single modifiers: `[ctrl+c]`, `[cmd+v]`, `[alt+tab]`, `[shift+insert]`
  - Multi-modifiers: `[cmd+shift+t]`, `[ctrl+alt+delete]`, `[cmd+option+esc]`
  - Aliases: `command`/`cmd`, `option`/`alt`, `control`/`ctrl`
- Three input methods: form input, file loading, and clipboard
- Customizable base typing speed (default: 50ms between characters)
- Configurable countdown timer before typing starts
- Optional toast notifications (can be disabled for clean recordings)
- Escape sequences for special characters (`\[`, `\n`, `\\`)
- Line continuation support with backslash at end of line
- Comprehensive demo script showcasing vim usage with speed control

### Technical Improvements

- Fixed return key being typed as text by using macOS key codes instead of keystroke
- All special keys now use key codes for reliable execution
- Speed control dynamically adjusts typing speed mid-execution
