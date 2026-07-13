# Xcode Clean

Raycast extension to clean Xcode-related caches and Kotlin Multiplatform / Gradle builds.

## Commands

### Xcode

| Command | What it does |
|---------|--------------|
| **Clean All Xcode Caches** | Deletes Derived Data, Swift Package Manager cache, Xcode caches, and Simulator caches. |
| **Clean Derived Data** | Deletes `~/Library/Developer/Xcode/DerivedData`. |
| **Clean Derived Data (Single Project)** | Lists every project entry inside Derived Data with size, lets you nuke one without touching the others. |
| **Clean Swift Package Manager** | Deletes the SPM download cache. |
| **Clean Module Cache** | Deletes `ModuleCache.noindex` inside Derived Data. |
| **Clean Simulator Caches** | Deletes `~/Library/Developer/CoreSimulator/Caches`. Does NOT delete simulators. |
| **Clean Device Support** | Deletes iOS / watchOS / tvOS / macOS Device Support files and Device Logs. |

### Kotlin / Gradle

| Command | What it does |
|---------|--------------|
| **Clean Kotlin Multiplatform Project** | Scans the configured root for `gradlew` files and shows every module in one searchable list, grouped as **Inside iOS Project** vs **Standalone**. Per module: `./gradlew clean` or **Deep Clean** (stop daemon → wipe every `build/` → wipe local `.gradle/`). |
| **Clean Kotlin/Native Cache** | Deletes `~/.konan` (compiler, LLVM, dependencies, often huge). |
| **Clean Global Gradle Cache** | Deletes `~/.gradle/caches`. Use sparingly: every project re-downloads. |
| **Stop Gradle / Kotlin Daemons** | `pkill` of every running `GradleDaemon` and `KotlinCompileDaemon`. |

### Overview

| Command | What it does |
|---------|--------------|
| **Show Cache Sizes** | All caches grouped by category (Xcode, Kotlin / Gradle), with sizes, per-cache and global clean. |

## How "Clean Kotlin Multiplatform Project" finds projects

Opening the command scans the configured **Kotlin Projects Root** recursively (max depth 4) for `gradlew` files and shows every module it finds in a single flat list. Type a few letters, hit Enter, done. No folder navigation needed: `./gradlew clean` always runs with the working directory set to the module's own folder.

Heavy folders are skipped during the scan: `.git`, `.gradle`, `.idea`, `.build`, `.swiftpm`, `.cache`, `.kotlin`, `node_modules`, `build`, `DerivedData`, `Pods`, `Carthage`, `vendor`, `Library`. For each `gradlew` found, the scan also climbs back up looking for an `.xcodeproj`/`.xcworkspace` so the module is grouped either under **Inside iOS Project** (titled `ios_app › module`) or **Standalone**.

Both layouts work out of the box:

```
~/Projects/                       ← Kotlin Projects Root
├── my_ios_app/
│   ├── my_ios_app.xcodeproj      → detected as iOS parent
│   └── shared/                   → listed as "my_ios_app › shared"
│       └── gradlew
├── another_ios_app/
│   ├── another_ios_app.xcworkspace
│   └── kmp/                      → listed as "another_ios_app › kmp"
│       └── gradlew
└── standalone_kmp_lib/           → listed as "standalone_kmp_lib" (Standalone)
    └── gradlew
```

## What is NOT touched (by design)

- `~/Library/Developer/Xcode/Archives`: your release `.xcarchive` files.
- `~/Library/Developer/CoreSimulator/Devices`: the simulators themselves.

## How info works

Every cleaning command opens a **Detail view first**, in English, that shows:

- A short explanation of what the cache is and why you might want to clean it
- The exact paths that will be deleted
- The current size on disk
- A clear destructive action button labeled with the size (e.g. *Delete 8.32 GB*)

For the list-based commands (Show Cache Sizes, Clean Kotlin Multiplatform Project, Clean Derived Data Single Project), each item additionally exposes a **Show Info** action that pushes the same Detail view, alongside a quick **Clean** action (`⌘ ⌫`) that uses the alert-based confirmation flow.

## Preferences

- **Kotlin Projects Root**: folder to scan for KMP / iOS-with-KMP projects.
- **Confirm before deleting**: confirmation dialog before every destructive action, in both the Detail flow and the inline quick-clean actions. On by default.

## Development

```sh
npm install
npm run dev
```

The icon lives at `assets/command-icon.png`.
