<p align="center">
  <img src="media/extension-banner.png" alt="Lunaris for Raycast" width="100%">
</p>

# Lunaris

Raycast extension for **Genshin Impact** players. Quickly look up character information, weapon stats, artifact set bonuses and banner information using data from [Lunaris](https://lunaris.moe/).

---

## ✨ Features

- **Characters**: View base stats, skills, constellations, and upgrade materials.
- **Weapons**: Check stats, passive effects, ascension materials, and refinements at a glance.
- **Artifacts**: View 2-piece and 4-piece bonuses for all sets.
- **Banners**: View past and current banner information.

---

## 🚀 Getting Started

### Installation

1.  Ensure you have [Node.js](https://nodejs.org/) (v18+) and [Rust](https://www.rust-lang.org/) installed.
2.  Clone this repository.
3.  Install dependencies:
    ```bash
    npm install
    ```
4.  Start the development server:
    ```bash
    npm run dev
    ```

### ⚡ Performance Note

When opening the **character list** for the first time, you may notice a slight delay in image loading. This is because the extension is dynamically processing and compositing character cards using the Rust backend to ensure high fidelity. Once generated, these images are cached locally in your Raycast support directory for instant access in the future.

---

## 📂 Project Structure

This extension uses the Raycast architecture to bridge TypeScript and Rust:

- `src/`: Main TypeScript source code.
- `rust/`: Rust source for image processing.
- `assets/`: Static local assets, such as rarity backgrounds and extension metadata.

---

## 📜 Credits

- Data and assets provided by [Lunaris.moe](https://lunaris.moe/).
- Built with the [Raycast API](https://developers.raycast.com/).
