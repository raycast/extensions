# Proton Drive for Raycast

Search, open, download and upload Proton Drive files from Raycast, using the official
[Proton Drive CLI](https://proton.me/download/drive/cli/index.html).

## Setup

1. Install the CLI (single binary, no installer):

   ```bash
   curl -fL -o ~/.local/bin/proton-drive https://proton.me/download/drive/cli/0.8.0/darwin-arm64/proton-drive && chmod +x ~/.local/bin/proton-drive
   ```

2. Sign in once (opens your browser; the session is stored in the macOS Keychain):

   ```bash
   proton-drive auth login
   ```

3. Run the extension in development mode:

   ```bash
   npm install && npm run dev
   ```

The CLI is auto-detected in `~/.local/bin`, `/opt/homebrew/bin` and `/usr/local/bin`; set another
path in the extension preferences if needed.

## Commands

Named like the Proton Pass and Proton Mail extensions: an action as title, "Proton Drive" as subtitle.

| Command | What it does |
| --- | --- |
| **Search Files** | Opens on your Drive's root; navigate folder by folder with a detail panel on the right. Typing filters the current folder and, if the search index exists, the whole Drive. Folders already visited show instantly from cache. |
| **Upload Files** | Uploads the Finder selection to a folder you pick (existing files are renamed, folders merged). |
| **Login to Proton Drive** | Checks the CLI session; logs in through the browser (Terminal fallback) or logs out. |
| **Refresh Search Index** | Rebuilds the index. Runs daily in the background only if enabled in preferences. |

Actions on a file or folder: **Open** (downloads to a cache, then opens), **Download** (⌘D, to the
download directory, never overwrites), **Show Enclosing Folder**, **Copy Public Link** (reuses an
existing link, or asks before creating one), **Copy Drive Path**, **Copy Name**.

Preferences: CLI Path, Primary Action (Open or Download on Enter), Download Directory, and
Search Index (background refresh, off by default).

## How the index works

The CLI has no search and no recursive listing, and each call takes a few seconds (it signs in and
decrypts on every run). The extension therefore crawls the Drive once, folder by folder, in parallel,
and keeps the result in Raycast's support directory.

- Nothing is indexed until you ask for it (Build Search Index, ⌘⇧R in Search Files, or the preference).
- On a large Drive the first crawl takes a long time. It is **resumable**: progress is saved every
  30 seconds, and the next run (opening Search Files, or the background refresh) continues from there.
- During the first crawl, partial results are already searchable.
- Afterwards, the previous complete index is kept until a new crawl finishes.
- Opened files are kept for 24 hours, so reopening an unchanged file is instant.

Only `/my-files` is indexed; "Shared with me", Photos and the trash are not.

## Privacy and security

- The extension never sees your password: the CLI signs in through the browser and keeps its
  session in the macOS Keychain.
- Your Drive is end-to-end encrypted, but what the extension keeps locally is not: the search
  index and Raycast's folder cache contain file and folder **names** in clear, and files opened
  from Raycast are kept decrypted for 24 hours. The last 20 CLI errors are kept in a local log
  to diagnose failures. All of it is readable by your macOS user only;
  FileVault protects it at rest.
- Downloaded files get the macOS quarantine attribute, so Gatekeeper checks apps and scripts
  from your Drive before they run, as it does for browser downloads.
- Creating a public link always asks for confirmation first.
- Logging out (Login to Proton Drive → Log Out) deletes all of it: index, cached listings and
  opened files. If the CLI session ends another way (`proton-drive auth logout`, expiry), the
  extension deletes the same data as soon as the CLI reports it, and shows nothing from the Drive.

## Credits

Unofficial extension, not affiliated with or endorsed by Proton AG. The Proton Drive logo comes from
Proton's [media kit](https://proton.me/media/kit). Proton Drive: [proton.me/drive](https://proton.me/drive).
