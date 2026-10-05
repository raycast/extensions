[Read in Chinese / 中文文档](README-CN.md)
# Lunar Calendar

An elegant, native Raycast extension to check the Chinese Lunar Calendar and public holidays, designed specifically for macOS users. Easily view lunar dates, 24 solar terms, public holiday arrangements, and traditional festivals directly within Raycast.

![Image](images/img1.png)

## 💡 Key Features

- 📅 **Full Calendar View**: Out-of-the-box SVG rendered grid calendar that perfectly matches the Raycast native UI.
- 🏮 **Lunar Dates & Solar Terms**: Automatically calculates lunar dates (1st to 30th), Heavenly Stems and Earthly Branches, and displays 24 solar terms (e.g., Autumn Equinox, White Dew).
- 🚩 **Public Holidays & Workdays**: Synchronizes the latest official public holiday schedules, clearly marking **"休"** (Off-days with red badges) and **"班"** (Adjusted workdays).
- 🎉 **Traditional & Solar Festivals**: Highlights major traditional Chinese festivals (Spring Festival, Mid-Autumn Festival) and solar holidays (New Year's Day, National Day).

## ⌨️ Shortcuts

In the extension detail view, you can use the following shortcuts for navigation:

| Shortcut | Action |
| :--- | :--- |
| `Cmd` + `→` | Switch to **Next Month** |
| `Cmd` + `←` | Switch to **Previous Month** |
| `Cmd` + `T` | Quickly return to **Today** |

## 🛠️ Local Development & Build

If you want to inspect, debug, or contribute to this extension locally, follow the steps below:

### Prerequisites

- **Node.js**: `v18.0.0` or higher recommended
- **npm**: Package manager bundled with Node.js
- **Raycast App**: Installed on your Mac

### Getting Started

**1. Clone the repository**
```bash
git clone [https://github.com/bpktnmbwrp/lunar-calendar.git](https://github.com/bpktnmbwrp/lunar-calendar.git)
cd lunar-calendar
```

**2. Install dependencies**
```bash
npm install
```

**3. Run in development mode**
```bash
npm run dev
```
*Open Raycast, search for `Lunar Calendar` to preview changes with hot-reloading.*

**4. Lint and format code**
Run code validation before committing or publishing:
```bash
npm run fix-lint
```

**5. Build extension**
```bash
npm run build
```

## 📄 License

[MIT](LICENSE) © bpktnmbwrp