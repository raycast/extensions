# 🇻🇳 Vietnamese Telex Transformer (Raycast Extension)

A lightweight, stateless Vietnamese transformer for Raycast. Unlike traditional IMEs (Telex/VNI) that process text character-by-character, **Vietnamese Telex Transformer** allows you to type raw text and transform it into correctly accented Vietnamese with a single hotkey.

### ✨ Features
- **Post-Typing Transformation:** Type `cais gif vayaj` and transform it instantly.
- **Smart Vowel Positioning:** Uses linguistic logic to place tones on the correct vowel (e.g., `hòa` vs `họa`).
- **Stateless & Fast:** No background listeners or accessibility permissions required.
- **Privacy First:** All processing happens locally on your machine.

### 🚀 Installation
1. Clone this repository.
2. Run `npm install`.
3. Open Raycast and run the `Import Extension` command, selecting this folder.
4. Assign a hotkey (e.g., `Cmd + Option + V`) in Raycast Settings.

### 🛠 How to Use
1. Highlight any raw Telex text: `tooi ddang hocj code`.
2. Press your assigned hotkey.
3. Result: `tôi đang học code`.