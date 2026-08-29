# Storage Space View — Test Infrastructure & Methodology (`TEST_INFRA.md`)

## 1. Testing Philosophy & Core Principles

The **Storage Space View Raycast Extension** test infrastructure is engineered around an **opaque-box, requirement-driven, and multi-topology resilience** testing philosophy. It guarantees that drive detection, capacity math, visual gauges, status alerts, category segmentation, and system power actions operate flawlessly across all supported operating systems (Windows and macOS) without relying on internal implementation details.

### Core Principles
1. **Opaque-Box Requirement Verification**: Tests evaluate system inputs and observable outputs against strict interface contracts defined in `PROJECT.md` and requirements in `ORIGINAL_REQUEST.md`.
2. **Zero-Facade / High-Integrity Testing**: Every test case executes real logic, validates mathematical invariants, inspects DOM/Markdown gauge output structure, and enforces invariant constraints. No fake, empty, or facade tests are permitted.
3. **Multi-Topology Coverage**: Test fixtures simulate diverse real-world hardware environments including NVMe SSDs, SATA HDDs, USB Flash Drives, BitLocker encrypted volumes, offline SMB/NFS network shares, empty optical drives (CD/DVD), and Unicode volume labels (`💾 Backup_2026`).
4. **Deterministic & Self-Contained Execution**: The test harness runs independently in any Node.js/TypeScript environment with zero heavy native C++ or Raycast runtime dependencies, ensuring rapid execution in CI/CD pipelines.
5. **Strict Threshold & Boundary Precision**: Verification of exact floating-point usage percentages, byte boundaries (1024-based binary scaling), color state transitions (<70%, 70–84%, 85–89%, ≥90%), and edge case normalizations.

---

## 2. Four-Tier Testing Methodology

The test suite is structured into four distinct, cumulative validation tiers to ensure complete test coverage:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Tier 4: Real-World Application Workloads             │
│   - End-to-End Scan & Overview Calculation Workflow                    │
│   - Category Filter Navigation & Query Search Transitions              │
│   - USB Ejection Lifecycle & Optimistic State Invalidation            │
│   - Clipboard Export Formatting (Path, Human Summary, JSON Schema)    │
│   - Menu Bar Glanceable Title & Icon Color Computation                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                   Tier 3: Pairwise Cross-Feature Combinations          │
│   - Removable Media + High Capacity Critical Threshold (≥90%)          │
│   - Offline Network Share + Search Filter + Auto-Refresh Cycle         │
│   - System Volume + Pre-Scoped Windows Disk Cleanup Action             │
│   - Unlabeled Volume + Split-Pane Detail + High-Res Markdown Gauge     │
│   - BitLocker Encrypted Volume + Zero-Free-Space Normalization         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                   Tier 2: Boundary & Extreme Edge Cases                │
│   - Zero Bytes (0 B total, 0 B used, 0 B free)                         │
│   - 100.0% Full Drives & Single-Byte Free Space Edge                   │
│   - Exact Color Cutoffs (69.99% Green vs 70.00% Yellow, etc.)          │
│   - Negative Numbers, NaN, Infinity & Corrupt Data Ingestion           │
│   - Missing Volume Labels, Null Drive Letters, Mount-Path-Only Volumes │
│   - Multi-Petabyte Extreme Capacities (PB scale)                       │
│   - Unicode / UTF-8 Multi-byte Characters & Emoji Volume Names         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                   Tier 1: Feature Functionality Coverage               │
│   - Exact 1024-based Binary Byte Formatting (B, KB, MB, GB, TB, PB)   │
│   - 10-Segment Unicode Meter Generation (`▰▰▰▰▱▱▱▱▱▱`)                 │
│   - 16-Segment High-Res Markdown Gauge Generation (`████░░░░`)         │
│   - 4-Tier Color Threshold Mapping (Green, Yellow, Orange, Red)        │
│   - Drive Category Classification & Search Filter Filtering            │
│   - StorageOverview Statistical Aggregations & Health Distribution     │
└────────────────────────────────────────────────────────────────────────┘
```

### Tier 1: Feature Coverage (≥5 tests per feature)
Verifies discrete functional units against documented contracts:
- `formatBytes`: Exact base-1024 conversions across 0 B, KB, MB, GB, TB, PB with customizable decimal places.
- `formatExactBytes`: Localized comma-delimited exact byte integers with "B" suffix.
- `formatPercent`: Clamped 1-decimal percentage strings (`0.0%` to `100.0%`).
- `renderSegmentMeter`: Accurate 10-segment Unicode filled/empty block rendering (`▰`/`▱`) with custom length overrides.
- `renderHighResMeter`: 16-segment sub-block Markdown gauges (`█`/`░`) with fractional filling.
- `getUsageColor` & `getHealthColor`: Color token resolution for Raycast UI.
- `getCategoryIcon`: Raycast Icon mapping for all 6 drive categories (`internal`, `removable`, `network`, `virtual`, `optical`, `unknown`).
- Category filtering & Search matching logic.

### Tier 2: Boundary & Edge Cases
Evaluates robustness against malformed, boundary, or abnormal inputs:
- 0-byte total capacity drives (empty optical CD/DVD drives, raw unpartitioned media).
- 100% capacity saturation (0 bytes free) and 0.0% empty disks.
- Critical threshold boundaries:
  - 69.99% (Green) vs. 70.00% (Yellow)
  - 84.99% (Yellow) vs. 85.00% (Orange)
  - 89.99% (Orange) vs. 90.00% (Red)
- Abnormal floating point inputs (`NaN`, `-Infinity`, `+Infinity`, `-1024`, negative free bytes).
- Unlabeled drives (fallback to `"Local Disk (C:)"` or `"Removable Disk"`).
- Missing drive letters (e.g., mounted directory `C:\Mount\Data` or GUID path `\\?\Volume{guid}\`).
- Offline/unreachable network shares (reporting `"Unknown"` health and preserving share path).
- BitLocker locked volumes (flagged `isBitLockerEncrypted: true`, read-only status preserved).
- Unicode volume names with emojis, Asian characters, and special shell characters (`💾 Backup_2026`, `ディスク C:`, `D&D "Test" %TEMP%`).

### Tier 3: Pairwise Combinations
Tests interaction between multiple cross-cutting features:
- **Removable Drive + >90% Critical Space**: Confirms red meter, warning status, and availability of Safe Eject action.
- **Network Share + Offline State + Revalidation**: Confirms unknown health, offline badge, graceful error recovery, and search filter visibility.
- **System Drive + Disk Cleanup Action**: Confirms pre-scoped command `cleanmgr.exe /d C:` targeting system volume.
- **Unlabeled Drive + Split-Pane Detail + High-Res Markdown Gauge**: Confirms sanitized display name, markdown header formatting, and hardware metadata table.
- **BitLocker Locked + Formatters + Overview**: Confirms overall storage aggregation handles missing usage bytes without corrupting total drive counts.

### Tier 4: Real-World Application Workloads
Simulates complete Raycast user journeys and end-to-end lifecycles:
- **Full Storage Scan & Overview Aggregation**: Mock provider querying diverse drive topologies, calculating aggregated usage percentages, healthy/warning/critical counts, and identifying primary system drive.
- **Interactive Multi-Drive Filter Transitions**: Simulates user toggling from "All Drives" -> "Internal SSD/HDD" -> "Removable USB" -> "Network Drives" and entering search queries.
- **Safe Ejection Lifecycle**: Simulates user initiating USB drive ejection, verifying confirmation prompt contract, and verifying optimistic removal from cached drive list.
- **Clipboard Export Schema Validation**: Validates all 3 clipboard export modes:
  1. *Drive Path*: Validates exact mount point path (e.g. `C:\` or `\\nas\share`).
  2. *Summary*: Validates human-readable Markdown text containing drive label, capacity, free space, percentage, and health.
  3. *JSON Metadata*: Validates JSON serialization adheres to `StorageDrive` schema with all required properties.
- **Menu Bar Glanceable Monitor**: Validates menu bar title generation (e.g. `C: 65%` or `⚠️ 95%`) and drive list submenus.

---

## 3. Feature Mapping Matrix (Features 1–27)

| Feature # | Feature Name | Primary Test Suite | Verification Focus |
|---|---|---|---|
| F1 | Normalized Domain Model | `tests/mock-data.ts`, `tier1-feature.test.ts` | Type validation, structural integrity, optional attributes |
| F2 | Capacity Meter Engine | `tier1-feature.test.ts`, `tier2-boundary.test.ts` | 10-seg Unicode & 16-seg Markdown sub-block gauges |
| F3 | Byte & String Formatters | `tier1-feature.test.ts`, `tier2-boundary.test.ts` | Base-1024 exact byte scaling, localized commas, percent |
| F4 | Color Threshold Engine | `tier1-feature.test.ts`, `tier2-boundary.test.ts` | 4-tier color cutoffs (<70%, 70-84%, 85-89%, ≥90%) |
| F5 | Windows Fast CIM Engine | `tier1-feature.test.ts`, `tier4-application.test.ts` | PowerShell CIM parser, JSON deserialization |
| F6 | Windows WMI Fallback | `tier1-feature.test.ts`, `tier4-application.test.ts` | `Win32_LogicalDisk` query parser & normalization |
| F7 | macOS Storage Pipeline | `tier1-feature.test.ts`, `tier4-application.test.ts` | `df -k` and `diskutil info` parser |
| F8 | Mock Storage Provider | `tests/mock-data.ts`, `tier4-application.test.ts` | Multi-drive deterministic topology provider |
| F9 | Provider Factory | `tier1-feature.test.ts`, `tier4-application.test.ts` | Platform-aware routing (`process.platform`) |
| F10 | File Explorer Action | `tier3-combination.test.ts`, `tier4-application.test.ts` | Root path resolution (`explorer.exe` / `open`) |
| F11 | Terminal / Shell Action | `tier3-combination.test.ts`, `tier4-application.test.ts` | Working directory path escaping & command dispatch |
| F12 | Windows Disk Cleanup Action | `tier3-combination.test.ts`, `tier4-application.test.ts` | `cleanmgr.exe /d <Letter>` argument synthesis |
| F13 | Storage Sense Action | `tier3-combination.test.ts`, `tier4-application.test.ts` | `ms-settings:storagesense` deep-link invocation |
| F14 | Safe USB Ejection Action | `tier3-combination.test.ts`, `tier4-application.test.ts` | PowerShell COM ejection & optimistic cache purge |
| F15 | Clipboard Export Actions | `tier4-application.test.ts` | Path, Human-readable summary & JSON export contracts |
| F16 | Interactive Storage List (`view-storage`) | `tier1-feature.test.ts`, `tier4-application.test.ts` | Item metadata, accessory badges, detail toggle |
| F17 | Category Dropdown Filter | `tier1-feature.test.ts`, `tier4-application.test.ts` | Filter predicates (`all`, `internal`, `removable`, etc.) |
| F18 | Search & Filter Engine | `tier1-feature.test.ts`, `tier4-application.test.ts` | Multi-field search across label, letter, model, fs |
| F19 | Detail & Metadata Pane | `tier3-combination.test.ts`, `tier4-application.test.ts` | Markdown gauge, metrics table, health status badge |
| F20 | Glanceable Menu Bar (`menu-bar-storage`) | `tier4-application.test.ts` | MenuBar title, percentage gauge, alert icon |
| F21 | Menu Bar Drive Submenus | `tier4-application.test.ts` | Per-drive stats, health badge, action triggers |
| F22 | Auto-Refresh & Revalidation | `tier4-application.test.ts` | 10-minute cache revalidation & manual refresh hotkey |
| F23 | Edge Case Resilience | `tier2-boundary.test.ts`, `tier3-combination.test.ts` | Unlabeled, unlettered, offline, 0-byte, BitLocker, UTF-8 |
| F24 | Public Store Assets & Package | `tier1-feature.test.ts`, `tier4-application.test.ts` | Manifest verification, package metadata, schema compliance |
| F25 | Code Quality & Compilation | `tests/runner.ts` | TypeScript strict mode, zero bundle errors |
| F26 | E2E Testing Suite (Tiers 1-4) | `tests/runner.ts` | Standalone executable harness, ≥300 assertions |
| F27 | Adversarial Hardening (Tier 5) | `tier2-boundary.test.ts`, `tier3-combination.test.ts` | Escaping integrity, invalid combinations, stress |

---

## 4. Test Harness Architecture (`tests/runner.ts`)

The test harness is designed to execute directly in Node.js / TypeScript:
- **Zero Heavy Test Framework Bloat**: Custom assertion engine (`expect(actual).toBe(expected)`, `toEqual`, `toMatch`, `toBeGreaterThan`, `toThrow`, `toBeCloseTo`) with descriptive error traces and structural diffing.
- **Isolated Test Execution**: Each test runs with isolated fixture copies, eliminating order-dependent side effects.
- **Granular Test Reporting**: Outputs hierarchical suite progress, assertion counts, tier breakdowns, execution duration, and exit codes (0 for pass, 1 for failure).
- **Target Coverage**: Over 300+ assertions across 4 comprehensive test files.

---

## 5. Running the Tests

To run the complete test suite:

```powershell
# Option 1: Execute directly with ts-node or compiled test runner
npm test
# OR
node -e "require('typescript'); require('ts-node/register'); require('./tests/runner.ts');"
# OR compile and run
npx tsc --project tsconfig.json && node dist-tests/runner.js
```
