# Circle to Search - Raycast Extension

<p align="center">
  <img src="assets/icon.png" width="128" height="128" alt="Circle to Search Icon" />
</p>

<p align="center">
  <strong>Bring the seamless "Circle to Search" visual search experience to your desktop with Raycast.</strong>
</p>

<p align="center">
  <a href="https://www.raycast.com"><img src="https://img.shields.io/badge/Raycast-Extension-red.svg" alt="Raycast" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License" /></a>
</p>

---

## 🌟 Overview

**Circle to Search** lets you freely circle, highlight, or select any object, window, or UI element on your screen to search it instantly using your favorite visual search engine (Google Lens, Bing Visual Search, Yandex Images, TinEye, or Baidu).

### 🎯 4 Intelligent Capture Modes (Switch with `Alt` / `Tab` or `1-4`):
1. ⭕ **Freeform (Lasso)**: Freehand circling with live spotlight cutout. Non-selected background is cut out with 100% transparent alpha.
2. ⬛ **Rectangle**: Classic click-and-drag box selection with illuminated interior preview.
3. 🪟 **Window Auto-Detect**: Hover over any open window to automatically detect and highlight its exact borders—click to capture and search.
4. 🔲 **Element Auto-Detect**: Automatically snaps to buttons, images, cards, or paragraphs using native UI Automation.

---

## ✨ Features

- **⭕ Interactive Spotlight Cutout**: Dims the entire screen with a precision reticle cursor. Selected areas are illuminated in full brightness.
- **🌐 Multi-Engine Support**: Switch seamlessly between Google Lens (default), Bing Visual Search, Yandex Images, TinEye, Baidu, or open all engines simultaneously in tabs.
- **⚡ Fast, Free & Ephemeral**: Zero API keys or paid accounts required. Uses resilient multi-host ephemeral image sharing with automatic failover.
- **📋 Clipboard & Full Screen Search**: Search images directly from your clipboard or capture the entire screen with dedicated commands.
- **💻 Cross-Platform**: Native interactive overlay on Windows and native interactive selection on macOS.

---

## 🚀 Commands

| Command | Description |
| :--- | :--- |
| **Circle Screen to Search** | Dims screen, displays 4 switchable capture modes (Freeform, Rect, Window, Element), and searches the selected area. |
| **Search Clipboard Image** | Instantly performs a visual search on whichever image or screenshot is currently in your clipboard. |
| **Search Full Screen** | Captures the entire display and launches visual search results in your default browser. |

---

## ⌨️ Shortcuts During Selection Overlay

| Key | Action |
| :--- | :--- |
| `Alt` / `Tab` / `Space` | Cycle through capture modes |
| `1`, `2`, `3`, `4` | Select **Freeform**, **Rectangle**, **Window**, or **Element** mode directly |
| `Left Click / Drag` | Draw freehand circle, drag rectangle, or snap-select window/element |
| `Esc` | Cancel and exit |

---

## ⚙️ Configuration

In Raycast, go to **Settings** $\rightarrow$ **Extensions** $\rightarrow$ **Circle to Search** to configure your default visual search engine:

- **Google Lens** *(Default)*
- **Bing Visual Search**
- **Yandex Images**
- **TinEye Reverse Search**
- **Baidu Visual Search**
- **All Engines** *(Opens results in separate browser tabs simultaneously)*

---

## 🛠️ Development & Installation

### Local Development

```bash
# Clone the repository
git clone https://github.com/yetemgetaB/Circle-To-Search.git
cd Circle-To-Search

# Install dependencies
npm install

# Start development mode
npm run dev

# Build for production
npm run build
```

---

## 📄 License

This extension is licensed under the [MIT License](LICENSE).
