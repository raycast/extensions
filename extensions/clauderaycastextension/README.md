# Ask Claude Desktop — Raycast Extension

Type a prompt in Raycast, press **Tab**, and the prompt is sent straight to the **Claude desktop app**: the app is launched (or focused), your text is pasted into a new chat, and submitted so Claude starts answering immediately.

Works on **macOS and Windows** from a single codebase.

## Requirements

- [Raycast](https://raycast.com) (macOS, or Raycast for Windows)
- [Claude Desktop app](https://claude.ai/download) installed and signed in
- Node.js 20+ and npm (only for installing/building the extension)

## Install

```sh
cd clauderaycastextension
npm install
npm run dev
```

`npm run dev` imports the extension into Raycast in development mode. After it shows up in Raycast you can stop the dev server (Ctrl+C) — the extension stays installed as a local dev extension. Use the **same steps on the other OS** (copy this folder or clone it there).

## Make Tab work (one-time setup)

The Tab behavior comes from Raycast's **fallback commands**:

1. Open Raycast and run **"Manage Fallback Commands"**.
2. Enable **Ask Claude** and move it to the **top** of the list.
3. Done. Now in Raycast root search: **type your prompt → press Tab** → Claude opens with your prompt submitted.

Notes:

- Pressing Tab on a typed query triggers your **first** fallback command, so Ask Claude must be at the top (above Quick AI / Search Google).
- On Raycast versions where Tab doesn't trigger fallbacks, type your prompt, press ↓ to the "Use … with" section and hit Enter on **Ask Claude**.
- Alternative flow that always works: search for the **Ask Claude** command itself, press **Tab** (enters its Prompt argument), type your prompt, press **Enter**.

## Preferences

Open the command's preferences in Raycast (`Cmd/Ctrl + ,` → Extensions → Ask Claude Desktop):

| Preference | Default | What it does |
| --- | --- | --- |
| Submit automatically | on | Presses Enter once the chat opens; turn off to review the prefilled prompt before sending |
| Restore previous clipboard text | on | Puts your old clipboard text back afterwards |
| Submit Delay (ms) | 1500 | How long to wait for the chat to open before pressing Enter; raise it if a cold start opens the chat without sending |
| App Name (macOS) | Claude | Change only if your Claude app has a different name |

## How it works

The extension drives Claude through its **`claude://` deep link** rather than synthesizing a new-chat keyboard shortcut:

1. Builds `claude://claude.ai/new?q=<your prompt>` and copies the prompt to the clipboard (then restores the old clipboard afterwards).
2. **Opens the link** — `open` on macOS, `Start-Process` on Windows. The `claude://` scheme is registered by every Claude installer, so this **launches Claude if it's closed, focuses it if it's open**, and routes straight to a new chat. No exe path or AppUserModelID needed (this works whether Claude is the Microsoft Store build or the legacy installer).
3. **Restores + foregrounds** the window (Win32 `ShowWindow` + `SetForegroundWindow` on Windows, System Events on macOS) so the next keystroke lands.
4. **Presses Enter** to submit (only if *Submit automatically* is on).

The prompt travels **inside the URL** (`?q=`), so — unlike a paste — it doesn't depend on keystroke timing and is reliable even on a cold start. Prompts longer than ~1000 characters are pasted from the clipboard instead (the deep link truncates very long `q` values).

### Why it always lands in a chat, never Cowork

The `/new` route is Claude's **chat** surface. Internally the app classifies `/`, `/new`, `/chat`, and `/chats` as *chat*, completely separate from the `cowork` and `code` routes. Because the extension navigates directly to `/new`, the prompt always opens in a regular **chat** — it can't land in Cowork or Claude Code, regardless of which mode Claude was last showing. (Verified against Claude Desktop `1.12603.x`, and confirmed live.)

## Troubleshooting

- **macOS: nothing gets submitted** — Raycast needs Accessibility access to press Enter: System Settings → Privacy & Security → Accessibility → enable Raycast. (The chat still opens with your prompt prefilled; you can just press Enter yourself.)
- **Chat opens but the prompt isn't sent (cold start)** — Claude was still loading when Enter fired; raise the **Submit Delay** (e.g. 2500–3500 ms).
- **Windows: "Claude Desktop didn't open a window in time"** — a cold start of the Store app was still loading; raise the Submit Delay and try again.
- **Windows: "Couldn't bring Claude to the foreground"** — the screen was locked/asleep (synthetic input can't reach a locked desktop). Unlock and retry.
- **It opens a chat but I wanted to keep typing** — turn off *Submit automatically*; the chat opens with your prompt prefilled and waits for you to press Enter.
- **Windows: keystrokes go nowhere when Claude runs as Administrator** — run Claude (or Raycast) non-elevated; Windows blocks synthetic input across elevation levels.
