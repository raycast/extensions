# Project: Storage Space View Raycast Extension

## Architecture
Storage Space View is a production-grade Raycast extension engineered to provide instant, comprehensive storage drive inspection, visual capacity gauges, health monitoring, and system power actions on Windows and macOS.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Raycast UI Presentation                         │
│   ┌───────────────────────────────┐  ┌─────────────────────────────┐   │
│   │ view-storage (Full Command)   │  │ menu-bar-storage (MenuBar)  │   │
│   │ - Interactive List & Details  │  │ - Glanceable Status Title   │   │
│   │ - 10-Segment Progress Gauges  │  │ - Drive Submenus & Stats    │   │
│   │ - Dropdown Category Filter    │  │ - Quick Maintenance Action  │   │
│   │ - Complete Action Panel       │  │ - 10m Auto-Refresh Interval │   │
│   └───────────────┬───────────────┘  └──────────────┬──────────────┘   │
└───────────────────┼─────────────────────────────────┼──────────────────┘
                    │                                 │
┌───────────────────▼─────────────────────────────────▼──────────────────┐
│                   State Management & Formatting Layer                  │
│   - useCachedPromise & useCachedState (@raycast/utils)                 │
│   - Capacity Bar Gauges (10-seg Unicode ▰▰▰▱▱ & High-Res Markdown)    │
│   - Color Threshold Engine (Green <70%, Yellow 70-84%, Orange 85-89%,   │
│     Red ≥90%)                                                          │
│   - Formatters (formatBytes, formatExactBytes, formatPercent)          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    Storage Engine & Provider Layer                     │
│                   ┌──────────────────────────────┐                     │
│                   │ StorageProviderFactory       │                     │
│                   └──────────────┬───────────────┘                     │
│         ┌────────────────────────┼────────────────────────┐            │
│         ▼                        ▼                        ▼            │
│  [Windows Provider]       [macOS Provider]         [Mock Provider]     │
│  - Direct CIM (MSFT_*)    - df -k -P               - Deterministic     │
│  - WMI Fallback           - diskutil info -plist     Multi-Drive Suite │
│  - EncodedCommand PS      - APFS / Protocol        - CI / Test Harness │
│  - COM USB Eject                                                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                     Power Actions & Integrations                       │
│  - Open File Explorer (explorer.exe / Finder)                          │
│  - Open Terminal (Windows Terminal wt.exe / PowerShell / macOS Term)   │
│  - Launch Windows Disk Cleanup (cleanmgr.exe /d <Letter>)              │
│  - Launch Storage Sense & Disks (ms-settings:storagesense)             │
│  - Safe USB Removable Ejection with Confirmation                       │
│  - Clipboard Copying (Path, Summary, JSON Metadata)                   │
└────────────────────────────────────────────────────────────────────────┘
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---|---|---|---|
| 1 | Normalized Domain Model | TypeScript interfaces for Drive, StorageStats, Health, BusType, MediaType | M1 | Survey |
| 2 | Capacity Meter Engine | 10-segment Unicode `▰▰▰▱▱` and 16-segment sub-block Markdown gauge renderers | M1 | Survey |
| 3 | Byte & String Formatters | Exact 1024-base byte formatter, localized exact bytes, percent formatters | M1 | Survey |
| 4 | Color Threshold Engine | Multi-tier threshold mapper (<70% Green, 70-84% Yellow, 85-89% Orange, ≥90% Red) | M1 | Survey |
| 5 | Windows Fast CIM Engine | High-performance (~80ms) CIM storage queries with Base64 -EncodedCommand | M2 | Survey |
| 6 | Windows WMI Fallback | Ultra-fast fallback querying `Win32_LogicalDisk` if CIM is restricted | M2 | Survey |
| 7 | macOS Storage Pipeline | Native `df -k` and `diskutil info` parser for macOS environment | M2 | Survey |
| 8 | Mock Storage Provider | Comprehensive multi-drive mock engine for CI/CD, testing, and offline modes | M2 | Survey |
| 9 | Provider Factory | Platform-aware provider instantiation (`process.platform` routing) | M2 | Survey |
| 10 | File Explorer Action | Instant drive root opening in Windows File Explorer / macOS Finder | M3 | Survey |
| 11 | Terminal / Shell Action | Spawn Windows Terminal (`wt.exe`), PowerShell, or macOS Terminal at mount root | M3 | Survey |
| 12 | Windows Disk Cleanup Action | Launch `cleanmgr.exe /d <Drive>` pre-scoped to target volume | M3 | Survey |
| 13 | Storage Sense Action | Direct deep-link to Windows `ms-settings:storagesense` / macOS Storage | M3 | Survey |
| 14 | Safe USB Ejection Action | Interactive confirmation & native COM/diskutil ejection with toast feedback | M3 | Survey |
| 15 | Clipboard Export Actions | Copy Drive Path, Human-readable Summary, or Full JSON metadata | M3 | Survey |
| 16 | Interactive Storage List (`view-storage`) | Full Raycast List command with toggleable detail view (`isShowingDetail`) | M4 | Survey |
| 17 | Category Dropdown Filter | Filter by All Drives, Internal SSD/HDD, Removable USB, Network Shares | M4 | Survey |
| 18 | Search & Filter Engine | Real-time search across drive letters, volume labels, models, and file systems | M4 | Survey |
| 19 | Detail & Metadata Pane | Rich Markdown header with gauge, metric table, health tags, and bus info | M4 | Survey |
| 20 | Glanceable Menu Bar (`menu-bar-storage`) | MenuBarExtra command with dynamic alert title and tinted hard drive icon | M5 | Survey |
| 21 | Menu Bar Drive Submenus | Hierarchical dropdown with per-drive usage stats, health badge, and quick actions | M5 | Survey |
| 22 | Auto-Refresh & Revalidation | 10-minute menu bar polling interval, manual `Cmd+R` refresh, optimistic updates | M5 | Survey |
| 23 | Edge Case Resilience | Handles unlabeled drives, missing letters, offline shares, BitLocker, 0-byte media | M1, M2, M4 | Survey |
| 24 | Public Store Assets & Package | 512x512 PNG icon, manifest schema, categories, README, CHANGELOG | M6 | Survey |
| 25 | Code Quality & Compilation | Zero TypeScript errors (`tsc --noEmit`), zero ESLint errors, clean `ray build` | M6 | Survey |
| 26 | E2E Testing Suite (Tiers 1-4) | Independent opaque-box test runner covering ≥11×N test cases | Track A | Survey |
| 27 | Adversarial Hardening (Tier 5) | Adversarial edge-case generator and forensic integrity audit verification | M7 | Survey |

## Milestones

### Track A: E2E Testing Track (Independent Opaque-Box Validation)
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| TA1 | Test Runner Harness | Standalone Node/TS test runner with mock OS feeds & validation assertions | none | DONE |
| TA2 | Comprehensive 4-Tier Test Suite | Tier 1 (Feature Coverage ≥5/feat), Tier 2 (Boundary/Edge ≥5/feat), Tier 3 (Pairwise Combinations), Tier 4 (Real-World Scenarios). Publishes `TEST_READY.md` | TA1 | DONE |

### Track B: Implementation Track
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | Core Domain Models, Formatters & Utilities | Types, capacity bar generators, formatBytes, color thresholds, edge-case sanitizers | none | DONE |
| M2 | Storage Engine & Multi-Platform Providers | Windows CIM + WMI fallback, macOS provider, Mock provider, Provider factory | M1 | DONE |
| M3 | Instant Power Actions & Integrations | Explorer, Terminal, Disk Cleanup, Storage Sense, COM USB eject, Clipboard | M1 | DONE |
| M4 | Raycast Command: "View Storage Space" | `view-storage` List, Detail pane, Dropdown filters, Search, ActionPanel | M1, M2, M3 | DONE |
| M5 | Raycast Command: "Menu Bar Storage Monitor" | `menu-bar-storage` MenuBarExtra, status titles, drive submenus, auto-refresh | M1, M2, M3 | DONE |
| M6 | Store Assets, Documentation & Build Verification | 512x512 icon, README.md, CHANGELOG.md, package.json polish, ESLint, TypeScript, Raycast build | M4, M5 | DONE |
| M7 | E2E Verification & Adversarial Coverage Hardening | Phase 1: 100% Pass of E2E Suite (Tiers 1-4); Phase 2: Tier 5 Adversarial Hardening & Forensic Audit | TA2, M6 | DONE |

## Interface Contracts

### Domain Types (`src/types/storage.ts`)
```typescript
export type DriveCategory = "internal" | "removable" | "network" | "virtual" | "optical" | "unknown";
export type DriveTypeFilter = "all" | "internal" | "removable" | "network" | "virtual";
export type DriveHealthStatus = "Healthy" | "Warning" | "Critical" | "Unknown";

export interface StorageDrive {
  id: string;
  mountPoint: string;
  volumeName: string;
  displayName: string;
  driveLetter?: string;
  category: DriveCategory;
  driveTypeDescription: string;
  fileSystem: string;
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usagePercent: number; // 0.0 - 100.0
  healthStatus: DriveHealthStatus;
  busType?: string;
  mediaType?: "SSD" | "HDD" | "SCM" | "Unspecified" | "NetworkShare";
  model?: string;
  isReadOnly: boolean;
  isSystemDrive: boolean;
  isRemovable: boolean;
  isBitLockerEncrypted?: boolean;
  networkPath?: string;
  diskNumber?: number;
  partitionNumber?: number;
}

export interface StorageOverview {
  totalDrives: number;
  totalBytes: number;
  totalFreeBytes: number;
  totalUsedBytes: number;
  overallUsagePercent: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  primaryDrive?: StorageDrive;
}

export interface IStorageProvider {
  readonly platformName: string;
  getDrives(): Promise<StorageDrive[]>;
  getOverview(): Promise<StorageOverview>;
  ejectDrive?(drive: StorageDrive): Promise<boolean>;
}
```

### Formatting Utilities (`src/utils/formatters.ts` & `src/utils/meters.ts`)
```typescript
export function formatBytes(bytes: number, decimals?: number): string;
export function formatExactBytes(bytes: number): string;
export function formatPercent(percent: number): string;
export function renderSegmentMeter(usagePercent: number, totalSegments?: number, filledChar?: string, emptyChar?: string): string;
export function renderHighResMeter(usagePercent: number, totalSegments?: number): string;
export function getUsageColor(percentage: number): Color;
export function getHealthColor(healthStatus: DriveHealthStatus): Color;
export function getCategoryIcon(category: DriveCategory): Icon;
```

### Action Integrations (`src/actions/power-actions.ts`)
```typescript
export function openDriveRoot(mountPoint: string): Promise<void>;
export function openInTerminal(drivePath: string): Promise<void>;
export function launchDiskCleanup(driveLetter?: string): Promise<void>;
export function openStorageSense(): Promise<void>;
export function safelyEjectDrive(drive: StorageDrive, onEjected?: () => void): Promise<void>;
export function copyDriveSummary(drive: StorageDrive): Promise<void>;
export function copyDriveJson(drive: StorageDrive): Promise<void>;
```

## Code Layout
```
d:/AI Made Apps/Raycast Extensions/Storage Space View Extension/
├── assets/
│   └── extension-icon.png               # 512x512 Store icon
├── src/
│   ├── types/
│   │   └── storage.ts                   # Core data interfaces
│   ├── utils/
│   │   ├── formatters.ts                # Byte, percentage, exact formatters
│   │   ├── meters.ts                    # Unicode block & high-res gauge generators
│   │   ├── colors.ts                    # Color threshold & icon resolvers
│   │   └── sanitizers.ts                # Fallbacks for unlabeled/offline/0-byte drives
│   ├── services/
│   │   ├── powershell-runner.ts         # EncodedCommand UTF-16LE execution engine
│   │   ├── windows-provider.ts          # CIM + WMI fallback storage provider
│   │   ├── macos-provider.ts            # df -k + diskutil info provider
│   │   ├── mock-provider.ts             # Deterministic mock provider for tests
│   │   └── storage-factory.ts           # Platform-aware factory & caching service
│   ├── actions/
│   │   └── power-actions.ts             # Explorer, Terminal, cleanmgr, Settings, Eject
│   ├── components/
│   │   ├── DriveDetail.tsx              # Split-pane detail view with Markdown & Metadata
│   │   ├── DriveListItem.tsx            # List item with badge accessories & meters
│   │   ├── DriveActionPanel.tsx         # Unified action panel with keyboard shortcuts
│   │   └── EmptyStorageView.tsx         # Resilient empty & error boundary view
│   ├── hooks/
│   │   └── useStorage.ts                # useCachedPromise state hook
│   ├── view-storage.tsx                 # Main List command
│   └── menu-bar-storage.tsx             # Menu bar monitor command
├── tests/
│   ├── runner.ts                        # E2E & unit test execution harness
│   ├── mock-data.ts                     # Test fixtures across drive topologies
│   ├── tier1-feature.test.ts            # Tier 1 Feature coverage tests
│   ├── tier2-boundary.test.ts           # Tier 2 Boundary & edge cases tests
│   ├── tier3-combination.test.ts        # Tier 3 Pairwise cross-feature tests
│   └── tier4-application.test.ts        # Tier 4 Real-world workflow tests
├── package.json                         # Raycast extension manifest & scripts
├── tsconfig.json                        # Strict TypeScript configuration
├── README.md                            # Comprehensive documentation & shortcuts
└── CHANGELOG.md                         # Release history
```
