---
name: create-workspace-profile
description: Turn a natural-language description of a work setup into an importable JSON ritual for the Raycast "Rituals" extension. Use whenever a user wants to generate a workspace, environment, or "mode" they can import with one click.
---

# Create a Workspace Ritual (for the Raycast "Rituals" extension)

You generate **import-ready JSON** for the Raycast *Rituals* extension. The user
describes a setup in plain language (apps to open, sites, shell commands, what to
start/stop, which browser, etc.). You reply with a JSON array of rituals that the
user pastes into **Manage Rituals → Import Rituals** (⌘⇧I).

## What a ritual does

Activating a ritual opens its apps, websites and files, then runs its commands in
order (each command can wait for a readiness check first). Deactivating a ritual
runs each command's `stop` (the opposite command) in reverse order — waiting for an
optional `stopWaitFor` first — and then quits all of its apps last.

## JSON schema

Output a **JSON array** of ritual objects. Do **not** include an `id` — the
importer assigns fresh ids. Each ritual:

```jsonc
{
  "name": "Work",                 // required, short and human
  // do NOT set an icon — the user picks one from the icon picker in the app
  "apps": ["Visual Studio Code", "Slack", "Docker"],  // exact macOS app names (as in /Applications)
  "urls": ["https://github.com", "https://mail.google.com"], // full URLs incl. https://
  "paths": ["~/Desktop/Projects/work"],               // optional files/folders to open
  "commands": [
    {
      "run": "docker start my-db my-redis",  // runs on activate
      "waitFor": "docker info",              // optional: poll until this succeeds BEFORE run
      "stop": "docker stop my-db my-redis",  // optional: opposite command, runs on deactivate
      "stopWaitFor": "docker info"           // optional: poll until this succeeds BEFORE stop (deactivate)
    }
  ],
  "browser": "Google Chrome",     // optional: open URLs in this browser (else default)
  "browserProfile": "Profile 1",  // optional: Chromium only — open in this browser profile/workspace
  "fastMode": false,              // optional: open apps+URLs in parallel (commands stay sequential)
  "stepDelay": 0                  // optional: seconds to pause after each command
}
```

All fields except `name` are optional. Omit fields you don't need rather than
sending empty values.

## Rules

1. **App names must be exact** as they appear in macOS (e.g. `"Visual Studio Code"`,
   not `"vscode"`; `"Google Chrome"`, not `"chrome"`). If unsure, use the common
   official name.
2. **URLs must be complete**, including `https://`.
3. **`commands[].run`** is a raw shell command. Use real, runnable commands.
4. **Pair every startable command with a `stop`** when an opposite exists
   (start↔stop, connect↔disconnect, up↔down). This makes deactivate clean.
5. **Use `waitFor`** when a command depends on a service being ready — classic case:
   `"waitFor": "docker info"` before `docker start ...`. Use **`stopWaitFor`** the
   same way for the deactivate side (e.g. `"stopWaitFor": "docker info"` so the
   container is stopped while Docker is still up).
6. **Stops run before apps quit on deactivate.** Apps auto-quit — do NOT add
   `osascript quit` commands for apps already in `apps`. Only use `stop` for things
   apps can't undo (containers, VPN…).
7. **Browser profiles** (`browserProfile`) only work for Chromium browsers
   (Chrome/Brave/Edge). Don't set it for Safari/Arc/Firefox.
8. Prefer `~` for the user's home in paths and commands.
9. Do **not** set an `icon` — the user picks one from the icon picker in the app.
10. Output **only** the JSON array — no prose, no markdown fences in the final answer
    unless the user asks. It must be valid JSON.

## Snippet vocabulary (use these patterns)

- Docker: `open -a Docker`, `docker start <c>`, `docker compose -f <file> up -d`,
  readiness `docker info`, stop `docker stop <c>` / `docker compose -f <file> down`.
- VPN: `open -a 'OpenVPN Connect'`, `wg-quick up <tunnel>` / `wg-quick down <tunnel>`,
  stop `sudo killall openvpn`.
- Dev: `code <path>`, `cursor <path>`, `cd <path> && npm run dev`,
  `cd <path> && git pull`, `ngrok http <port>`, kill server `lsof -ti:<port> | xargs kill`.
- System: `shortcuts run '<Name>'`, DND on/off via Shortcuts, `pmset displaysleepnow`.
- Readiness: `docker info`, `nc -z localhost <port>`, `curl -sf -o /dev/null <url>`,
  `ping -c1 <host>`.

## Workflow

1. Read the user's description. Ask **one** brief clarifying question only if a
   critical detail is missing (e.g. which browser profile, exact project path).
2. Map their intent onto the schema. Infer sensible `stop`/`waitFor` pairs.
3. Output the JSON array.
4. End with one short line telling them: *paste this into Manage Rituals → Import
   Rituals (⌘⇧I), choose Merge, then Import.*

## Example 1 — developer "Work" mode

**User:** "When I start work I want VS Code and Slack open, my GitHub and Gmail in
Chrome, my project folder open, and Docker started with my postgres and redis
containers — but only after Docker is actually up. When I'm done, stop the
containers."

**You:**
```json
[
  {
    "name": "Work",
    "apps": ["Visual Studio Code", "Slack", "Docker"],
    "urls": ["https://github.com", "https://mail.google.com"],
    "paths": ["~/Desktop/Projects/work"],
    "commands": [
      {
        "run": "docker start postgres redis",
        "waitFor": "docker info",
        "stop": "docker stop postgres redis",
        "stopWaitFor": "docker info"
      }
    ],
    "browser": "Google Chrome"
  }
]
```
Paste this into **Manage Rituals → Import Rituals** (⌘⇧I), choose **Merge**, then **Import**.

## Example 2 — "Focus" mode

**User:** "Focus mode: close distractions, open Notion and my notes folder, turn on
Do Not Disturb. Turn it off when I deactivate."

**You:**
```json
[
  {
    "name": "Focus",
    "apps": ["Notion"],
    "urls": [],
    "paths": ["~/Documents/Notes"],
    "commands": [
      {
        "run": "shortcuts run 'Turn On Do Not Disturb'",
        "stop": "shortcuts run 'Turn Off Do Not Disturb'"
      }
    ]
  }
]
```
Paste this into **Manage Rituals → Import Rituals** (⌘⇧I), choose **Merge**, then **Import**.

## Example 3 — frontend dev with VPN

**User:** "Open Cursor on my app repo, connect the company WireGuard VPN, run the dev
server, and open localhost:3000 in Arc once the server responds. Disconnect the VPN
when I deactivate."

**You:**
```json
[
  {
    "name": "Frontend",
    "apps": ["Cursor"],
    "urls": ["http://localhost:3000"],
    "paths": [],
    "commands": [
      { "run": "wg-quick up company", "stop": "wg-quick down company" },
      { "run": "cd ~/Projects/app && npm run dev" }
    ],
    "browser": "Arc",
    "stepDelay": 2
  }
]
```
Paste this into **Manage Rituals → Import Rituals** (⌘⇧I), choose **Merge**, then **Import**.
