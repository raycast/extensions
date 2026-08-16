# WayCompress - Precision Target-Size Media & Document Compressor for Raycast

**WayCompress** is a fast, offline-capable Raycast extension that compresses any **Video**, **Image**, **Audio**, or **PDF** file directly to an exact target size in Megabytes (e.g. Discord 20MB / 8MB limit, WhatsApp 16MB, Email 10MB) while preserving maximum visual quality, framerate, and resolution.

Works seamlessly across **Windows** and **macOS**.

---

## ✨ Features

- 🎯 **Target MB Compression**: Simply set your desired file size in MB (e.g., `20`, `16`, `8.5`, `0.5`) and WayCompress automatically calculates optimal bitrates and quality levels.
- 🎬 **Video Engine (2-Pass H.264 / MP4)**: High-efficiency 2-pass encoding with dynamic bitrate allocation and intelligent downscaling protection to eliminate macroblocking.
- 🖼️ **Image Engine (Smart Binary Optimization)**: Fast iterative search for optimal JPEG, WebP, PNG, or GIF quality with zero quality loss whenever possible.
- 🎵 **Audio Engine (AAC / M4A)**: Smart audio bit budget calculation ensuring crisp sound even with tight limits.
- 📄 **PDF Engine**: Dual-mode engine utilizing Ghostscript for deep PDF compression and built-in stream optimizer fallback.
- ⚡ **Auto-Detection from Explorer / Finder**: Instantly detects and selects the file you currently have highlighted in Windows Explorer or macOS Finder when opening the command.
- 🛠️ **System Diagnostics**: Includes a built-in `Compression Engine Diagnostics` command to check FFmpeg / Ghostscript availability and copy one-click install commands.
- 🔒 **100% Local & Private**: All compression is performed locally on your machine. No files or metadata ever leave your computer.

---

## 🚀 Quick Presets

| Preset | Target Size | Ideal For |
| :--- | :--- | :--- |
| **Discord Free** | `20 MB` | Current Discord free file upload limit |
| **WhatsApp** | `16 MB` | WhatsApp media sharing limit |
| **Email Attachment** | `10 MB` | Standard corporate email attachment limit |
| **Legacy Discord** | `8 MB` | Legacy Discord Nitro-free limit |
| **Large Share** | `50 MB` | Quick cloud / link sharing |
| **Video Share** | `100 MB` | High-quality long clip sharing |
| **Custom Size** | *Custom* | Any floating point MB value (e.g., `2.5`, `25`, `120`) |

---

## ⚙️ Prerequisites & Installation

WayCompress uses industry-standard, lightweight CLI engines under the hood.

### 1. FFmpeg (Required for Video, Image & Audio)

- **Windows**:
  ```powershell
  winget install Gyan.FFmpeg
  ```
  *(or via Chocolatey: `choco install ffmpeg` / Scoop: `scoop install ffmpeg`)*

- **macOS**:
  ```bash
  brew install ffmpeg
  ```

### 2. Ghostscript (Optional, for Advanced PDF Compression)

- **Windows**:
  ```powershell
  winget install ArtifexSoftware.GhostScript
  ```
- **macOS**:
  ```bash
  brew install ghostscript
  ```
*(Note: If Ghostscript is not installed, WayCompress automatically falls back to its built-in PDF stream optimizer).*

---

## 📖 Usage Guide

1. Open Raycast (`Alt+Space` or `Cmd+Space`).
2. Run **`Compress to Target Size`** (`waycompress`).
3. If you have a file selected in Explorer or Finder, it will automatically populate. Otherwise, select any file via the file picker.
4. Choose a Quick Preset or enter a custom target MB size.
5. Select a **Quality Strategy**:
   - **Smart Balanced (Auto)**: Automatically protects resolution while reducing bitrate and fine-tuning quantization.
   - **Strict Resolution**: Never downscales width/height dimensions.
   - **Maximum Efficiency**: Converts image/media formats to modern high-efficiency codecs.
6. Press `Enter` or click **Start Compression**.
7. Once finished, inspect the compression summary and click **Reveal in Explorer / Finder** or **Open Compressed File**.

---

## 🛠️ Diagnostics Command

Run **`Compression Engine Diagnostics`** in Raycast anytime to check which CLI tools are installed and operational on your system.

---

## 📄 License

MIT License. See [LICENSE](./LICENSE) for details.
