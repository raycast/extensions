# 🖨️ Your Bambu Lab Printer, at Your Fingertips

**Bambu Lab Controller** brings your 3D printer directly into Raycast. Manage your prints, control temperatures, and handle files instantly without breaking your workflow.

## ✨ Why this extension?

- **Zero Friction:** Check your print status in milliseconds. No need to wait for Bambu Studio to load.
- **Workflow Booster:** Send files from your computer and start printing without touching the SD card.
- **Privacy First:** Works exclusively via **LAN Mode**. Your data stays on your local network.
- **Universal Control:** Manage your printer without leaving your keyboard.

## ⚡️ What can it do?

### 🕹️ Total Control Center
Manage your machine remotely:
- **Live Status:** Real-time nozzle/bed temps, progress percentage, and time remaining.
- **Smart Actions:**
  - ⏯️ **State:** Pause, Resume, or Stop a print instantly.
  - 💡 **Light:** Toggle the chamber light (perfect for checking the webcam).
  - 🔥 **Preheat:** Quick presets for PLA & PETG to get ready faster.

### 📂 File Management (Wireless)
Stop running back and forth with the SD card:
- **SD Card Explorer:** View all your printable files, sorted by newest projects first.
- **Smart Filter:** Automatically prioritizes `.3mf` projects and hides system junk files.
- **Direct Upload:** Upload `.3mf` or `.gcode` files from your computer directly to the printer via FTP.
- **Start Print:** Launch a job with a simple keystroke.

### 🎨 AMS & Materials
- **Filament Tracker:** See exactly what colors and materials are loaded in your AMS.
- **Custom Overrides:** Decide to **Enable** or **Disable** AMS usage for each specific print (via `Cmd+K` actions).

## ⚙️ Configuration

This extension connects directly to your printer. You'll need to grab your credentials from the printer screen (Settings -> LAN Mode Only).

**Preferences required:**
1.  **IP Address:** Local IP (e.g., `192.168.1.50`).
2.  **Access Code:** The code shown on your printer screen.
3.  **Serial Number:** Your printer ID (e.g., `00M...`).

> **Tip:** Make sure "LAN Mode Only" is enabled on your printer for the best experience.

## 🔥 Daily Use Cases

- **The "Quick Check":** You're working, just hit your shortcut to see if the print is done.
- **The "Lazy Upload":** Slice your model, export to `.3mf`, upload via Raycast, and hit print. Zero steps left.
- **The "Oops" Moment:** You hear a fail? Emergency stop the printer instantly from your keyboard.
- **The "Night Mode":** Turn off the printer light remotely without getting up.

## ⚠️ Compatibility

Verified and tested on:
- **Bambu Lab A1**
- **Bambu Lab A1 Mini**

*Should also work with P1 and X1 series (uses standard Bambu MQTT protocol).*

## 👥 Contributors

Made with 🧡 by **[johancvl](https://github.com/cavalluccijohann)**.