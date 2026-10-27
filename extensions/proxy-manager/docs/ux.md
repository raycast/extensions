# UX: the command map

The extension exposes five commands. Each one exists because it answers a
different question, and no two of them can do the same job. This file is the
contract for changing that.

## The five commands

| Command | Mode | The question it answers | Enter (primary action) |
|---|---|---|---|
| **Proxy Manager** | `view` | "What is my routing doing, and what about this page and app?" | Contextual: Turn On / Turn Off / Retry, depending on state |
| **Toggle Routing** | `no-view` | "Flip it, now, from anywhere." | Toggles and reports in a HUD |
| **Add Target** | `view` | "Send this host through the tunnel." | Adds the normalised host (prefilled from the tab you're on) |
| **Explain Host Routing** | `view` | "Why is this page going direct?" | Fixes what it finds (add / disable the rule) |
| **App Routing** | `view` | "How is the app I'm in routed, and how do I change it?" | Flips that app between tunnel and direct |

`Proxy Manager` is the hub; the other four are the specific jobs. Everything the
hub can do inline it does with a push, so `Add Target` and the hub's "Add Target…"
row share one form component (`src/components/target-form.tsx`).

### Why not more commands

| Considered | Rejected because |
|---|---|
| Separate "Turn On" / "Turn Off" | Two rows in root search for one boolean. The hub already words the primary action by state. |
| A "Status" command that only displays | The hub's first row *is* the status, and it also offers the action. A read-only twin is pure repetition. |
| A "Targets" list command | The hub lists targets, filters them, and has the add/edit/remove actions. A second list would fork the behaviour. |
| An "Add App Rule" command | It is a push from App Routing (and from the hub's app row); a top-level command would duplicate the same picker. |
| A "Current tab" command | The hub already carries the site row; a command that only shows one URL answers nothing new. |
| A "Presets" command | Presets are a bulk add; they live in the add flow as a submenu (`⌘⇧P`). |
| A menu-bar command | ProxyManager is already a menu-bar app. Two menu-bar icons for one state is noise. |

## State-driven behaviour

The hub's first row is not a fixed menu — it renders the state and leads with the
action that state needs.

| Situation | Row | Primary action |
|---|---|---|
| `off` | "Routing is off" | Turn Routing On |
| `on` | "Routing is on" | Turn Routing Off |
| `degraded` (listener up, tunnel down) | "Routing is degraded" | Retry Routing (+ Toggle in the panel) |
| `starting` / `stopping` | "Routing is starting…" | Toggle (the app settles by itself) |
| `onboardingComplete: false` | Extra row: "Proxy Manager isn't set up yet" | Finish Setup (opens the app) |
| `authorizationDeferred: true` | Extra row: waiting for an admin approval | Open Proxy Manager / Try Again |
| `lastError != null` | Extra row with the message | Copy Error |
| App not running | Empty state | Open Proxy Manager |
| External control off | Empty state | Open Settings |
| Clipboard holds an un-routed link | "From the Clipboard" section | Add as Target |
| No targets at all | "No targets yet" instead of an empty list | Add Target / preset |

Those extra rows only appear when the condition is true, so a healthy install
shows three things: routing, the page/app in front of you, and your targets.

### Right now

Two context rows sit between the state and the target list. They are read fresh
on every open and never cached.

| Row | When it appears | Enter | Panel |
|---|---|---|---|
| **The site** (`example.com`) | A browser tab is active and the Raycast browser extension is installed | Add as target (when it goes direct) / Explain routing (when a rule already covers it) | Explain, Disable this target, Reveal, Copy host |
| **The app** (`Slack`) | Per-app routing is on and a non-Raycast app was frontmost | Flip tunnel ↔ direct | Explicit `Tunnel all` / `Use targets` / `Direct`, remove rule |

Rules that keep this from becoming clutter:

- **One site row, one app row, maximum.** No lists of tabs, no lists of running
  apps. The site row is dropped when the dashboard falls back to a clipboard
  suggestion (never two "add this host" rows).
- **The site row shows when it is *already* tunneled**, as a green
  "Tunneled by `*.example.com`" row. Confirming that the tunnel is doing its job
  is as valuable as offering to add.
- **The app row is hidden while per-app routing is off.** A row that only says
  "nothing here applies" is noise; the App Routing command is where you turn it on.
- **No blind toggle for apps.** With `Use targets` in play, a boolean flip cannot
  express three states, so Enter flips tunnel ↔ direct and the three modes stay
  explicit in the panel.

### Explain Host Routing

The explanation is a *routing decision*, not a statement about live traffic, so
the detail view also reads `status` and leads with a blockquote when the answer
is theoretical:

- routing `off` → "Routing is off, so nothing is using the tunnel right now."
- `degraded` → "The tunnel is unreachable, so requests are failing right now."

The primary action is then the fix for what it found: **Add as Target** when the
host goes direct, **Disable This Target** when a rule matches but the user wanted
direct, and **Reveal Target** otherwise.

## Context

The extension uses only context it can get without a prompt:

| Source | Used for |
|---|---|
| `status` | state, tunnel health, listener, the app's own last error |
| `targets.list` + `presets.list` | the list, the target count, the "already covered?" check |
| `getFrontmostApplication()` | the app row in the hub and in App Routing |
| `apps.resolve` + `apps.list` | that app's effective mode, whether it has a rule, whether per-app routing is on |
| `BrowserExtension.getTabs()` | the site row: the active tab's host and title |
| `Clipboard.readText()` | the fallback suggestion, only for `http(s)` links, and only when there is no site row |
| Command `arguments` | explicit host for `add-target` / `explain-host`; wins over every other source |
| `routing.explain` | the explanation view, including which rule decided — with the frontmost app's bundle ID when there is one |

Precedence for "which host does the user mean": **argument → active tab →
clipboard**.

**No prompts.** `getFrontmostApplication()` is a plain read (no Automation
permission, unlike `System Events`). The browser API is only touched when
`environment.canAccess(BrowserExtension)` is already true — calling it otherwise
makes Raycast ask the user to install the browser extension, which a routing
command must never do. Both are wrapped so a missing browser or a denied API
just removes a row.

**No remote images.** The active tab's favicon would look nicer, but fetching it
would turn a local-only extension into one that talks to every site you visit.
The site row uses `Icon.Globe`.

**Not used: polling.** No `interval`, no timer, no background command. State is
read when a command opens, and after each mutation. The cost when idle is zero.

**Not used: `updateCommandMetadata`.** It would put "ON · 12 targets" beside the
command in root search, but the text persists until the command runs again —
including after the user flips routing from ProxyManager's own menu bar. A stale
"ON" is worse than no subtitle, so subtitles stay static and true.

## Copy

- States, not verbs: "Routing is on", not "Enabled successfully".
- One sentence per message, no exclamation marks, no "Successfully".
- A HUD reports what changed: `Routing ON · 8/12 targets`.
- A failure says what to do next, not what went wrong internally. The error code
  map lives in `ProxyManagerError.hint` (`src/lib/control.ts`).
- Never blame the user. "Proxy Manager isn't running" beats "Socket ENOENT".

## Keyboard

| Shortcut | Scope | Action |
|---|---|---|
| `⌘↵` | any row | The row's primary action |
| `⌘O` | hub | Open Proxy Manager |
| `⌘⇧,` | hub | Open Settings |
| `⌘R` | hub, app routing | Refresh |
| `⌘C` | hub (status row) | Copy status JSON |
| `⌘⇧T` | hub | Toggle routing |
| `⌘⇧A` | hub | App Routing command |
| `⌘⇧E` | hub | Explain a Host |
| `⌘⇧P` | hub add row | Add a preset |
| `⌘E` | target row | Edit target |
| `⌘⌫` | target / rule row | Remove (confirms) |
| `⌘⇧⌫` | app row | Remove app rule (confirms) |
| `⌘L` | target / rule / app row | Reveal in Proxy Manager |
| `⌘N` | explanation, app routing | Add target / app rule |

The manifest also suggests `⌃⌥P` for **Toggle Routing**. Raycast treats manifest
hotkeys as suggestions; the user can change it.

## Adding a command

Before adding a sixth command, answer all of these in the PR description:

1. Which question does it answer that the hub cannot, even with a push?
2. What is its default (Enter) action for the *most common* state?
3. Where does it dead-end when ProxyManager is not running or control is off?
4. Does it duplicate a row or action that already exists? If so, move the row
   instead of copying it.
5. Does it need polling? If yes, the answer is no.
