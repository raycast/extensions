# Tuple for Raycast

Drive your [Tuple](https://tuple.app) pair programming sessions from Raycast. This
extension wraps the local `tuple` command-line tool.

## Requirements

- The **Tuple desktop app** must be installed and running. The extension talks to the
  running app through the `tuple` CLI.
- The **`tuple` CLI** must be installed (it ships with the Tuple app, under Settings →
  Integrations). The extension expects it at `/usr/local/bin/tuple` by default; if yours
  lives elsewhere, set the **Tuple CLI Path** preference.
- Transcript features (**Search Calls**, **Summarize with AI**, and the AI tools) require
  **Transcription** to be enabled in Tuple (Settings → Transcription). When transcription is
  not yet set up, the extension links you straight to that settings pane.

## Commands

- **Search Contacts** — Browse your contacts with online status, favorites, and recents.
  Start a call, toggle a favorite, or copy an email.
- **Active Call** — A menu-bar command showing your current call. Mute/unmute, start or stop
  transcription, add a person, copy an AI context prompt, or hang up — without leaving the menu bar.
- **Toggle Mute** — Mute or unmute your microphone in the active call. Bind it to a global
  hotkey for hands-free control.
- **End Call** — Hang up the active call. Also hotkey-friendly.
- **Search Calls** — Browse recent calls and full-text-search what was said. From any call
  you can read the transcript, **Summarize with AI**, **Generate Title & Summary…**
  (drafted from the transcript, editable before it’s saved), copy an AI context prompt, export
  it, or delete it.
- **Search Rooms** — Browse your personal and team rooms, see who’s currently in each, and
  join one, copy its link, or open it in the browser.
- **Join Personal Room** — Jump straight into your personal room.
- **Generate Title & Summary** — Draft a title and summary for your most recent call with AI and save
  them immediately, with no review step (the in-call **Generate Title & Summary…** action is the
  reviewable version). Bind it to a hotkey, or trigger it from a deeplink (pass a `callId` in the launch
  context to target a specific call). Requires Raycast Pro.

## Raycast AI

Ask Raycast AI about your calls in **AI Chat** (type `@Tuple`) or the "Ask Tuple" root-search
item — for example, "when did I last talk with Sage?" or "action items from my recent calls".
The AI uses these read-only tools to answer:

- **List Recent Calls**, **Search Transcripts**, **Read Transcript**, **List Contacts**, **Get Active Call**, **List Rooms**

"Summarize with AI" (on any call) and the AI tools use Raycast's built-in AI and require
**Raycast Pro**. Your transcripts stay within Raycast AI — nothing leaves your machine
beyond Raycast's own service. Without Pro, use **Copy AI Context** (on any recorded call, or the
active call from the menu bar) to bring a call into any assistant you like.

## Preferences

- **Tuple CLI Path** — Path to the `tuple` executable. Leave blank to auto-detect
  (`/opt/homebrew/bin` then `/usr/local/bin`); set it only if you installed the CLI elsewhere.
- **Transcript Export Folder** — Where exported transcripts are saved. Defaults to your Downloads folder.
