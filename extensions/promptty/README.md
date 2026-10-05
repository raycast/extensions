# Promptty for Raycast

Search your local Promptty library, preview a saved prompt, and paste or copy it without opening Promptty.

## Requirements

- macOS
- Raycast
- Promptty for Mac 1.4.0 or later

If the extension detects an export from an older Promptty version, it blocks access and links directly to the App Store update. Open Promptty for Mac once after installing or updating it. Promptty creates a local, read-only integration snapshot that remains available while the app is closed.

## Use

1. Run **Search Promptty** in Raycast.
2. Search titles, prompt content, or categories.
3. Press Return to **Paste Prompt** into the previously active app.
4. Press `⌘ Return` to **Copy Prompt**.

The detail pane shows the full prompt, category, and its most relevant activity date.

## Local-only privacy

Promptty for Raycast:

- reads only Promptty’s versioned local JSON export;
- does not read SwiftData, SQLite, CloudKit, or the Promptty web API;
- does not create, edit, delete, or favorite prompts;
- does not update Promptty usage counters;
- makes no network requests and includes no analytics or crash-reporting SDK;
- never logs prompt content or search queries.

Raycast keeps a bounded last-known-good copy in its local extension cache so prompts remain available if the latest export is temporarily malformed or unavailable.

Default snapshot:

`~/Library/Group Containers/group.codes.kos.Promptty/Library/Application Support/RaycastIntegration/prompts-v1.json`

## Troubleshooting access

If the snapshot is missing, open Promptty for Mac once and return to Raycast.

If Raycast reports a permission error, use **Open Command Preferences** from the empty state (or open the **Search Promptty** command preferences), then choose **Snapshot File** and select Promptty’s `prompts-v1.json`.

The preference is an explicit fallback only. The extension never scans broad filesystem locations and never writes into Promptty’s App Group.
