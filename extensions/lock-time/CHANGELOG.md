# Lock Time Changelog

## [Performance Optimization] - {PR_MERGE_DATE}

- Improved first-screen loading speed by 83% (from ~3s to ~0.5s)
- Cache hit speed improved by 97% (repeated opens within 5s take <0.1s)
- `useLockData` Hook: display cached data first, detect in background
- `detectLockStateWithInfo()`: added 5-second detection result cache with `skipCache` param
- `processStateChange()`: parallelized LocalStorage read/write, conditional writes reduce unnecessary I/O
- Manual diagnosis (Cmd+T) forces cache skip for real-time status

## [Fixed Lock Detection on macOS 26] - {PR_MERGE_DATE}

- Fixed lock detection completely broken on macOS 26
  - JXA ObjC bridge cannot properly bridge `CFDictionary`, causing `CGSSessionScreenIsLocked` field to be lost
  - Switched to native Swift `CGSessionCopyCurrentDictionary()` call for reliable bridging
- Fixed AppleScript detection defaulting to "unlocked" on failure
  - Now preserves last known state instead of defaulting to unlocked
- Fixed Lock Stats not triggering state machine on open
  - `useLockData()` now executes `processStateChange()` on first load
- Upgraded detection to multi-level fallback: Swift CGSession → AppleScript → Gap Detection
- Background no-view command logs now use `fs.appendFileSync()` to prevent async log loss

## [Initial Version] - {PR_MERGE_DATE}

- Core lock time tracking
  - Today Locked Time: cumulative lock duration for today
  - Last Lock Duration: duration of the most recent lock session
  - Last Unlock Interval: continuous work time between unlocks
- Three usage modes
  - **Lock Stats** (View): view statistics in Raycast
  - **Update Lock State** (Background): auto-detect every 60 seconds
  - **Lock Time Menu Bar** (Menu Bar): show today's lock time in menu bar
- Quick actions: Manual Update (Cmd+U), Diagnostics (Cmd+T), Copy Stats, Reset Today / Reset All Data
- Privacy-first: all data stored locally in Raycast LocalStorage, no network requests, no accounts
- Built with TypeScript + React on Raycast API v1.93.0
- State machine architecture (LOCKED ↔ UNLOCKED) with automatic daily reset
