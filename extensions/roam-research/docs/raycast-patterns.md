# Raycast Patterns

Non-obvious Raycast extension patterns used in this codebase. This is not a Raycast tutorial — it covers the specific patterns that differ from standard React web development and would trip up an LLM agent or contributor unfamiliar with the framework.

**Source files:** All `src/*.tsx` entry points, `utils.ts`, `components.tsx`

---

## 1. View vs No-View Commands

Raycast commands come in two modes, declared in `package.json`:

- **`"mode": "view"`** — Exports a React component. Has access to hooks, JSX, and the full Raycast UI. Example: `quick-capture.tsx` renders template/graph selection lists and pushes to `QuickCaptureForm`.
- **`"mode": "no-view"`** — Exports an `async function`. Runs headlessly — no React, no hooks, no JSX. Communicates via `showHUD()` or `showToast()` only. Example: `instant-capture-default-graph.tsx` reads config, calls the API, and shows a HUD.

> **Key constraint:** You cannot use `useLocalStorage`, `useCachedPromise`, `useNavigation`, or any React hook in a no-view command. Use `LocalStorage.getItem()` directly and plain functions like `resolveInstantCapture()`.

---

## 2. Storage: Cache vs LocalStorage

Four storage mechanisms, each with different security and lifecycle:

| Storage | Security | Persistence | Use for | API |
|---------|----------|-------------|---------|-----|
| `Cache` | Insecure LRU | Ephemeral (survives restarts, but evicted under memory pressure) | Page lists (2hr TTL), used pages (MRU) | `new Cache({ namespace })` — sync get/set |
| `LocalStorage` | Encrypted | Persistent | Graph tokens, configs, templates | `LocalStorage.getItem/setItem()` — async |
| `useLocalStorage` hook | Encrypted | Persistent | Same as above, but reactive in components | `useLocalStorage(key)` from `@raycast/utils` |
| `useCachedPromise` | In-memory | Per-session (lost on command exit) | Search results, async fetched data | `useCachedPromise(fn, args, opts)` from `@raycast/utils` |

**Rule of thumb:** Sensitive data (API tokens, graph configs) → `LocalStorage`. Ephemeral caches (page lists, peer URLs) → `Cache`. Async data in components → `useCachedPromise`.

> **Never put tokens in `Cache`** — it's unencrypted and readable by other extensions.

---

## 3. Navigation Stack

Raycast uses a stack-based navigation model (like iOS), not URL-based routing:

- `useNavigation()` returns `{ push, pop }` — `push()` adds a view on top, `pop()` removes it
- Pressing **Escape** pops the current view (goes back)
- `Action.Push` in an `ActionPanel` navigates to a new view when the action is triggered
- After form submission, call `pop()` to return to the previous screen (e.g., list view)

This extension's common pattern: List view → `Action.Push` to detail/form view → `pop()` on success.

---

## 4. Form Validation

Raycast forms do **not** prevent submission on validation errors — unlike HTML forms:

- The `error` prop on `Form.TextField` shows red text, but it's purely cosmetic
- You must check validation in the `onSubmit` handler and `return` early if invalid
- Use `onBlur` callbacks for per-field validation as the user moves between fields
- Use `onChange` callbacks to clear errors when the user starts correcting input

See `new-graph.tsx` for the full pattern (blur validation + submit-time checking).

---

## 5. Arguments vs Preferences

Two ways to pass data to commands, easily confused:

| | Arguments | Preferences |
|---|-----------|-------------|
| **Declared in** | `package.json` → command's `arguments[]` | `package.json` → `preferences[]` |
| **Scope** | Per-invocation (user types each time) | Persistent (set once in Raycast Settings) |
| **Accessed via** | `props.arguments` from `LaunchProps` | `getPreferenceValues<Preferences>()` |
| **Works in** | Both view and no-view | Both view and no-view |
| **Example** | `text` argument in Quick Capture | `openIn` preference (web vs desktop app) |

---

## 6. Hooks vs Pure Functions

Hooks only work in `view` commands (React components). For logic shared between view and no-view commands, extract pure functions:

| Context | Can use hooks? | Config access pattern |
|---------|---------------|----------------------|
| View command (React component) | Yes | `useGraphsConfig()` hook → reactive state |
| No-view command (async function) | No | `LocalStorage.getItem("graphs-config")` → parse JSON |
| Shared logic | — | Pure functions: `resolveInstantCapture()`, `getFirstTemplate()` |

`getPreferenceValues()` works everywhere — it's not a hook despite the function naming convention.

---

## 7. Inter-Command Communication

Commands can launch other commands programmatically:

```typescript
import { launchCommand, LaunchType } from "@raycast/api";

await launchCommand({ name: "manage-templates", type: LaunchType.UserInitiated });
```

Used in `components.tsx → QuickCaptureForm` to open the "Manage Templates" command from a menu action. The launched command opens as if the user triggered it directly from Raycast.

---

## Full Raycast API Reference

For APIs not covered above, consult the full Raycast documentation (~15K lines):

```bash
# Download if not present:
mkdir -p tmp-docs && curl -o tmp-docs/raycast-full-llms.txt https://raw.githubusercontent.com/raycast/extensions/refs/heads/gh-pages/llms-full.txt
```

Key sections in the full reference (approximate line numbers):
- **No-view commands** — ~L465
- **Cache API** — ~L789
- **LocalStorage API** — ~L3030
- **Preferences** — ~L2882
- **Navigation** — ~L8296
- **`useCachedPromise`** — ~L12784
- **`useLocalStorage`** — ~L14093

---

## See Also

- `docs/howto-extend.md` — Recipes that apply these patterns (adding commands, config fields, etc.)
- `docs/gotchas.md` — Edge cases including no-view limitations and storage quirks
