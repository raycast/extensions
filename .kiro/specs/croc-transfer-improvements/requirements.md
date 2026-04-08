# Requirements Document

## Introduction

This document covers a set of improvements to the Croc Transfer Raycast extension — a GUI wrapper for the `croc` CLI file transfer tool. The improvements span a specific bug fix (file renaming on receive), UX enhancements, missing features, code quality fixes, and Raycast best-practice alignment. The goal is to make the extension more reliable, more discoverable, and better aligned with Raycast conventions.

## Glossary

- **Extension**: The Croc Transfer Raycast extension.
- **CrocBinary**: The `croc` CLI executable resolved by `getCrocPath()`.
- **SendCommand**: The "Send File" Raycast command (`send-file.tsx`).
- **ReceiveCommand**: The "Receive File" Raycast command (`receive-file.tsx`).
- **QuickSendCommand**: A new `no-view` Raycast command that sends Finder-selected files without opening a UI window.
- **HistoryCommand**: The "Transfer History" Raycast command (`transfer-history.tsx`).
- **TransferRecord**: A persisted history entry stored in Raycast LocalStorage representing one transfer attempt. `status` is one of `"success"`, `"failed"`, `"cancelled"`, or `"in_progress"` (the last is a transient state used only by QuickSendCommand's write-ahead pattern).
- **CodePhrase**: The hyphen-separated secret string croc uses to identify a transfer session.
- **DownloadDirectory**: The directory preference where received files are saved.
- **useTransfer**: The existing React hook in `src/hooks/useTransfer.ts` that manages transfer lifecycle state.
- **useCrocCheck**: The existing React hook in `src/hooks/useCrocCheck.ts` that checks whether the CrocBinary is available.
- **getCrocPath**: The utility function in `src/utils/croc.ts` that resolves the CrocBinary path, using a module-level cache.
- **InstallGuide**: The component shown when the CrocBinary is not found.
- **PTYWrapper**: The Python pseudo-terminal wrapper used to capture croc output.
- **HUD**: Raycast Head-Up Display notification shown briefly over any app.

---

## Implementation Order & Dependencies

### P0 — Foundation (must be implemented first)
- Requirement 13: Make useCrocCheck Asynchronous
- Requirement 14: Clean Up buildCrocArgs Receive Interface
- Requirement 1: Remove Timestamp-Based File Renaming on Receive

### P1 — Core Improvements
- Requirement 2: Refactor SendCommand to Use the useTransfer Hook
- Requirement 10: Fix Download Directory Preference — Remove Forced /Share Subdirectory
- Requirement 12: Add Refresh Action to InstallGuide and Clear Path Cache on Command Open
- Requirement 3: Replace Receive Input List with a Form

### P2 — UX Enhancements
- Requirement 4: Notify User on Send Completion via HUD
- Requirement 5: Add "Reveal in Finder" Action to Receive Done Screen
- Requirement 6: Date Grouping in Transfer History
- Requirement 7: Add Timestamp and File Count Accessories to History List Items
- Requirement 8: Write History Record for Cancelled Transfers
- Requirement 9: Capture and Display File Size in History
- Requirement 15: InstallGuide Action to Install croc
- Requirement 16: Index Filenames in History Search

### P3 — New Feature
- Requirement 11: Add Quick Send No-View Command

### Dependencies
- Requirement 12 depends on Requirement 13 (cache invalidation requires async check).
- Requirements 4, 8, and 9 benefit from Requirement 2 being completed first.
- Requirement 11 (QuickSendCommand) is independent of the `useTransfer` hook refactor; see Requirement 11 acceptance criteria for details.
- Requirement 15 also triggers the cache clear mechanism defined in Requirement 12; the two requirements share the same invalidation logic.

---

## Requirements

### Requirement 1: Remove Timestamp-Based File Renaming on Receive

**User Story:** As a receiver, I want received files to keep their original names, so that I can identify and use them without having to rename them manually.

#### Acceptance Criteria

1. WHEN a file transfer completes successfully, THE ReceiveCommand SHALL save received files using their original filenames as written by croc, without applying any timestamp-based rename pattern.
2. THE Extension SHALL NOT rename `.txt` files to `.md` upon receipt.
3. WHEN the done screen is shown after a successful receive, THE ReceiveCommand SHALL display the original filenames of the received files.
4. WHEN a history record is written after a successful receive, THE Extension SHALL store the original filenames in `TransferRecord.files`.
5. WHEN a file with the same name already exists in the DownloadDirectory, THE ReceiveCommand SHALL rely on croc's default behavior for handling the conflict (croc itself determines whether to overwrite or skip); THE Extension SHALL NOT add its own conflict resolution on top of croc's behavior.

---

### Requirement 2: Refactor SendCommand to Use the useTransfer Hook

**User Story:** As a developer, I want `send-file.tsx` to use the existing `useTransfer` hook, so that transfer state logic is not duplicated between the hook and the component.

#### Acceptance Criteria

1. THE SendCommand SHALL manage its transfer lifecycle state exclusively through the `useTransfer` hook rather than duplicating state variables inline.
2. WHEN the `useTransfer` hook is used in the SendCommand, THE SendCommand SHALL retain all existing send states: `form`, `zipping`, `starting`, `waiting`, `transferring`, `done`, and `error`.
3. THE `useTransfer` hook SHALL NOT be dead code after this refactor; it SHALL be the single source of truth for transfer state in the SendCommand.
4. THE `useTransfer` hook is a React hook and SHALL only be used in view-mode commands; it SHALL NOT be used in no-view commands such as the QuickSendCommand.

---

### Requirement 3: Replace Receive Input List with a Form

**User Story:** As a user entering a code phrase to receive files, I want a focused text input to appear immediately, so that I can start typing the code phrase without extra navigation.

#### Acceptance Criteria

1. WHEN the ReceiveCommand opens in the `input` state, THE ReceiveCommand SHALL render a `Form` component with a single text field for the code phrase instead of a `List` component.
2. THE code phrase text field SHALL have `autoFocus` enabled so the cursor is placed in the field immediately on open.
3. WHEN the user submits the form with a non-empty code phrase, THE ReceiveCommand SHALL start the receive transfer using the submitted phrase.
4. WHERE clipboard detection has found a valid CodePhrase, THE ReceiveCommand SHALL pre-populate the code phrase field with the detected value.
5. THE ReceiveCommand SHALL retain the ability to start a receive via deep link argument, bypassing the form entirely.

---

### Requirement 4: Notify User on Send Completion via HUD

**User Story:** As a sender who has switched away from Raycast during a transfer, I want a notification when the transfer completes, so that I know the file was delivered without having to switch back to check.

#### Acceptance Criteria

1. WHEN a send transfer completes successfully, THE Extension SHALL ALWAYS display a HUD notification indicating the transfer is complete, regardless of whether the user is currently focused on the SendCommand view.
2. WHEN a send transfer fails, THE Extension SHALL ALWAYS display a HUD notification indicating the failure, regardless of focus state.
3. WHEN a send transfer completes successfully, THE Extension SHALL show the filename or file count in the HUD completion notification.

---

### Requirement 5: Add "Reveal in Finder" Action to Receive Done Screen

**User Story:** As a receiver, I want to reveal the specific received file in Finder, so that I can immediately locate it without having to browse the download folder.

#### Acceptance Criteria

1. WHEN the receive done screen is shown and at least one received file path is known, THE ReceiveCommand SHALL provide a "Reveal in Finder" action that selects the first received file in a Finder window.
2. THE ReceiveCommand SHALL retain the existing "Open Download Folder" action alongside the new "Reveal in Finder" action.
3. IF no received file paths are available, THEN THE ReceiveCommand SHALL NOT show the "Reveal in Finder" action.

---

### Requirement 6: Date Grouping in Transfer History

**User Story:** As a user reviewing my transfer history, I want records grouped by date, so that I can quickly find transfers from today, yesterday, or earlier.

#### Acceptance Criteria

1. THE HistoryCommand SHALL group TransferRecords into sections labelled "Today", "Yesterday", and "Earlier".
2. WHEN a TransferRecord's timestamp falls on the current calendar day, THE HistoryCommand SHALL place it in the "Today" section.
3. WHEN a TransferRecord's timestamp falls on the previous calendar day, THE HistoryCommand SHALL place it in the "Yesterday" section.
4. WHEN a TransferRecord's timestamp is older than yesterday, THE HistoryCommand SHALL place it in the "Earlier" section.
5. WHEN a date section contains no records, THE HistoryCommand SHALL NOT render that section.
6. THE HistoryCommand SHALL determine calendar day boundaries using the system local timezone via JavaScript's `new Date()` local date methods.

---

### Requirement 7: Add Timestamp and File Count Accessories to History List Items

**User Story:** As a user browsing transfer history, I want to see the transfer time and number of files at a glance, so that I can identify records without opening the detail panel.

#### Acceptance Criteria

1. THE HistoryCommand SHALL display a timestamp accessory on each history list item using `List.Item.Accessory` with the `date` property set to a `Date` object, so that Raycast handles formatting automatically with relative time display.
2. THE HistoryCommand SHALL display a file count accessory on each history list item when the TransferRecord contains more than one file.
3. THE HistoryCommand SHALL NOT render empty `accessories={[]}` on list items.

---

### Requirement 8: Write History Record for Cancelled Transfers

**User Story:** As a user, I want cancelled transfers to appear in my history, so that I have a complete record of all transfer attempts.

#### Acceptance Criteria

1. WHEN a user cancels a send transfer after a CodePhrase has been generated (i.e., during the `waiting` or `transferring` state), THE Extension SHALL write a TransferRecord with `status: "cancelled"` to history.
2. WHEN a user cancels a receive transfer while it is in the `receiving` state (transfer is in progress), THE Extension SHALL write a TransferRecord with `status: "cancelled"` to history.
3. WHEN a transfer is cancelled before a CodePhrase is generated (i.e., during the `starting` or `zipping` state on send), THE Extension SHALL NOT write a history record.
4. WHEN a user cancels a receive transfer while it is in the `input` state (before the user has started a transfer), THE Extension SHALL NOT write a history record.

---

### Requirement 9: Capture and Display File Size in History

**User Story:** As a user reviewing history, I want to see the size of transferred files, so that I can understand how much data was moved.

#### Acceptance Criteria

1. WHEN a send transfer completes, THE Extension SHALL determine file size by calling `fs.statSync` on the original source files before sending and storing the total sum of all file sizes in `TransferRecord.size`. THE size SHALL reflect the sum of original file sizes, not the size of any intermediate zip archive created during the zipping stage. WHEN a source path is a directory, THE Extension SHALL recursively sum the sizes of all files within the directory; if recursive traversal fails for any reason, THE Extension SHALL leave `TransferRecord.size` as `undefined` for that transfer.
2. WHEN a receive transfer completes, THE Extension SHALL determine file size by calling `fs.statSync` on the received files after croc exits and storing the total sum of all received file sizes in `TransferRecord.size`.
3. WHEN multiple files are transferred, THE Extension SHALL store the sum of all individual file sizes in `TransferRecord.size`.
4. IF `fs.statSync` fails for any reason, THEN THE Extension SHALL leave `TransferRecord.size` as `undefined` and SHALL NOT show a size field in the UI for that record.
5. WHEN a TransferRecord has a defined `size` value, THE HistoryCommand detail panel SHALL display the file size in a human-readable format (e.g., "4.2 MB").
6. WHEN a TransferRecord has no `size` value, THE HistoryCommand detail panel SHALL NOT display a size field.

---

### Requirement 10: Fix Download Directory Preference — Remove Forced /Share Subdirectory

**User Story:** As a user who has configured a custom download directory, I want received files to be saved exactly where I specified, so that the preference behaves as described.

#### Acceptance Criteria

1. THE ReceiveCommand SHALL save received files directly into the directory specified by the `downloadDirectory` preference, without appending any subdirectory path.
2. THE `downloadDirectory` preference description in `package.json` SHALL accurately describe where files are saved.
3. WHEN the `downloadDirectory` preference is empty or unset, THE ReceiveCommand SHALL default to `~/Downloads`.

---

### Requirement 11: Add Quick Send No-View Command

**User Story:** As a power user, I want to send Finder-selected files immediately from Raycast without opening a UI window, so that I can initiate a transfer as fast as possible.

#### Acceptance Criteria

1. THE Extension SHALL provide a `QuickSendCommand` registered in `package.json` with `"mode": "no-view"`.
2. WHEN the QuickSendCommand is invoked and one or more files are selected in Finder, THE QuickSendCommand SHALL begin sending those files immediately using croc.
3. WHEN the CodePhrase is generated, THE QuickSendCommand SHALL copy it to the clipboard and display a HUD notification showing the phrase and the number of files being sent (e.g., "3 files ready — phrase copied").
4. WHEN a single file is being sent, THE QuickSendCommand SHALL display a HUD notification showing the filename and the phrase (e.g., "photo.jpg ready — phrase copied").
5. WHEN the transfer completes successfully, THE QuickSendCommand SHALL display a HUD notification confirming completion.
6. WHEN the transfer fails, THE QuickSendCommand SHALL display a HUD notification with the error message.
7. WHEN the QuickSendCommand is invoked and no files are selected in Finder, THE QuickSendCommand SHALL display a HUD notification instructing the user to select files in Finder first.
8. IF the CrocBinary is not found, THEN THE QuickSendCommand SHALL display a HUD notification telling the user to install croc.
9. WHEN the QuickSendCommand completes or fails, THE Extension SHALL write a TransferRecord to history.
10. THE QuickSendCommand SHALL manage its own process lifecycle directly using `spawnCrocSend` from `src/utils/process.ts`, without using the `useTransfer` hook, because `useTransfer` is a React hook and cannot be used in no-view mode.
11. THE QuickSendCommand SHALL NOT provide a cancel mechanism; once started, the transfer runs to completion or failure. This is a known limitation of no-view mode commands.
12. WHEN Raycast terminates the no-view command process before the transfer completes, THE Extension SHALL attempt to write a TransferRecord with `status: "failed"` to history (if a CodePhrase had already been generated) using a `process.on('exit')` or `process.on('SIGTERM')` handler. This is best-effort: if Raycast sends SIGKILL, the record may not be written. If no CodePhrase had been generated yet, no record SHALL be written.
13. THE QuickSendCommand SHALL use a write-ahead history pattern: upon CodePhrase generation it SHALL write a TransferRecord with `status: "in_progress"` and a `sessionId` identifying the current process. On any subsequent command open, THE Extension SHALL scan history for `"in_progress"` records whose `sessionId` does not match the current session and mark them `"failed"`, handling the case where the process was killed before cleanup could run.

---

### Requirement 12: Add Refresh Action to InstallGuide and Clear Path Cache on Command Open

**User Story:** As a user who installs croc while Raycast is running, I want the extension to detect the new installation without restarting Raycast, so that I can use the extension immediately after installing croc.

#### Acceptance Criteria

1. WHEN any command opens, THE Extension SHALL clear the `getCrocPath` module-level cache so that a freshly installed croc binary is detected without restarting Raycast.
2. THE InstallGuide SHALL provide a "Refresh" action as an additional explicit trigger for users who remain on the InstallGuide screen after installing croc — it clears the `getCrocPath` module-level cache and re-checks for the CrocBinary.
3. WHEN the "Refresh" action is triggered and the CrocBinary is now found, THE InstallGuide SHALL be replaced by the normal command UI.
4. WHEN the "Refresh" action is triggered and the CrocBinary is still not found, THE InstallGuide SHALL remain visible and display a toast indicating croc was not found.

---

### Requirement 13: Make useCrocCheck Asynchronous

**User Story:** As a developer, I want `useCrocCheck` to resolve the croc path asynchronously, so that the render thread is not blocked during binary detection.

#### Acceptance Criteria

1. THE `useCrocCheck` hook SHALL resolve the CrocBinary path using an async operation inside `useEffect` rather than calling `getCrocPath()` (which uses `execSync`) synchronously on the render thread.
2. WHILE the async check is in progress, THE `useCrocCheck` hook SHALL return `isChecking: true`.
3. WHEN the async check completes, THE `useCrocCheck` hook SHALL return the resolved path and version without blocking the UI.

---

### Requirement 14: Clean Up buildCrocArgs Receive Interface

**User Story:** As a developer, I want `buildCrocArgs` to have a clean interface for the receive subcommand, so that callers are not misled by a parameter that has no effect.

#### Acceptance Criteria

1. THE `buildCrocArgs` function SHALL NOT accept an `extra` parameter for the `"receive"` subcommand, or SHALL clearly document that the parameter is unused for receive and ignore it.
2. ALL call sites that pass an `extra` argument to `buildCrocArgs` for the receive subcommand SHALL be updated to reflect the corrected interface.

---

### Requirement 15: InstallGuide Action to Install croc

**User Story:** As a user who needs to install croc, I want a one-click action that installs croc without requiring me to manually open a terminal.

#### Acceptance Criteria

1. THE InstallGuide SHALL provide an action labelled "Install with Homebrew" that installs croc using the recommended approach.
2. THE recommended implementation SHALL use asynchronous `execFile` or `spawn` (NOT `execSync`, which would block the Node.js event loop and freeze Raycast) to run `brew install croc` in the background, showing a `Toast.Style.Animated` during installation and a success or failure Toast upon completion. Upon successful installation, the action SHALL automatically clear the `getCrocPath` cache and re-check for the CrocBinary (per Requirement 12).
3. WHERE the background execution approach is not feasible, THE InstallGuide MAY fall back to opening a terminal using `open -a Terminal` with the install command; this uses the system default terminal and is not guaranteed to work on all configurations.
4. THE InstallGuide SHALL retain the existing "Copy Install Command" and "View croc on GitHub" actions alongside the new action.

---

### Requirement 16: Index Filenames in History Search

**User Story:** As a user searching transfer history, I want to search by filename, so that I can find a specific transfer without remembering the code phrase.

#### Acceptance Criteria

1. THE HistoryCommand SHALL pass the basenames of all files in a TransferRecord as `keywords` to the `List.Item` component for that record.
2. WHEN a user types a filename fragment into the history search bar, THE HistoryCommand SHALL surface matching records even if the code phrase does not match the query.

---

## Non-Functional Requirements

### NFR 1: Error Handling

**User Story:** As a user, I want the extension to handle unexpected errors gracefully, so that I always know when something has gone wrong.

#### Acceptance Criteria

1. WHEN a croc process exits unexpectedly (non-zero exit code without a user-initiated cancel), THE Extension SHALL display a `Toast.Style.Failure` notification with a descriptive error message.
2. WHEN a croc process exits unexpectedly, THE Extension SHALL write a TransferRecord with `status: "failed"` to history.
3. WHEN the PTYWrapper fails to start (e.g., Python is not found at `/usr/bin/python3`, or a permission error occurs), THE Extension SHALL display a `Toast.Style.Failure` notification with a descriptive error message and SHALL NOT leave the user in an unresponsive state.

---

### NFR 2: Backward Compatibility

**User Story:** As an existing user, I want my existing transfer history and downloaded files to remain accessible after the update, so that I do not lose data.

#### Acceptance Criteria

1. THE Extension SHALL NOT migrate or modify existing TransferRecords that contain old timestamp-based filenames; those records SHALL remain in history as-is.
2. THE removal of the forced `/Share` subdirectory (Requirement 10) SHALL only affect new receive operations; existing files already saved in a `/Share` subdirectory SHALL be unaffected.

---

### NFR 3: No New External Dependencies

**User Story:** As a maintainer, I want the extension to remain dependency-light, so that it is easy to audit and publish.

#### Acceptance Criteria

1. ALL improvements described in this document SHALL be implemented using existing dependencies only: `@raycast/api`, `@raycast/utils`, and Node.js built-ins.
2. THE Extension SHALL NOT introduce any new entries in the `dependencies` or `devDependencies` sections of `package.json` to implement these requirements.
