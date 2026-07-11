# 🗺️ Where Is My Cursor

Ever lost your cursor in the vast expanse of your multi-monitor setup? 😥 One second it's there, the next it's vanished into the digital abyss. Fear not! This Raycast extension is the trusty sidekick you need to find your elusive pointer in a flash! 🔦

It calls a small Swift app that dims the screen where the cursor is and puts a spotlight on its location.

### Default mode

![where is my cursor presentation mode](/metadata/default_mode.gif)

## ✨ Features

This extension comes with a few commands to help you out:

- **Where Is My Cursor:** The main command. Use it to get a quick pulse of light around your cursor. This is the `default` mode.
- **Simple Mode:** A simple visual aid to find the cursor. It shows a red circle with a yellow border around the cursor for 5 seconds.
- **Presentation Mode:** A persistent yellow-tinted circle around your cursor to make it easier to follow during presentations.
- **Custom Mode:** This command opens a form that lets you create a custom, temporary or persistent locator. You can configure things like:
  - Duration (set to 0 for persistent)
  - Screen Opacity
  - Circle Radius, Opacity, and Color
  - Border Width and Color
- **Turn Off Cursor Highlight:** This command immediately stops any running cursor highlight effect.

## 🛠️ Setup

This extension should work right out of the box!

The first time you run a command, macOS might ask for permission to control the screen. This is expected and required for the extension to be able to dim the screen and highlight your cursor.

## 🕵️ How It Works

For the curious minds, this extension uses a small, pre-compiled Swift application located in the extension's assets. This app is responsible for creating the visual effects on the screen. The source code for this helper app is available in the `assets/LocateCursor.swift` file if you'd like to peek under the hood. The helper app is also available as a standalone project at [github.com/luciodaou/LocateCursor](https://github.com/luciodaou/LocateCursor).

## 🔒 Privacy

This extension works completely offline and does not collect, store, or transmit any user data. Your privacy is safe and sound. 🛡️

## 🖼️ Examples

### Presentation mode

![where is my cursor presentation mode](/media/presentation_mode.gif)

---

Icon from <a href="https://www.flaticon.com/free-icons/helper" title="helper icons">Helper icons created by Fathema Khanom - Flaticon</a>

## ❤️ Support

If you find this extension useful, consider donating to support its development. Thank you!

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/luciodaou)
