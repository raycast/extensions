# Original User Request

## Initial Request — 2026-08-29T18:04:09+05:30

Deploy a team of survey agents / multi-agent structured team to perform systematic execution and thorough verification.

Build a production-grade, public-store-ready Storage Space View extension for Raycast. The extension empowers users to instantly inspect storage usage, capacity breakdown, and drive health across all local, external, and network drives on Windows (with full cross-platform architecture ready for macOS), complete with visual meters, health status indicators, and power actions.

Working directory: d:/AI Made Apps/Raycast Extensions/Storage Space View Extension
Integrity mode: development

## Requirements

### R1. Comprehensive Storage & Hardware Detection (Cross-Platform)
- Detect all connected storage drives (internal SSDs/HDDs/NVMe, removable USB drives, network drives, virtual disks).
- Retrieve drive letter/mount point, volume label, total capacity, free capacity, used capacity, usage percentage, file system (NTFS, exFAT, FAT32, APFS), drive type, and health status.
- Windows execution must be native and lightweight (PowerShell CIM/Volume/PhysicalDisk), with zero heavy native C++ binary dependencies.
- Include robust macOS fallback/provider architecture (df and diskutil).

### R2. Elegant & Polished Raycast UI Commands
- Provide a main command "View Storage Space" (view-storage) featuring:
  - Interactive List with toggleable detail view (List.Item.Detail).
  - Sleek visual capacity meters (▰▰▰▰▱▱▱ or dynamic gauges) and color-coded alert indicators (Green < 70%, Yellow 70–90%, Red > 90% low space).
  - Search bar and category dropdown filter (All Drives, Internal SSD/HDD, Removable USB, Network Drives).
  - Detailed metadata panel showing formatted byte counts, usage percentages, hardware/bus type, file system, and disk health recommendations.
- Provide a secondary "Menu Bar Storage Monitor" (menu-bar-storage) command displaying glanceable live primary drive space in the menu bar with a dropdown menu of all drives.

### R3. Instant Power Actions
- Equip every drive with quick Raycast actions:
  - Open drive root in File Explorer / Finder.
  - Open Terminal / PowerShell at drive root.
  - Launch Windows Disk Cleanup (cleanmgr.exe) / macOS Storage Management.
  - Launch Windows Storage Sense Settings (ms-settings:storagesense).
  - Safely eject removable / USB drives.
  - Copy drive path, free space summary, or JSON metadata to clipboard.
  - Refresh drive list with hotkey (Cmd+R / Ctrl+R).

### R4. Edge Case Handling & Public Store Readiness
- Gracefully handle edge cases: drives with no volume label, missing/null drive letters, offline network shares, locked or read-only volumes, zero-byte optical drives, non-ASCII drive names, and execution permission errors.
- Include production assets (store-ready extension-icon.png, command metadata, categories, keywords, documentation).
- Comply strictly with Raycast API guidelines, ESLint, and TypeScript strict mode.

## Acceptance Criteria

### Functionality & Accuracy
- [ ] All active Windows drives (e.g. C:, D:, E:, USB drives) are detected and display exact matching byte sizes, free space, and volume labels.
- [ ] Category filtering accurately segments drives by type (Internal vs Removable vs Network).
- [ ] All primary and secondary actions (Explorer, Disk Cleanup, Storage Sense, Terminal, Eject, Copy) execute reliably without crashes.
- [ ] Edge cases (e.g., drives without letters, inaccessible shares) do not crash the extension and display informative fallbacks.

### Code Quality & Build Validation
- [ ] TypeScript compilation (npx tsc --noEmit) passes with zero errors under strict mode.
- [ ] Raycast build (npm run build or npx ray build) compiles without bundle errors.
- [ ] Zero unhandled promise rejections or uncaught exceptions during background polling or command execution.
