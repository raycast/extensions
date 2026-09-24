# Raycast

[docs/architecture.md](../docs/architecture.md) has the full layer map. These
are the rules to hold on to while you write code.

## Layers

`command → components → hooks → api → helpers`. Imports flow one way only.

- **Command files only compose a hook and a component.** No fetching, no
  markup logic beyond wiring props.
- **Components render and wire actions.** They receive state and callbacks as
  props; no fetching.
- **Hooks wrap `usePromise` / `useFetch` / `useCachedPromise`.** They're the
  bridge between `api/` and the UI.
- **`api/` is the only place that calls `fetch`.** Every call goes through
  `memosFetch`.
- **`helpers/preferences.ts` is the only caller of `getPreferenceValues`.**

## Errors

- **`api/` throws `ApiError`** with a message the user can read.
- **The UI shows `toErrorMessage(error)`** in a Detail/EmptyView or through
  `showFailureToast`.
- **Never use `console.*`** in committed code.

## Validation

- **Parse every Memos response with a Zod schema in `api/`**, and export
  `z.infer` types from there.

## Preferences

- **Add new preferences to the manifest `preferences` array** (at extension
  level if shared).
- **Mark them required only if nothing works without them.**
- **Read them through `helpers/preferences.ts`.**
- **Never build a command that writes settings.** Configuration belongs to the
  preferences API; a configuration command is a rejection. Setup Memos reads
  and verifies only.

## UI

- **Every list or detail view has an `ActionPanel`**, and the primary action
  comes first.
- **Use standard shortcuts** (⌘R reload, ⌘O open, ⌘T token), `Icon.*`
  built-ins, and `confirmAlert` before anything destructive.
- **Never set `navigationTitle` on a root command view.** Raycast fills it
  from the command name. Nested screens only, kept short, and never updated
  from state.
- **Never render an empty list before the data arrives.** Pass `isLoading` and
  let Raycast's loading bar hold the screen; the "No results" flicker is a
  named review failure.
- **Push new screens through the Navigation API** (`useNavigation`,
  `Action.Push`). Swapping a view's content in place is a rejection.
- **Placeholders on every text field, text area and search bar**, preferences
  included.
- **Actions carry `…` when they open a submenu**, and the submenu items don't
  repeat the parent's name: `Set Visibility…` → `Private`, `Public`.
- **No external analytics, ever.** No Keychain access.
- **US English spelling** in every string a user can see.

## Tests

- **Vitest in `tests/unit/`**, for pure modules only (helpers, `api/` with
  `vi.stubGlobal("fetch")`, markdown builders).
- **Don't import `@raycast/api` in tested modules.**
