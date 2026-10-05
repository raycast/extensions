# Tuple for Raycast

Drive your [Tuple](https://tuple.app) pair programming sessions from Raycast. This
extension wraps the local `tuple` command-line tool.

## Requirements

- The **Tuple desktop app** must be installed and running. The extension talks to the
  running app through the `tuple` CLI.
- The **`tuple` CLI** ships inside the Tuple app. Enabling it under Settings → Integrations
  symlinks it to `/usr/local/bin/tuple`; the extension also falls back to the copy bundled in
  `Tuple.app` if you haven't done that. If yours lives elsewhere, set the **Tuple CLI Path**
  preference.
- **Capture** must be enabled in Tuple (Settings → Capture) to record new calls. **Search Calls**,
  summaries, and AI tools can still read existing stored Capture when live Capture is disabled.

## Commands

- **Search Contacts** — Browse your contacts and other connected machines with live status.
  Start a call, toggle a contact favorite, or copy an email or machine ID. Everyone stays listed, but the call
  action matches what Tuple will accept: start a call with someone online, join the call
  someone's already on while it has room, and neither for someone offline or on a full call.
  Raycast reports success only after the call connects, and joins switch cleanly from your current call.
  Idle machines can be called directly; a machine already in a call stays visible without an invalid call action.
- **Active Call** — A menu-bar command showing your current call. Mute/unmute, start or stop
  Capture, add a person, copy an AI context prompt, or leave the call — without leaving the menu bar.
- **Toggle Mute** — Mute or unmute your microphone in the active call. Bind it to a global
  hotkey for hands-free control.
- **End Call** — Hang up the active call. Also hotkey-friendly.
- **Search Calls** — Browse recent calls and full-text-search what was said. From any call
  you can read the complete Capture, **Summarize with AI**, **Generate Title & Summary…**
  (drafted from captured context, editable before it’s saved), copy an AI context prompt, export
  it, or delete it.
- **Search Rooms** — Browse your personal and team rooms, see who’s currently in each, and
  join one, copy its link, or open it in the browser. The personal section shows only your
  primary personal room, identified from the CLI's creation timestamp.
- **Join Personal Room** — Jump straight into your primary personal room.
- **Generate Title & Summary** — Draft a title and summary for your most recent call with AI and save
  them immediately, with no review step (the in-call **Generate Title & Summary…** action is the
  reviewable version). Bind it to a hotkey, or trigger it from a deeplink (pass a `callId` in the launch
  context to target a specific call). Requires Raycast Pro.

## Raycast AI

Ask Raycast AI about your calls in **AI Chat** (type `@Tuple`) or the "Ask Tuple" root-search
item — for example, "when did I last talk with Sage?" or "action items from my recent calls".
The AI uses these read-only tools to answer:

- **List Recent Calls**, **Search Capture**, **Read Capture**, **List Contacts**, **List Active Calls**, **Get Active Call**, **List Rooms**

"Summarize with AI" (on any call) and the AI tools use Raycast's built-in AI and require
**Raycast Pro**. Your captured context is sent to Raycast's AI service; the extension does not
send it elsewhere. Without Pro, use **Copy AI Context** (on any recorded call, or the
active call from the menu bar) to bring a call into any assistant you like.

## Preferences

- **Tuple CLI Path** — Path to the `tuple` executable. Leave blank to auto-detect
  (`/usr/local/bin/tuple`, then the copy bundled in `Tuple.app`); set it only if your CLI
  lives elsewhere.
- **Capture Export Folder** — Where Capture artifacts are saved. Defaults to your Downloads folder.

## CLI compatibility

This extension uses Tuple's canonical Call, Capture, and Connect commands and does not support
legacy CLI command paths or error adapters. Normal auto-detection uses the production Tuple app;
set **Tuple CLI Path** when validating another signed Tuple build.

Capture exports are complete JSONL artifacts (conversation, events, and shared content)
in the configured folder. Deleting a Capture removes its conversation, events, content,
and retained media. Existing stored data stays in Tuple; this extension does not migrate it.
