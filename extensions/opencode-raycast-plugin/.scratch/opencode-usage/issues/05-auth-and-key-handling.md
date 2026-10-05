# Auth and key handling

Status: resolved
Type: grilling
Blocked by: 02

## Question

How should the extension obtain and manage the OpenCode Go key, and what should each failure mode look like?

Ground this on the facts from **OCG API and pricing schema** (key file path on macOS, auth header, error semantics). Decide:

- Auto-read `~/.local/share/opencode/auth.json` (parse `opencode-go.key`) at fetch time, versus storing a copy in a Raycast secure preference, versus both (auth.json wins, pref is an override/fallback). Where in the flow is the key read?
- Refresh semantics when the key file appears or changes (e.g. after the user runs opencode `/connect`) — does the extension pick it up without reconfiguration?
- Failure modes and their UX: file missing / key missing / key invalid (401) / network offline. Per mode: what each surface (full view, menu bar) shows, and whether the extension should hint at `/connect` or opening Extension Preferences.
- Whether reading `~/.local/share/opencode/auth.json` raises macOS sandbox/permission concerns for a Raycast extension, and if so, the workaround.

Record the decision in the ticket; this feeds every other design ticket's error-state work.

## Answer

Decision (grilled with human, all recommendations accepted):

- **Key source**: `~/.local/share/opencode/auth.json` → `opencode-go.key` is the source of truth; a Raycast `password` preference ("Go key") is used **only as a fallback** when auth.json is missing or has no entry. The extension never writes to auth.json.
- **When read**: fresh on every fetch; the key is not cached. A `/connect` run later is picked up with zero reconfiguration (Raycast also re-executes commands on preference change).
- **Failure-mode UX** (the four classes from the OCG API research):
  - **no-key** (file/key missing): full view = setup state with explanation + "Open Extension Preferences" action; menu bar = `--` pill, hover "OpenCode Go: no key", dropdown opens preferences.
  - **bad-key** (401): full view = "Go key invalid (401)" + hint to re-run `/connect`; menu bar = `--`. **No stale data.**
  - **no-entitlement** (403): full view = "OpenCode Go subscription required (403)"; menu bar = `--`. **No stale data.**
  - **offline**: full view keeps **last-known data** with an "offline · updated X ago" note when a cache exists, else an offline error; menu bar shows the **last-known percent**. Offline is the *only* mode that keeps last-known data.
- **Menu bar unconfigured state**: the pill is always rendered (discoverable pre-setup), showing `--`.
- **Security stance**: the key is read in-memory at fetch time only; never written by the extension, never logged, never stored in Cache/LocalStorage; the only persisted copy is the Keychain-backed Raycast password preference, and only when pasted.
- **Local fact recorded**: on this Mac, auth.json is present but has no `opencode-go` entry yet (opencode at /opt/homebrew/bin/opencode). The extension will show the no-key state until `/connect` or a pasted key.

Feeds **Raycast UI layout** and **Menu-bar surface** — their empty/error/loading states should implement this matrix, not re-decide it.
