# Design doc: Replace Selection with Agent

Reference doc for a new capability added to this extension. Not shipped as
part of the extension itself — pure repo documentation.

## TL;DR

Two new commands let you select text anywhere on macOS, trigger a hotkey,
and have a specific Dust agent's answer silently replace that text — no
Raycast window, ever. You can create as many of these (one per agent) as
you want, each independently named and hotkey-bound. `Ask Claude-4` and
`Ask GPT-5` (two commands hardcoding one model each) are removed, superseded
by this.

## Problem & goals

Before this change, the only way to ask a *specific* Dust agent was
`Ask ...` (`src/askAgent.tsx`) — a plain picker, with no way to jump
straight to a specific agent from outside Raycast. `Ask Claude-4` and
`Ask GPT-5` each hardcoded one agent, with no way to repoint them without
shipping a new extension version. Neither supports the most useful pattern
for this kind of tool: select text (browser, chat app, email, terminal —
anything), trigger a shortcut, have an agent's answer replace it in place
(grammar fixes, translation, rewriting, etc.).

Goals, in priority order (this ordering drove real design changes — see
"How we got here"):
1. **Most important**: call a specific custom Dust agent to replace the
   selected text, with **zero interaction with any Raycast interface** —
   no window, ever.
2. Let the user set this up for as many agents as they want, an
   unspecified number decided entirely by them — each as its own named,
   independently-triggerable shortcut.

## Final architecture

Two commands:

### `Replace Selection with Agent` (`src/replaceSelectionWithAgent.tsx`, `name: replaceSelectionWithAgent`, `mode: "no-view"`)

The one you actually use, bound to a hotkey per Quicklink. A single async
function, no React, no window:
1. Read the target agent id from `props.launchContext?.agentId` —
   **required**, no fallback (see "How we got here" for why there's no
   "default agent").
2. Look it up via `dustApi.getAgentConfigurations({ view: "list" })`.
3. `getSelectedText()` to grab whatever's currently selected anywhere on
   the Mac.
4. Call `answerQuestion()` (`src/answerQuestion.tsx`, shared with the rest
   of the extension), passing an `onAnswer` callback that fires only once
   the *final* answer is in (not on partial streaming chunks).
5. In that callback: `Clipboard.paste(stripMarkdown(answer))` — pastes the
   plain-text answer directly over the still-active selection in whatever
   app is in the foreground — then a confirmation toast.

Every early-exit condition (no workspace, no `agentId` in the launch
context, agent not found, no text selected) shows a `showHUD(...)`
message; the entire body is wrapped in one `try/catch` reporting
unexpected errors via `showFailureToast` (from `@raycast/utils`).

### `Set up Replace Selection` (`src/setUpReplaceSelection.tsx`, `name: setUpReplaceSelection`, `mode: "view"`)

The setup tool. Exactly one screen, one action:
- Lists all agents (`useAgents` from `src/askAgent.tsx`), sorted by name.
- Each agent has exactly one action: **"Create Quicklink…"** —
  `Action.CreateQuicklink` targeting `replaceSelectionWithAgent` with that
  agent's id in its `context`. Raycast's own quicklink-creation dialog is
  where the user renames it, picks an icon, and later assigns a hotkey
  (Raycast Preferences → Quicklinks) — nothing here needs to handle naming
  or hotkeys itself.

### Shared building blocks

| What | Where |
|---|---|
| `answerQuestion()` / `ConversationContext` (Dust API call, SSE streaming, citations) | `src/answerQuestion.tsx` |
| `useAgents` | `src/askAgent.tsx` |
| `getAgentScopeConfig`, `stripMarkdown` | `src/utils.tsx` |
| `getDustClient`, `withPickedWorkspace`, `provider` (OAuth) | `src/dust_api/oauth.tsx` |

## Migrating from `main`

Everything below is the complete, minimal diff to apply this feature on
top of the current `main` branch.

### New files

| File | Purpose |
|---|---|
| `src/setUpReplaceSelection.tsx` | `Set up Replace Selection` command — agent list, one "Create Quicklink…" action per agent |
| `src/replaceSelectionWithAgent.tsx` | `Replace Selection with Agent` command — the silent no-view flow |

### Deleted files

| File | Why |
|---|---|
| `src/askClaude.tsx` | Hardcoded one agent (`claude-4-sonnet`); superseded |
| `src/askGpt.tsx` | Hardcoded one agent (`gpt-5`); superseded |

### `package.json` — `commands` array

- Remove the `askClaude` and `askGpt` command entries entirely.
- Add two new entries (no `arguments` on either — see "The key trick"
  below for why that matters on the no-view one):

```json
{
  "name": "setUpReplaceSelection",
  "title": "Set up Replace Selection",
  "subtitle": "Create a Quicklink for an agent",
  "description": "Pick an agent and use \"Create Quicklink…\" to save a dedicated, freely-renamable shortcut that silently replaces your selected text with that agent's answer.",
  "mode": "view"
},
{
  "name": "replaceSelectionWithAgent",
  "title": "Replace Selection with Agent",
  "description": "Silently sends the currently selected text to the agent bound to this shortcut and replaces the selection with the answer. Create shortcuts for specific agents from \"Set up Replace Selection\". Runs with no window, only toasts.",
  "mode": "no-view"
}
```

### `src/utils.tsx` — one addition

Add `stripMarkdown()` (strips `**bold**`, `__bold__`, `*italic*`,
`_italic_`, `` `code` `` — needed because `Clipboard.paste` writes plain
text, but the agent's answer is markdown):

```ts
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`(.*?)`/g, "$1");
}
```

### `src/askAgent.tsx` — one-line export

`useAgents` becomes exported (needed by `setUpReplaceSelection.tsx`):

```diff
-function useAgents(dustApi: DustAPI) {
+export function useAgents(dustApi: DustAPI) {
```

### `src/answerQuestion.tsx` — reusable outside its own component

`answerQuestion()` and its `ConversationContext` type become exported (so
the no-view command can call them directly, no React needed), and
`answerQuestion()` gains an `onAnswer?: (answer: string) => void`
parameter, invoked exactly once, only on the final `agent_message_success`
event (never on partial streaming chunks) — this is what lets the no-view
command know when to paste. `AskDustQuestion` passes its own `onAnswer`
prop straight through. Also added: `showToast` on the two SSE error
branches (`user_message_error`, `agent_error`) — previously only
`console.error`, i.e. invisible with no Detail view to show it, which a
no-view command always lacks.

### `README.md` / `CHANGELOG.md`

Updated to describe the two new commands and the removal of Ask Claude-4 /
Ask GPT-5 — see those files directly, not reproduced here.

### Not touched by this change

- `metadata/dust-tt-*.png` (Raycast Store screenshots) — binary, can't be
  inspected/edited here. If any show the old command list, recapture
  before the next Store publish.
- `raycast-env.d.ts` — regenerates automatically on the next
  `ray develop`/`ray build`.

## The key trick: how a Quicklink targets a specific agent

A Quicklink needs to say "use *this* agent" to a command that declares
**zero configuration** in `package.json`. The naive approach — an optional
`agentId` command **argument**, with a
`raycast://...?arguments={"agentId":"..."}` link — works for a `view`
command, but **breaks a `no-view` command**: declaring any `arguments`
entry (even optional) makes Raycast show a blocking "fill in arguments"
prompt before running — a visible window, the exact thing a silent
command must never show. This was the root cause of our first attempt
failing silently (window flashes open, nothing happens).

The fix: **`context`/`launchContext` instead of `arguments`** — a
completely separate, undeclared channel:

- `LaunchProps<T>` exposes `launchContext?: T["launchContext"]` on *every*
  command — view or no-view — independently of any `arguments` schema.
- Raycast deeplinks support a `context` query parameter, distinct from
  `arguments`, mapping straight to `launchContext`, with no UI attached.
- `@raycast/utils`'s `createDeeplink()` builds this and auto-resolves the
  extension's own owner/name:

```ts
// src/setUpReplaceSelection.tsx
function buildAgentSelectionQuicklink(agentId: string) {
  return createDeeplink({ command: "replaceSelectionWithAgent", context: { agentId } });
}
```

This is what makes "unlimited, freely nameable silent shortcuts" possible:
every Quicklink is an independent Raycast entry with its own name, icon,
and hotkey, and there's no cap on how many can point at
`replaceSelectionWithAgent` with different `agentId`s in their `context`.

## How we got here (why some things aren't here anymore)

Two earlier iterations got walked back after testing against the actual
two goals above:

1. **A `view`-mode attempt that called `closeMainWindow()` late**, after
   data had already loaded. By then the source app had lost focus long
   enough that its text selection was gone, so `Clipboard.paste` landed at
   the cursor instead of replacing anything. Fixed by going full no-view:
   the window never opens, so focus never leaves the source app, and
   `closeMainWindow()` is never needed (nothing to close).
2. **A "default agent" stored in LocalStorage**, so the no-view command
   could be hotkey-bound directly without a Quicklink, plus an "ask this
   agent interactively" flow and a second Quicklink type in the setup
   command. That's four different actions live at once ("Ask & Set as
   Default", "Change Default Agent", "Create Quicklink for This Agent…",
   "Create Quicklink to Replace Selection…") — too much for someone
   unfamiliar with the extension to figure out, even though the end
   behavior worked. Since **every real invocation already goes through a
   Quicklink**, which always carries its own `agentId`, a "default" turned
   out to be pure accidental complexity serving neither goal. Removed
   entirely: the no-view command now requires `launchContext.agentId` (no
   fallback, clear `showHUD` if missing), and the setup command lost the
   interactive flow, the default-agent actions, and the second Quicklink
   type — down to one list, one action, one name that says what it's for.

**Takeaway for future changes to this feature:** resist adding a second
action to the setup command's list item. Every extra action is one more
thing a new user has to understand before they can use the tool at all. If
a feature doesn't serve one of the two stated goals directly, it doesn't
belong here — add a separate, clearly-named command instead of overloading
this one.

## Other pitfalls worth remembering

- **Wrap the whole no-view command body in one `try`/`catch` with
  `showFailureToast`.** Protecting only `getSelectedText()` and leaving
  everything else (workspace lookup, agent lookup, the Dust API call)
  unguarded means any of those failing produces total silence.
- **Strip markdown before pasting.** The agent's answer is markdown (for
  the Detail view elsewhere in the extension); pasted raw into a plain
  text field, literal `**`/`_`/`` ` `` show up or get mis-rendered by apps
  that auto-interpret markdown on paste.
- **Use `createDeeplink()`, not hand-built `raycast://` strings** — it
  resolves the current extension's owner/name for you and won't drift.

## Extending this pattern

To add a different "instant action on the current selection" later:

1. New `mode: "no-view"` command in `package.json`, **no `arguments`**.
2. Wrap its default export with `withAccessToken(provider)` (exported from
   `src/dust_api/oauth.tsx`) — same as `replaceSelectionWithAgent.tsx`.
3. Accept `props: LaunchProps<{ launchContext?: { ... } }>` for any
   per-Quicklink configuration; read it off `props.launchContext`, never
   `props.arguments`.
4. Reuse `answerQuestion()` / `getSelectedText()` / `Clipboard.paste()` /
   `stripMarkdown()` exactly as `replaceSelectionWithAgent.tsx` does.
5. Wrap the whole body in one `try/catch` + `showFailureToast`.
6. If user-configurable per Quicklink, add a
   `createDeeplink({ command, context: {...} })` call and its own
   dedicated `Action.CreateQuicklink` — don't bolt it onto
   `setUpReplaceSelection.tsx`'s existing single-action item.

## Testing checklist

1. `npx tsc --noEmit -p tsconfig.json` / `npx eslint .` clean.
2. `npm run dev`.
3. From `Set up Replace Selection`, create a Quicklink for an agent, rename
   it, and assign it a hotkey (Raycast Preferences → Quicklinks).
4. Select text anywhere, trigger that hotkey: no window should appear at
   all, only toasts, and the selection should be replaced in place with
   plain (non-markdown) text from that specific agent.
5. Repeat for a second agent with a second Quicklink/hotkey — confirm each
   uses its own agent.
6. Confirm failure paths never fail silently: no text selected → HUD;
   workspace not selected → HUD; agent behind a Quicklink deleted/renamed
   → HUD; any unexpected error → `showFailureToast`.
