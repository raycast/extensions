# Animated Window Manager for Raycast 🪟✨

Smooth, animated window snapping on macOS using Raycast + Hammerspoon.

Bring macOS-native-feeling window movements to your desktop with clean animations for:

- ⬅️ Left Half
- ➡️ Right Half
- 🔳 Maximize
- 💬 Reasonable Size (~30% centered)

No jarring jumps. Just smooth, polished transitions.

---

## 🛠️ Requirements

This extension uses [Hammerspoon](https://www.hammerspoon.org) to apply window animations.

### ✅ One-liner setup (Hammerspoon + animation config)

For bash and zsh:

```bash
brew install --cask hammerspoon && mkdir -p ~/.hammerspoon && curl -o ~/.hammerspoon/init.lua https://raw.githubusercontent.com/raycast/extensions/refs/heads/main/extensions/animated-window-manager/hammerspoon/init.lua && (if [[ $(uname -m) == 'arm64' ]]; then sudo ln -s ~/.hammerspoon/hs /opt/homebrew/bin/hs; else sudo ln -s ~/.hammerspoon/hs /usr/local/bin/hs; fi) && open -a Hammerspoon
```

For Fish shell:

```bash
bash -c 'brew install --cask hammerspoon && mkdir -p ~/.hammerspoon && curl -o ~/.hammerspoon/init.lua https://raw.githubusercontent.com/raycast/extensions/refs/heads/main/extensions/animated-window-manager/hammerspoon/init.lua && if [[ $(uname -m) == "arm64" ]]; then sudo ln -sf ~/.hammerspoon/hs /opt/homebrew/bin/hs; else sudo ln -sf ~/.hammerspoon/hs /usr/local/bin/hs; fi && open -a Hammerspoon'
```

> ☝️ This installs Hammerspoon, applies the animated layout config, symlinks hs CLI to the correct location based on architecture (Apple or Intel chip) and opens Hammerspoon.

---

## ✨ Features

| Command                      | Description                                 |
| ---------------------------- | ------------------------------------------- |
| Move Window Left (Animated)  | Slides focused window to the left half      |
| Move Window Right (Animated) | Slides focused window to the right half     |
| Maximize Window (Animated)   | Smoothly fills the whole screen             |
| Reasonable Size (Animated)   | Centers window with ~60% width & 70% height |

All animations use native-feeling macOS transitions.

---

## 💾 Manual Setup (if preferred)

1. **Install Hammerspoon**

   ```
   brew install --cask hammerspoon
   ```

2. **Enable CLI access**  
   Create a symlink to expose the Hammerspoon CLI (`hs`) to your system.

   For Apple Silicon (M1, M2, M3 Macs):

   ```bash
   sudo ln -s ~/.hammerspoon/hs /opt/homebrew/bin/hs
   ```

   For Intel Macs:

   ```bash
   sudo ln -s ~/.hammerspoon/hs /usr/local/bin/hs
   ```

3. **Add the layout functions**  
   Paste this into `~/.hammerspoon/init.lua`:

   ```lua
   require("hs.ipc")

   function moveWindowLeftAnimated()
     local win = hs.window.focusedWindow()
     if not win then return end

     local screen = win:screen()
     local frame = screen:frame()

     local targetFrame = {
       x = frame.x,
       y = frame.y,
       w = frame.w / 2,
       h = frame.h
     }

     win:move(targetFrame, nil, true, 0.3)
   end

   function moveWindowRightAnimated()
     local win = hs.window.focusedWindow()
     if not win then return end

     local screen = win:screen()
     local frame = screen:frame()

     local targetFrame = {
       x = frame.x + (frame.w / 2),
       y = frame.y,
       w = frame.w / 2,
       h = frame.h
     }

     win:move(targetFrame, nil, true, 0.3)
   end

   function maximizeWindowAnimated()
     local win = hs.window.focusedWindow()
     if not win then return end

     local screen = win:screen()
     local frame = screen:frame()

     win:move(frame, nil, true, 0.3)
   end

   function moveWindowReasonableSize()
     local win = hs.window.focusedWindow()
     if not win then return end

     local screen = win:screen()
     local frame = screen:frame()

     local targetWidth = frame.w * 0.6
     local targetHeight = frame.h * 0.7
     local targetFrame = {
       x = frame.x + ((frame.w - targetWidth) / 2),
       y = frame.y + ((frame.h - targetHeight) / 2),
       w = targetWidth,
       h = targetHeight
     }

     win:move(targetFrame, nil, true, 0.3)
   end
   ```

4. **Open Hammerspoon and load the config**

   ```
   open -a Hammerspoon
   ```

---

## 🚀 How It Works

This extension calls your custom Hammerspoon functions like:

```bash
hs -c "moveWindowLeftAnimated()"
```

Hammerspoon then smoothly animates your window into place using native macOS window APIs.

---

## 🧪 Troubleshooting

### 🔸 Hammerspoon error: `can't access message port`

You forgot to enable IPC. Add this to the top of your `init.lua`:

```lua
require("hs.ipc")
```

### 🔸 Raycast moves _itself_ instead of another window?

Raycast was focused. We fixed that by automatically closing Raycast before calling `hs` using `closeMainWindow()`.

---

## 🧠 Inspiration

This project was built to make macOS window management feel less robotic and more native. Animations make a big difference — and Raycast + Hammerspoon is the perfect lightweight combo.

---

## 📬 Suggestions?

Open an issue or submit a pull request on [GitHub](https://github.com/raycast/extensions/tree/main/extensions/animated-window-manager). Happy snapping! ⚡️
