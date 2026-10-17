# Disk Space

> Instant, comprehensive storage drive inspection, visual capacity gauges, health monitoring, and system power actions for Raycast on Windows and macOS.

<p align="center">
  <img src="assets/extension-icon.png" width="160" height="160" alt="Disk Space Extension Icon" />
</p>

Disk Space empowers you to instantly inspect disk capacity, available free space, hardware interfaces, file systems, and drive health across all connected internal SSDs, HDDs, removable USB storage, and network shares directly inside Raycast.

---

## ✨ Features

- ⚡ **Zero-Latency Storage Inspection**: Ultra-fast querying utilizing native Windows CIM/WMI pipelines and macOS storage protocols with background caching via `@raycast/utils`.
- 📊 **Dynamic Capacity Gauges**: 10-segment Unicode meters (`▰▰▰▰▱▱▱`) and 16-segment high-resolution sub-block Markdown bars (`████████░░░░░░░░`) with color-coded alerts.
- 🏷️ **Intelligent Category Filtering**: Quick dropdown switching between *All Drives*, *Internal SSD / HDD*, *Removable USB*, *Network Shares*, and *Virtual / Optical Disks*.
- 🔍 **Real-Time Instant Search**: Instant fuzzy filtering across drive letters, volume labels, hardware models, UNC paths, and file systems.
- 📋 **Split-Pane Detail Inspection**: Toggleable detail view (`Cmd+D`) revealing exact byte counts, bus types (NVMe, SATA, USB), media types (SSD, HDD), BitLocker encryption status, and partition indices.
- 🧭 **Menu Bar Glanceable Monitor**: Live menu bar extra showing primary drive space with alert overrides (`⚠️ C: 96%`) and quick-action submenus.
- 🚀 **Instant Power Actions**: One-click shortcuts to open File Explorer / Finder, launch Windows Terminal / PowerShell, trigger Windows Disk Cleanup (`cleanmgr.exe`), open Storage Sense settings, and safely eject removable USB drives.
- 🛡️ **Edge-Case Hardened**: Full resilience against unlabeled drives, non-lettered volumes, offline network shares, 0-byte optical discs, BitLocker encrypted disks, and Asian/Emoji volume names.

---

## 🖥️ Supported Storage & Hardware

| Category | Storage Devices Supported |
|---|---|
| **Internal Storage** | NVMe PCIe M.2 SSDs, SATA III SSDs, SATA HDDs, PCIe Storage Cards |
| **Removable Storage** | USB Flash Drives, External USB 3.0 / USB-C SSDs, SD / microSD Cards |
| **Network Storage** | SMB Shares, NFS Mounts, NAS Mapped Network Drives |
| **Virtual Disks** | VHD, VHDX, ISO Images, RAM Disks, Optical CD / DVD media |

---

## 🕹️ Extension Commands

### 1. `Check Disk Space` (Mode: `view`)
The main interactive storage browser command:
- Interactive list with real-time capacity meters and health tags.
- Dropdown category filter: *All Drives*, *Internal Drives*, *Removable Drives*, *Network Drives*, *Virtual / Optical Drives*.
- Split-pane metadata inspector with high-resolution Markdown gauges.
- Action panel with complete shortcuts for Explorer, Terminal, Disk Cleanup, Storage Sense, and USB ejection.

### 2. `Disk Space Monitor` (Mode: `menu-bar`)
Glanceable menu bar item that continuously tracks storage availability:
- Shows primary drive letter and usage percent (e.g. `C: 65%` or `⚠️ C: 96%` during critical low space).
- Dropdown hierarchical menu listing all connected drives with per-drive usage meters, free space indicators, and quick maintenance shortcuts.
- System overview metrics showing total capacity, aggregate free space, and healthy/warning/critical drive counts.

---

## 🎨 Color-Coded Capacity Thresholds

Disk Space uses an intuitive color-coding system to keep you informed of storage saturation:

| Usage Range | Status | Color | Visual Indicator |
|---|---|---|---|
| **0.0% – 69.9%** | Normal Space | 🟢 **Green** | Plenty of capacity remaining |
| **70.0% – 84.9%** | Moderate Usage | 🟡 **Yellow** | Storage is filling up |
| **85.0% – 89.9%** | High Warning | 🟠 **Orange** | Approaching capacity threshold |
| **≥ 90.0%** | Critical Low Space | 🔴 **Red** | Immediate cleanup recommended |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Description |
|---|---|---|
| <kbd>Enter</kbd> | **Open in File Explorer / Finder** | Opens drive root in default file manager |
| <kbd>Cmd</kbd> + <kbd>T</kbd> | **Open in Terminal** | Spawns Windows Terminal (`wt.exe`), PowerShell, or Terminal at mount root |
| <kbd>Cmd</kbd> + <kbd>D</kbd> | **Toggle Details** | Expands or collapses the split-pane detail inspector |
| <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>K</kbd> | **Launch Disk Cleanup** | Opens `cleanmgr.exe` scoped to the selected volume |
| <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> | **Open Storage Settings** | Deep-links directly to Windows Storage Sense or macOS Storage Settings |
| <kbd>Cmd</kbd> + <kbd>E</kbd> | **Safely Eject Drive** | Safely unmounts and ejects removable USB storage with confirmation |
| <kbd>Cmd</kbd> + <kbd>C</kbd> | **Copy Mount Path** | Copies drive path (e.g. `C:\` or `\\nas\backup`) to clipboard |
| <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd> | **Copy Drive Summary** | Copies human-readable formatted multi-line drive overview |
| <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>J</kbd> | **Copy JSON Metadata** | Copies complete JSON metadata object |
| <kbd>Cmd</kbd> + <kbd>R</kbd> | **Refresh Drives** | Re-scans all connected storage hardware and updates the view |

---

## 🏗️ Architecture & Performance

Disk Space is built with pure TypeScript and zero heavy external runtime dependencies:
- **Windows Engine**: High-speed CIM storage provider (~80ms execution) querying `MSFT_Volume` and `MSFT_PhysicalDisk` using Base64 UTF-16LE EncodedCommand pipelines, with instant fallback to `Win32_LogicalDisk` WMI queries.
- **macOS Engine**: Native POSIX `df -k -P` and `diskutil info` parser for seamless cross-platform support.
- **Safe Hardware Ejection**: Native Shell Automation COM interface and diskutil eject execution.
- **Caching Layer**: Tiered in-memory and `@raycast/utils` caching to eliminate UI latency while supporting instant optimistic updates upon drive ejection.

---

## 👨‍💻 Developer

Developed with ❤️ by **Mudit Jain**.

## 📄 License

MIT © Mudit Jain
