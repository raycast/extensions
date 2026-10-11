<img src="media/banner.png" alt="FSearch" width="100%">

# FSearch for Raycast

Find any file on your Mac by name or by what's inside it, without leaving Raycast. Built on [FSearch](https://github.com/noahdunnagan/fsearch), which indexes the whole disk and answers in about a millisecond.

## Commands

**Search Files** finds files and folders anywhere on your Mac. Words match loosely, and a typo in a longer word still finds the file (`mian.rs` finds `main.rs`). Choose a kind from the menu in the search bar — Folders, Applications, Images, Documents, Code, and more — or narrow the search as you type:

| Type                                | To find                                         |
| ----------------------------------- | ----------------------------------------------- |
| `in:~/Developer`                    | Items inside a folder                           |
| `ext:pdf`                           | Items with a file extension                     |
| `size:>5mb`                         | Files larger than 5 MB                          |
| `mtime:<7d`                         | Items modified in the last 7 days               |
| `'exact`, `^start`, `end$`, `!skip` | Exact words, prefixes, suffixes, and exclusions |

Press Command-D to show details with a preview, Command-Y for Quick Look, and Command-F to search inside the selected folder.

**Search File Contents** finds text inside your files. Choose Text, Regular Expression, or Definition from the menu in the search bar; Definition finds where a function or type is declared. Searches ignore case unless you type an uppercase letter. Add `ext:`, `type:`, or `in:` to search fewer files. To open each match at its line, choose an editor in the command's settings.

## Raycast AI

Mention `@fsearch` in Raycast AI to find files by name or search inside them:

- “Find PDFs in my Downloads folder modified in the last seven days.”
- “Find videos larger than 1 GB.”
- “Which files in ~/Developer/my-app contain TODO?”
- “Where is parseResponse defined in ~/Developer/my-app?”

The AI tools support the same file kinds and search modes as the commands. They return file paths, metadata, or matching lines without changing files. Content searches return up to five lines per file and report when the search stopped early or the content index is still building. FSearch must be installed as described below; the tools use the extension's FSearch Location setting.

## Install

1. Install FSearch:

   ```sh
   git clone https://github.com/noahdunnagan/fsearch && cd fsearch
   cargo build --release && ./target/release/fsearch install
   ```

2. Build the extension:

   ```sh
   npm install && npm run dev
   ```

The first search starts the FSearch daemon, which scans the disk once in about 20 seconds. For the daemon to search protected folders like Mail and Messages, give it Full Disk Access in System Settings > Privacy & Security, or start it from a terminal that has access.
