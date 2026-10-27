---
name: raycast-extension
description: Build and maintain Raycast extensions in this repo (React + TypeScript on @raycast/api 1.104). Use when adding or changing a command, a List/Detail/Form view, a manifest field or preference, when wiring hooks or caching, or when debugging a command that does not render, does not hot-reload, fails lint, or fails to type-check.
---

# Raycast extensions (this repo)

This project is a Raycast extension that controls ProxyManager. Read
`AGENTS.md` for the repo contract and `docs/ux.md` for the command map before
adding anything; this skill covers the *how* of Raycast itself.

## Project constraints — read first

| | This repo |
|---|---|
| App target | Raycast **1.104+** and Raycast 2 (one build, see `references/raycast-v1-support.md`) |
| `@raycast/api` | **2.9.0** (current major), code limited to the 1.104 surface |
| `@raycast/utils` | **2.3.3** — pairs with api 2.x |
| Runtime | Node **22.22.2+** (the app's own runtime) |
| Package manager | **bun** — `bun install`, `bun run dev`, `bun run build`, `bun test` |
| `@types/react` | must equal the `@raycast/api` peer version (`19.0.10`) |
| Platforms | `["macOS"]` |

Anything below that says "2.0-only" is outside the supported surface here: the
dependency is 2.x, but the *code* stays inside the API that 1.104 also has, so
one build runs on both apps.

The bundled `references/` files are a snapshot of the upstream docs (API ≤ 2.8)
kept for exact prop names and defaults. **`references/raycast-v1-support.md`
overrides them** where they describe a 2.0-only API.

## How a command exists

A command is two things:

1. an entry in `package.json` → `commands[]` with `name`, `title`, `description`,
   `mode`, and optionally `subtitle`, `keywords`, `arguments`, `preferences`,
   `disabledByDefault`, `hotkey`;
2. a file `src/<name>.tsx` (or `.ts`) whose **default export** is the command.

`mode`:

| Mode | Use for | Returns |
|---|---|---|
| `view` | anything with UI | JSX |
| `no-view` | one action + HUD/toast | `Promise<void>` |
| `menu-bar` | persistent icon | `<MenuBarExtra>` |

`arguments` (max 3, `text` / `password` / `dropdown`) arrive in
`props.arguments` as strings. Type them without relying on generated globals:

```tsx
type Props = LaunchProps<{ arguments: { host?: string } }>;
export default function Command(props: Props) { … }
```

Preferences are read with `getPreferenceValues<Shape>()` and must work with the
`default` in the manifest. This repo's preferences are optional, so no setup form
appears and no `help.md` is needed (that file is 2.0-only anyway).

## UI patterns this repo uses

### List

```tsx
<List
  isLoading={isLoading}
  searchBarPlaceholder="Search targets…"
  searchBarAccessory={<List.Dropdown tooltip="Filter" value={f} onChange={setF}>…</List.Dropdown>}
>
  <List.Section title="Routing">
    <List.Item id="routing" title="Routing is on" icon={…} accessories={[…]} actions={<ActionPanel>…</ActionPanel>} />
  </List.Section>
</List>
```

- The **first action in the panel is Enter**. It must be the action the user most
  likely wants *in that item's current state*.
- `List.Item.id` keeps selection stable across revalidation; set it.
- `accessories` accepts `{ text }`, `{ tag }`, `{ icon, tooltip }` — use a tag for
  state, an icon for health, and never both for the same fact.
- `List.EmptyView` replaces the whole list (including `searchBarAccessory`), so
  use it only when nothing else should be reachable.

### Detail

`Detail` is for reading, not browsing. Use `metadata` for the key/value facts and
markdown for the one-line conclusion. Put the corrective action first in the panel
(e.g. "Add as Target" when the answer is "direct").

### Form

```tsx
type Values = { pattern: string; enabled: boolean }; // `type`, not `interface`:
// Action.SubmitForm<T> needs T extends Form.Values (implicit index signature)

<Form actions={<ActionPanel><Action.SubmitForm<Values> title="Add Target" onSubmit={submit} /></ActionPanel>}>
  <Form.TextField id="pattern" value={pattern} error={error} onChange={…} />
  <Form.Checkbox id="enabled" label="…" value={enabled} onChange={setEnabled} />
  <Form.Description text="…" />
</Form>
```

- Validate in `onSubmit` and set the field's `error`; do not throw.
- A second `<Action.SubmitForm>` ("Add and Add Another") is a cheap way to keep a
  repetitive flow in one screen — this repo uses it instead of a second command.
- The form never navigates itself: callers pass an `onSaved` callback so the same
  component can end in "pop back to the list" or "close the window".

## Data, caching, mutations

- `useCachedPromise(fn, [], { initialData, keepPreviousData: true })` from
  `@raycast/utils` for the main load. `initialData` from `Cache` gives an instant
  first paint; the live read always replaces it.
- After a mutation: `await action(); await revalidate(); showHUD(…)`. Do not
  hand-patch state — the app is the source of truth.
- `mutate(promise, { optimisticUpdate })` exists; use it only where the round trip
  is visibly slow. Local socket calls are single-digit milliseconds.
- **No polling.** No manifest `interval`, no `setInterval`, no background command.
  Cost at idle must be zero.
- Do not use `updateCommandMetadata` for state that the user can change elsewhere
  (it persists until the command runs again, so it goes stale and lies).

## Context APIs (frontmost app, tabs, selection)

These are the APIs that make a command feel aware of where the user is. Each one
can fail, so each must be optional.

```ts
import { BrowserExtension, environment, getFrontmostApplication, getApplications } from "@raycast/api";

const app = await getFrontmostApplication();          // no Automation prompt; rejects if none
const apps = await getApplications();                 // name, path, bundleId — for pickers

if (environment.canAccess(BrowserExtension)) {        // never call getTabs() without this
  const tabs = await BrowserExtension.getTabs();      // { id, url, title?, favicon?, active }
}
```

- `getFrontmostApplication()` is a plain read (unlike `System Events`, it never
  triggers an Automation permission dialog). Ignore `com.raycast.macos` or an
  empty `bundleId`.
- `environment.canAccess(BrowserExtension)` is the guard: calling the browser API
  when the user has not installed the Raycast browser extension makes Raycast
  **prompt to install it** and then throw. In a control panel that prompt is a bug.
- `List` takes `selectedItemId`, so a picker can open on the app the user came
  from.
- `getSelectedText()` / `getSelectedFinderItems()` reject when there is no
  selection or Finder is not frontmost — wrap them in try/catch.
- A tab's `favicon` is a remote URL. Rendering it makes the extension fetch images
  from every site the user visits; if the README claims "no network", use an icon
  instead.

## Feedback

| Want | Use |
|---|---|
| The action finished, one line | `showHUD("Routing ON · 8/12 targets")` |
| Long-running or fallible | `showToast({ style: Toast.Style.Animated, … })`, then mutate the same toast |
| Failure with a fix | failure toast + `toast.primaryAction = { title: "Open Proxy Manager", onAction }` |
| Destructive | `confirmAlert({ primaryAction: { style: Alert.ActionStyle.Destructive } })` |

Copy rules: states not verbs, no exclamation marks, no "Successfully", and a
failure names the next step. `ProxyManagerError.hint` owns that mapping here.

## Performance

- One batched read per screen open, not one call per row.
- Never block the event loop: `fs/promises`, `execFile` (not `exec`/`*Sync`) on any
  path that runs while a view is open.
- Bound every wait (this repo: 10 s reads, 30 s policy calls).
- Destroy sockets/promises as soon as the data is in hand.

## Dev loop and failure modes

```bash
bun run dev        # watcher + import into the running Raycast
bun run build      # compile + type check (writes dist/)
bun run lint       # manifest + icon + ESLint + Prettier
bun test           # pure modules only
```

- `ray develop` imports into whichever Raycast is running and keeps working after
  you stop it. Raycast loads a dev extension **by path** — if the folder moves or
  is deleted, every command shows a red triangle. Re-run `bun run dev` here.
- A failed rebuild keeps the **previous** build running; the only signal is the
  broken icon and the terminal output. Read the log before debugging anything else.
- `ray build -e dist` compiles; plain `ray build` overwrites the installed copy.
  Use `-e dist` for a check.
- `ray lint` also validates the manifest and the icon (512×512 PNG at
  `assets/<icon>`); a missing icon fails lint before ESLint even runs.
- Type errors of the form `'List' cannot be used as a JSX component … ReactNode |
  Promise<ReactNode>` mean two `@types/react` copies are installed — pin the
  version to the api's peer dependency.
- `@raycast/api` ships `react` and `@types/react`; never add `react` to
  `dependencies` here.
- Behind a TLS-inspecting proxy, `bun install` may fail with
  `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`: set `cafile` in `~/.bunfig.toml` or run
  `NODE_TLS_REJECT_UNAUTHORIZED=0 bun install`.

## Review checklist for a UI change

1. Enter on every row does the most likely thing for the *current* state.
2. Every row has a reachable action when the socket is dead (no dead ends).
3. No new row duplicates an existing action ([`docs/ux.md`](../../../docs/ux.md)).
4. Nothing polls; nothing runs after the view closes.
5. Copy follows the rules; failures carry a hint.
6. `bun run lint && bun run typecheck && bun test && bun run build` pass.

## Reference map

| File | Open when |
|---|---|
| `references/raycast-v1-support.md` | you are unsure whether an API exists in 1.104 — **read before the others** |
| `references/platform.md` | manifest keys, modes, arguments, preferences, `ray` CLI, deeplinks, debugging |
| `references/api-reference.md` | exact props for List, Detail, Form, ActionPanel, Action, Toast, Cache, Clipboard, environment |
| `references/utils-hooks.md` | choosing or configuring a `@raycast/utils` hook, pagination, `mutate`, `showFailureToast` |
| `references/script-commands-and-app.md` | Script Commands, `raycast://` URLs, app-level features (not used in this repo today) |
| `references/FRESHNESS.json` | when and from where the upstream snapshot was taken |
