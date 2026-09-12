# Fake Typing Effect

[![Demo Video](https://img.youtube.com/vi/Jl6lhg38E38/maxresdefault.jpg)](https://youtu.be/Jl6lhg38E38)

A Raycast extension that simulates realistic typing with configurable delays. Perfect for creating demos, tutorials, and presentations where you want to show code or text being typed naturally.

**Fun fact**: This extension was repurposed from a script I originally wrote to paste into VMware remote consoles that didn't support clipboard pasting. It basically mimicked human typing to get around that limitation! I still use it with clipboard mode for this purpose.

## Features

- **Delay Markers**: Use `[0.5]` for 500ms delay, `[2]` for 2 seconds, etc.
- **Speed Control**: Dynamically change typing speed with `[speed:20]` for fast, `[speed:100]` for slow, or `[speed:default]` to reset
- **Special Keys**: Support for `[enter]`, `[tab]`, `[escape]`, `[space]`, `[delete]`
- **Modifier Keys**:
  - Single modifiers: `[ctrl+c]`, `[cmd+v]`, `[alt+tab]`, `[shift+insert]`
  - Multi-modifiers: `[cmd+shift+t]`, `[ctrl+alt+delete]`, `[cmd+option+esc]`
  - Aliases: Use `command` or `cmd`, `option` or `alt`, `control` or `ctrl`
- **Three Input Methods**:
  - Type from a form with real-time editing
  - Load from a text file
  - Run directly from clipboard content
- **Customizable Typing Speed**: Set the base delay between characters (default: 50ms)
- **Countdown Timer**: Gives you time to focus the target window before typing starts
- **Toast Notifications**: Optional toast messages for feedback (can be disabled for clean recordings)

## Usage

### Delay Markers

- `[0.5]` - Pause for 500ms
- `[2]` - Pause for 2 seconds

### Special Keys

- `[enter]` - Press Enter/Return key
- `[tab]` - Press Tab key
- `[escape]` - Press Escape key
- `[space]` - Press Space key
- `[delete]` - Press Delete/Backspace key

### Speed Control

- `[speed:20]` - Change typing speed to 20ms between characters (fast)
- `[speed:100]` - Change typing speed to 100ms between characters (slow)
- `[speed:default]` - Reset to the base typing speed you set initially

Perfect for speeding through boilerplate code then slowing down for important parts!

### Modifier Keys

Single modifiers:

- `[ctrl+c]` - Control+C
- `[cmd+c]` - Command+C
- `[alt+tab]` - Alt+Tab (or Option+Tab)
- `[shift+insert]` - Shift+Insert

Multi-modifiers:

- `[cmd+shift+t]` - Command+Shift+T
- `[ctrl+alt+delete]` - Control+Alt+Delete
- `[cmd+option+esc]` - Command+Option+Escape

Aliases:

- `command` = `cmd`
- `option` = `alt`
- `control` = `ctrl`

### Escape Sequences

- `\[` - Type a literal bracket
- `\n` - Type a newline
- `\\` - Type a literal backslash
- `\` at end of line - Line continuation (skip the newline)

## Examples

```
[1]Hello everyone,[0.7] this is a demo[2]... pretty cool right?
```

```
def hello():[enter]
[0.3]    print("Hello, World!")[enter]
[0.5][enter]
hello()
```

```
[cmd+shift+t]Opening new terminal tab...[1][enter]
[0.5]npm install[enter]
```

```
vim script.py[enter]
[0.5]i[speed:10]import os[enter]
import sys[enter]
[enter]
print("Fast typing!")[speed:default][0.5][escape]
:wq[enter]
```

## Commands

1. **Fake Typing Effect** - Interactive form to enter and customize your script
2. **Fake Typing from File** - Select a text file containing your script
3. **Fake Typing from Clipboard** - Instantly run typing from your clipboard content

## Tips

- Disable toast notifications in preferences for clean screen recordings
- Adjust the countdown duration to give yourself time to switch windows
- Use escape sequences to type code that includes special characters
- Test your script with a short countdown first to verify timing
- Combine multiple modifiers for complex shortcuts like `[cmd+shift+option+v]`
- Use `[speed:10]` or `[speed:20]` to speed through boilerplate code, then `[speed:default]` for the important parts
- The `media/demo-script.txt` file shows a complete example with vim, speed changes, and special keys!

## Important Missing Features

This extension does NOT support stopping the typing once it has started. Please be cautious when using it, as it will continue typing until the end of the script is reached. I have tested multiple ways to implement a stop feature, but they were all inconsistent! PRs are welcome if you can find a reliable method.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any bugs, feature requests, or improvements.

## License

MIT
