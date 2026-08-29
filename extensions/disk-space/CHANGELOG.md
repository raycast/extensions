# Changelog

All notable changes to the "Storage Space View" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-08-29

### Added
- **Interactive Storage Browser (`view-storage`)**:
  - Live inspection of all connected internal SSDs, HDDs, removable USB storage, network shares, and virtual disks.
  - 10-segment Unicode capacity meters (`▰▰▰▰▱▱▱`) with color-coded alerts (Green <70%, Yellow 70-84%, Orange 85-89%, Red ≥90%).
  - Category dropdown filter for *All Drives*, *Internal SSD / HDD*, *Removable USB*, *Network Drives*, and *Virtual Disks*.
  - Real-time search across volume labels, drive letters, hardware models, UNC paths, and file systems.
  - Split-pane detail inspector with 16-segment sub-block Markdown meters (`████████░░░░░░░░`) and comprehensive hardware metadata.
- **Menu Bar Storage Monitor (`menu-bar-storage`)**:
  - Glanceable menu bar title displaying live primary drive usage with alert overrides for critical low space.
  - Hierarchical submenus with per-drive usage stats, health badges, and direct maintenance actions.
  - Storage overview metrics showing aggregate capacity, free space, and healthy/warning/critical drive counts.
- **System Power Actions**:
  - Open drive root in File Explorer / macOS Finder.
  - Spawn Windows Terminal (`wt.exe`), PowerShell, or macOS Terminal at drive root.
  - Launch Windows Disk Cleanup (`cleanmgr.exe`) scoped to specific volume.
  - Direct deep-link to Windows Storage Sense / macOS Storage Settings.
  - Safe USB unmount and ejection with confirmation dialog.
  - Clipboard export for mount paths, human-readable summaries, and JSON metadata.
- **High-Performance Cross-Platform Storage Engine**:
  - Windows CIM (`MSFT_Volume`, `MSFT_PhysicalDisk`) with fast WMI fallback via UTF-16LE Base64 EncodedCommand PowerShell pipeline.
  - macOS POSIX fallback via `df -k -P` and `diskutil info`.
  - Zero-latency caching and optimistic mutation support via `@raycast/utils`.
  - Resilience against unlabeled volumes, missing drive letters, offline shares, BitLocker drives, and 0-byte optical media.
