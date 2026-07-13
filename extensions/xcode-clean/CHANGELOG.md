# Xcode Clean Changelog

## [Initial Version] - {PR_MERGE_DATE}

### Xcode

- Added **Clean All Xcode Caches** command. Cleans Derived Data, SPM, Xcode caches, and Simulator caches in one shot.
- Added **Clean Derived Data** command.
- Added **Clean Derived Data (Single Project)** command. Pick a single entry inside Derived Data and clean only that one, with size shown per entry.
- Added **Clean Swift Package Manager** command.
- Added **Clean Module Cache** command. Cleans `ModuleCache.noindex` inside Derived Data.
- Added **Clean Simulator Caches** command. Cleans CoreSimulator caches only, simulators themselves are kept.
- Added **Clean Device Support** command. Cleans iOS / watchOS / tvOS / macOS Device Support and Device Logs.

### Kotlin / Gradle

- Added **Clean Kotlin Multiplatform Project** command. Recursively scans the configured projects root for `gradlew` files and shows every module in a single searchable list. Each module supports Quick Clean (`./gradlew clean`) and Deep Clean (stop daemon → wipe every `build/` → wipe local `.gradle/`). Auto-detects whether a module sits inside an iOS project (`.xcodeproj` / `.xcworkspace`) or is standalone.
- Added **Clean Kotlin/Native Cache** command. Cleans `~/.konan`.
- Added **Clean Global Gradle Cache** command. Cleans `~/.gradle/caches`.
- Added **Stop Gradle / Kotlin Daemons** command. Kills every running `GradleDaemon` and `KotlinCompileDaemon` process, with a live count of currently running daemons.

### Overview

- Added **Show Cache Sizes** command. Every cache grouped by category (Xcode, Kotlin / Gradle) with sizes, per-cache clean, and "Clean All Listed".

### UX

- Every cleaning command opens an English Detail view first that shows what is being cleaned, the exact paths, the current size, and a destructive action labeled with the size (e.g. `Delete 8.32 GB`).
- List-based commands expose a **Show Info** action on every item to push the same Detail view, alongside a quick `⌘ ⌫` clean action.
- Added **Confirm before deleting** preference that guards every destructive action (on by default).
