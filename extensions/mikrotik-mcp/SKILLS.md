# SKILLS.md — Raycast Extension Development (MikroTik MCP Dashboard)

> Working reference for building **`raycast/`**, the Raycast extension that mirrors the
> [`ui/observability/`](../ui/observability) dashboard using the Raycast UI kit.
> Source of truth: <https://developers.raycast.com/llms.txt>. This file distills that
> documentation and pins it to **this repo's** conventions (a Bun workspace whose
> TypeScript/Prettier/ESLint are hoisted from the root).
>
> **Golden rule:** the extension is a **read/act client of the dashboard's HTTP API**
> (`http(s)://<host>:<port>/api/*`, token-gated). It never talks SSH/RouterOS directly —
> the MCP server already does that. Fetch JSON, render it with Raycast components, and
> POST back through the same `/api/*` routes.

---

## 0. This repo's setup (read first)

The extension lives at `mikrotik-mcp/raycast/` and is a **Bun workspace member**
(`"workspaces": ["raycast"]` in the root `package.json`). Its toolchain is **hoisted**:

| Tool                                     | Where it comes from                                               | Notes                                                                                                                                                                                             |
| ---------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TypeScript**                           | root `devDependencies` (`typescript@^5.9.3`)                      | No `typescript` in `raycast/package.json`. `raycast/tsconfig.json` stays local (it is `module: commonjs`, incompatible with the root's ESM/Bun tsconfig — do **not** make it `extends` the root). |
| **Prettier**                             | root (`prettier@^3.9.4`) + root `.prettierrc` (`printWidth: 120`) | No `.prettierrc` in `raycast/`. `ray lint` walks up and finds the root config.                                                                                                                    |
| **ESLint**                               | **local** — `raycast/eslint.config.js` + `@raycast/eslint-config` | Cannot be centralized: the root lints with **oxlint via `vp lint`**, but `ray build`/`ray lint`/Store-publish are hard-wired to ESLint. Keep the Raycast ESLint stack here.                       |
| **`@raycast/api`**, **`@raycast/utils`** | `raycast/dependencies`                                            | Hoisted to root `node_modules`; `ray` resolves them by walking up.                                                                                                                                |

**Install / run (from the repo root):**

```bash
bun install                       # hoists everything, links the workspace
cd raycast
npm run dev                       # ray develop — hot-reload dev mode (or: bun run dev)
npm run build                     # ray build   — production bundle (validate before commit)
npm run lint                      # ray lint     (ESLint); fix-lint to autofix
```

> `ray` is a **Node** CLI; it spawns Node, not Bun, to run the extension at runtime.
> Running the npm scripts through `bun run` is fine (it just execs `ray …`), but the
> extension's _runtime_ is Node, so avoid `Bun.*` / `bun:*` APIs in `src/` — use Node
> built-ins (`node:fs`, `fetch`, etc.).

**macOS/Windows:** manifest declares both `platforms: ["macOS", "Windows"]`. Gate
platform-specific APIs (Window Management, AppleScript) at runtime — see §12.

**Store-publish caveat:** the public Raycast Store CI requires **npm** and a committed
`package-lock.json`. This repo uses Bun (`bun.lock`) with no per-package lock. If/when you
publish to the public store you must generate a `raycast/package-lock.json` (`npm install`
inside `raycast/`). For a **private org** extension (`owner: "usex"` makes it private by
default) you still use `ray publish`; see §15.

---

## 1. Terminology

| Term             | Meaning                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| **Extension**    | The whole package (this `raycast/` dir). One or many commands + tools.                                 |
| **Command**      | A user-facing entry point shown in Raycast root search. Modes: `view`, `no-view`, `menu-bar`.          |
| **Tool**         | An **AI-only** entry point (hidden from root search); the AI calls it. Lives in `src/tools/<name>.ts`. |
| **AI Extension** | An extension that ships tools → users `@mention` it in Quick AI / AI Chat.                             |
| **Manifest**     | `package.json` — npm fields + Raycast metadata + `commands`/`tools`/`preferences`.                     |
| **Action**       | A unit of functionality (copy, open, submit…) inside an Action Panel, optionally with a shortcut.      |
| **Action Panel** | The `⌘K` panel listing a view's actions.                                                               |

---

## 2. File structure

```
raycast/
├── package.json            # manifest: metadata + commands + tools + preferences + deps
├── tsconfig.json           # local, commonjs (do not extend root)
├── eslint.config.js        # local Raycast ESLint config
├── raycast-env.d.ts        # AUTO-GENERATED from the manifest — never edit; gitignored
├── assets/
│   └── extension-icon.png  # 512×512 PNG (light+dark safe)
├── src/
│   ├── devices.ts          # command file — name maps to the manifest command "name"
│   ├── <command>.tsx       # .tsx for view commands, .ts for no-view/menu-bar
│   ├── tools/<name>.ts     # AI tool files (optional)
│   └── lib/                # shared helpers (api client, types, formatters)
└── CHANGELOG.md
```

Rules:

- **File name == command `name`.** Manifest command `"devices"` → `src/devices.ts(x)`.
  Manifest tool `"greet"` → `src/tools/greet.ts`.
- Use **`.tsx`** when the file returns JSX (view / menu-bar), **`.ts`** for no-view.
- The command's **default export** is the entry point.
- `raycast-env.d.ts` is regenerated by `ray` from the manifest — it declares the global
  `Preferences` and `Arguments` namespaces. Edit `package.json`, not this file.

---

## 3. Manifest (`package.json`)

### Extension-level keys

| Key           | Req | Notes                                                         |
| ------------- | --- | ------------------------------------------------------------- |
| `name`        | ✓   | URL-safe id (`mikrotik-mcp`).                                 |
| `title`       | ✓   | Display name (`MikroTik MCP`).                                |
| `description` | ✓   | Store description.                                            |
| `icon`        | ✓   | PNG in `assets/`, 512×512; `@dark` suffix for a dark variant. |
| `author`      | ✓   | Raycast handle (`usestrict`).                                 |
| `owner`       | —   | Org id (`usex`) → **private by default**.                     |
| `access`      | —   | `"public"` \| `"private"`.                                    |
| `platforms`   | ✓   | `["macOS","Windows"]`.                                        |
| `categories`  | ✓   | Title-case; ≥1 (`Applications`, `Developer Tools`).           |
| `license`     | —   | `MIT`.                                                        |
| `commands`    | ✓   | Array of command defs.                                        |
| `preferences` | —   | Extension-wide config (see §3.3).                             |
| `tools`       | —   | AI tool defs (see §14).                                       |
| `ai`          | —   | `{ instructions, evals }` for AI extensions.                  |

### 3.1 Command properties

| Prop                | Req | Notes                                                                                |
| ------------------- | --- | ------------------------------------------------------------------------------------ |
| `name`              | ✓   | Maps to `src/<name>`.                                                                |
| `title`             | ✓   | Root-search title.                                                                   |
| `description`       | ✓   | User-facing.                                                                         |
| `mode`              | ✓   | `"view"` \| `"no-view"` \| `"menu-bar"`.                                             |
| `subtitle`          | —   | Root-search subtitle; can be set dynamically via `updateCommandMetadata`.            |
| `icon`              | —   | Defaults to the extension icon.                                                      |
| `keywords`          | —   | Extra search terms.                                                                  |
| `arguments`         | —   | ≤3; see §5.                                                                          |
| `preferences`       | —   | Command-scoped (merged over extension prefs).                                        |
| `interval`          | —   | Background cadence (`no-view`/`menu-bar` only), e.g. `"10m"`, `"1h"`. Min **`10s`**. |
| `disabledByDefault` | —   | User must enable after install.                                                      |

### 3.2 Arguments schema

`{ name, type: "text"|"password"|"dropdown", placeholder, required?, data?: [{title,value}] }`
— all values arrive as **strings**; required before optional; max **3**.

### 3.3 Preferences schema

Common fields: `name*`, `title*`, `description*`, `type*`, `required*`, `placeholder?`,
`default?`. `type` → returned value:

| `type`               | Returned as                              |
| -------------------- | ---------------------------------------- |
| `textfield`          | `string`                                 |
| `password`           | `string` (secret)                        |
| `checkbox`           | `boolean` (needs `label*`)               |
| `dropdown`           | `string` (needs `data: [{title,value}]`) |
| `appPicker`          | `Application`                            |
| `file` / `directory` | `string` (path)                          |

**This extension's baseline preferences** (dashboard URL + optional token):

```jsonc
"preferences": [
  {
    "name": "dashboardUrl",
    "title": "Dashboard URL",
    "description": "Base URL of the MikroTik MCP observability dashboard",
    "type": "textfield",
    "required": true,
    "default": "http://127.0.0.1:9090",
    "placeholder": "http://127.0.0.1:9090"
  },
  {
    "name": "token",
    "title": "Access Token",
    "description": "Bearer token if the dashboard is token-gated",
    "type": "password",
    "required": false
  }
]
```

Read them type-safely (the `Preferences` namespace is generated from the manifest):

```ts
import { getPreferenceValues } from "@raycast/api";
const { dashboardUrl, token } = getPreferenceValues<Preferences>();
```

---

## 4. Command lifecycle

- **view** — default-export a React component; it renders in the Raycast window.
- **no-view** — default-export an `async` function; runs, optionally shows Toast/HUD, exits.
- **menu-bar** — default-export a component returning `<MenuBarExtra>`.

Entry point receives `LaunchProps`:

```ts
export default function Command(props: LaunchProps<{ arguments: Arguments.Devices }>) { … }
```

`LaunchProps`: `arguments`, `launchType` (`UserInitiated`|`Background`), `draftValues`
(Form drafts), `fallbackText`, `launchContext` (data from a programmatic `launchCommand`).

**Unloading:** view commands unload on pop-to-root; no-view on completion. Exceeding
memory limits terminates with a user-facing error.

**Cross-command / metadata:**

```ts
import { launchCommand, LaunchType, updateCommandMetadata } from "@raycast/api";
await launchCommand({ name: "devices", type: LaunchType.UserInitiated, context: { … } });
await updateCommandMetadata({ subtitle: `Devices online: ${n}` }); // null clears
```

---

## 5. Arguments · Background refresh · Deeplinks

**Arguments** (root-search inputs) — declared in the manifest (§3.2), read via
`props.arguments.<name>` typed by `Arguments.<Command>`.

**Background refresh** — `interval` on a `no-view`/`menu-bar` command (min `10s`,
disabled by default on install). Detect context:

```ts
import { environment, LaunchType, updateCommandMetadata } from "@raycast/api";
export default async function Command() {
  const fresh = environment.launchType === LaunchType.Background;
  const count = await fetchOnlineDeviceCount();
  await updateCommandMetadata({ subtitle: `Online: ${count}` });
}
```

**Deeplinks** — `raycast://extensions/<owner-or-author>/<extension>/<command>` with
`?launchType=`, `?arguments=<url-encoded-json>`, `?context=`, `?fallbackText=`. Build them
with `createDeeplink` (§11) and expose via `Action.CreateQuicklink`. Every root command has
a built-in "Copy Deeplink" action.

---

## 6. UI components (all from `@raycast/api`)

Four top-level views: **List**, **Grid**, **Detail**, **Form**. Interactivity comes from
`<ActionPanel>` + `<Action>`. Every top-level view accepts `isLoading` and
`navigationTitle`.

### 6.1 List — the workhorse for the dashboard mirror

Key `<List>` props: `isLoading`, `navigationTitle`, `searchBarPlaceholder`, `searchText`,
`onSearchTextChange`, `filtering` (`boolean | { keepSectionOrder }`), `throttle` (for async
search), `isShowingDetail`, `selectedItemId`, `onSelectionChange`, `pagination`
(`{ hasMore, onLoadMore, pageSize }`), `searchBarAccessory` (a `<List.Dropdown>`).

`<List.Item>`: `title*`, `subtitle`, `icon`, `accessories` (`List.Item.Accessory[]`),
`keywords`, `actions`, `detail` (a `<List.Item.Detail>` when parent has `isShowingDetail`).

`List.Item.Accessory`: `{ text | date | tag | icon, tooltip }` — `text`/`tag` accept
`{ value, color }`.

`<List.Dropdown>` (search-bar filter): `tooltip*`, `value`/`defaultValue`/`onChange`,
`storeValue`, children `List.Dropdown.Item {title*, value*, icon?}` /
`List.Dropdown.Section`.

`<List.EmptyView>`: `title`, `description`, `icon`, `actions` — render for empty/error states.

```tsx
import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";

function statusIcon(up: boolean) {
  return {
    source: up ? Icon.CheckCircle : Icon.XMarkCircle,
    tintColor: up ? Color.Green : Color.Red,
  };
}

export function DeviceList({ isLoading, devices, showDetail }: Props) {
  return (
    <List isLoading={isLoading} isShowingDetail={showDetail} searchBarPlaceholder="Filter devices…">
      <List.Section title="Devices" subtitle={`${devices.length}`}>
        {devices.map((d) => (
          <List.Item
            key={d.name}
            icon={statusIcon(d.reachable)}
            title={d.name}
            subtitle={d.host ?? d.mac}
            accessories={[{ tag: { value: d.transport, color: Color.Blue } }, { text: d.identity }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Host" content={d.host ?? d.mac} />
                <Action.OpenInBrowser title="Open Dashboard" url={d.dashboardUrl} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
```

### 6.2 Detail — rich single-item view

`<Detail>`: `markdown` (CommonMark; supports image sizing `![](x.png?raycast-width=250)`
and LaTeX), `metadata` (`<Detail.Metadata>`), `isLoading`, `actions`, `navigationTitle`.

`Detail.Metadata` children: `Label {title*, text?, icon?}`, `Link {title*, target*, text*}`,
`TagList {title*}` → `TagList.Item {text?/icon?, color?, onAction?}`, `Separator`.

### 6.3 Grid — image-forward list

`<Grid>`: `columns` (1–8), `aspectRatio`, `fit` (`Grid.Fit.Contain|Fill`),
`inset` (`Grid.Inset.Small|Medium|Large`), plus the List-style search/pagination props.
`<Grid.Item content* title? subtitle? accessory?>`.

### 6.4 Form — input

`<Form actions enableDrafts? isLoading? searchBarAccessory?>`. Fields share
`id* title? value? defaultValue? error? info? onChange? onBlur? storeValue?`:

| Field                | Extra                                                                |
| -------------------- | -------------------------------------------------------------------- |
| `Form.TextField`     | `placeholder`                                                        |
| `Form.PasswordField` | `placeholder` (not preserved in drafts)                              |
| `Form.TextArea`      | `enableMarkdown`                                                     |
| `Form.Checkbox`      | `label*` (boolean value)                                             |
| `Form.DatePicker`    | `type` (`Date`\|`DateTime`), `min`, `max`                            |
| `Form.Dropdown`      | `Form.Dropdown.Item {value*,title*,icon?}`, `Form.Dropdown.Section`  |
| `Form.TagPicker`     | value is `string[]`                                                  |
| `Form.FilePicker`    | `allowMultipleSelection`, `canChooseDirectories`… (value `string[]`) |

Prefer **`useForm`** from `@raycast/utils` (§10) for validation. `Action.SubmitForm`'s
`onSubmit` will not fire while validation errors exist.

### 6.5 ActionPanel & Action

`<ActionPanel title?>` → `ActionPanel.Section`, `ActionPanel.Submenu {title*}`, and
`Action`s. Primary/secondary actions auto-bind **↵** and **⌘↵** (List/Grid/Detail).

Base `<Action title* onAction? icon? shortcut? style?>` — `style: Action.Style.Destructive`
for dangerous ops (pair with a confirmation Alert — §9). Built-ins:

`Action.CopyToClipboard {content*}`, `Action.Paste {content*}`,
`Action.OpenInBrowser {url*}`, `Action.Open {target*, application?}`,
`Action.Push {target*}` (navigate), `Action.SubmitForm {onSubmit*}`,
`Action.Trash {paths*}`, `Action.ShowInFinder {path*}`,
`Action.CreateQuicklink {quicklink*}`, `Action.PickDate {onChange*}`,
`Action.ToggleQuickLook`.

Shortcut shape: `{ modifiers: ("cmd"|"ctrl"|"opt"|"shift")[], key: "…" }`, or a preset
`Keyboard.Shortcut.Common.Refresh` etc.

### 6.6 Navigation

```tsx
import { useNavigation } from "@raycast/api";
const { push, pop } = useNavigation(); // ESC auto-pops
// declarative equivalent: <Action.Push target={<DeviceDetail … />} />
```

### 6.7 Menu-bar (`MenuBarExtra`)

```tsx
import { MenuBarExtra, Icon, open } from "@raycast/api";
export default function Command() {
  return (
    <MenuBarExtra icon={Icon.Wifi} tooltip="MikroTik" isLoading={false}>
      <MenuBarExtra.Section title="Devices">
        <MenuBarExtra.Item title="router-1 · online" onAction={() => open("raycast://…")} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Refresh" onAction={() => {}} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
```

Return `null` to hide the item. Set `isLoading` to keep the command alive during async work.
`MenuBarExtra.Item` click handler receives `{ type: "left-click" | "right-click" }`.

### 6.8 Colors & Icons

`Color`: `Blue Green Magenta Orange Purple Red Yellow PrimaryText SecondaryText`
(theme-adaptive), plus `Color.Dynamic {light,dark}` and raw hex/rgb/hsl.
`Icon`: 700+ built-ins (`Icon.CheckCircle`, `Icon.Wifi`, `Icon.Globe`, …).
`Image.ImageLike` = URL string | asset filename | `Icon` | `{ fileIcon }` | full `Image`
`{ source, mask: Image.Mask.Circle|RoundedRectangle, tintColor, fallback }`.
Local asset dark variants: `foo.png` + `foo@dark.png`.

---

## 7. Feedback — Toast / HUD / Alert

```ts
import { showToast, Toast, showHUD, confirmAlert, Alert, PopToRootType } from "@raycast/api";

// Toast — async progress / errors (window open). Mutate the instance to update it live.
const t = await showToast({ style: Toast.Style.Animated, title: "Applying…" });
try {
  await doWork();
  t.style = Toast.Style.Success;
  t.title = "Applied";
} catch (e) {
  t.style = Toast.Style.Failure;
  t.title = "Failed";
  t.message = String(e);
}

// HUD — confirm after the window closes.
await showHUD("Done ✅", { popToRootType: PopToRootType.Immediate });

// Alert — confirm BEFORE a destructive action.
if (
  await confirmAlert({
    title: "Disable route?",
    message: "This may drop connectivity.",
    primaryAction: { title: "Disable", style: Alert.ActionStyle.Destructive },
  })
) {
  /* proceed */
}
```

`Toast.Style`: `Success | Failure | Animated`. Toasts support `primaryAction`/`secondaryAction`.
Prefer **`showFailureToast`** (§10) in `catch` blocks.

---

## 8. Data & state

- **`getPreferenceValues<Preferences>()`** — config/secrets (§3.3). `openExtensionPreferences()`
  / `openCommandPreferences()` to send users to settings.
- **`LocalStorage`** — async, per-extension KV (`getItem<T>`, `setItem`, `removeItem`,
  `allItems`, `clear`). Values are `string|number|boolean`. Prefer the **`useLocalStorage`**
  hook (§10) in views.
- **`Cache`** — synchronous string cache (`get/set/has/remove/clear`, `subscribe`), 10 MB LRU
  default. Store JSON via `JSON.stringify`. Prefer **`useCachedState`** / **`useCachedPromise`**.
- **`Clipboard`** — `copy` (`{ concealed }` for secrets), `paste`, `read`/`readText`, `clear`.
- **`environment`** — `isDevelopment`, `appearance`, `launchType`, `assetsPath`,
  `supportPath`, `canAccess(api)`.

---

## 9. `@raycast/utils` — the data-fetching backbone

Install already present (`@raycast/utils`). These hooks give **stale-while-revalidate**
loading, caching, pagination, and optimistic updates — use them instead of raw `useEffect`.

### 9.1 `useFetch` — primary tool for the dashboard REST API

```tsx
import { useFetch } from "@raycast/utils";

const { isLoading, data, error, revalidate, mutate } = useFetch<Device[]>(
  `${dashboardUrl}/api/devices`,
  {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    keepPreviousData: true,
    initialData: [],
    // parseResponse / mapResult available for custom shapes
  },
);
```

Returns `{ isLoading, data, error, revalidate, mutate }` (+ `pagination` when `url` is a
function). Options: `parseResponse`, `mapResult` (→ `{ data, hasMore?, cursor? }` for
pagination), `initialData`, `keepPreviousData`, `execute` (gate), `onError`, `onData`.

### 9.2 `usePromise` / `useCachedPromise`

For non-fetch async (e.g. a small client wrapper doing `POST`/`DELETE`). Same return shape.
`useCachedPromise` persists across launches (`initialData`, `keepPreviousData`).

```tsx
const { data, isLoading, mutate } = useCachedPromise(getStats, [range], { initialData: null });
```

**Optimistic updates** (toggle a device without waiting for the round-trip):

```tsx
await mutate(postJson(`${base}/api/devices/toggle`, { name, enabled }), {
  optimisticUpdate: (list) => list.map((d) => (d.name === name ? { ...d, enabled } : d)),
  rollbackOnError: true,
  shouldRevalidateAfter: true,
});
```

### 9.3 Other hooks

- **`useForm`** — validation + `itemProps` wiring (§6.4). `FormValidation.Required` or a
  `(value) => string | undefined` validator.
- **`useCachedState(key, initial)`** — `useState` backed by Cache, shareable across commands
  (e.g. an `isShowingDetail` toggle).
- **`useLocalStorage(key, initial)`** — async persisted state (`{ value, setValue, removeValue, isLoading }`).
- **`useStreamJSON(url, { dataPath, pageSize, transform, filter })`** — stream a large JSON
  array with pagination (handy for big `/api/events` or packet dumps).
- **`useExec`** — run a local binary (rarely needed here).
- **`useFrecencySorting(data)`** — reorder by frequency+recency; call `visitItem(item)` on use.

### 9.4 Functions & icon helpers

`showFailureToast(error, { title })`, `withCache(fn, { maxAge })`,
`createDeeplink({ command, arguments })`, `executeSQL`, `runAppleScript`,
`getFavicon(url)`, `getProgressIcon(0..1, color)`, `getAvatarIcon(name)`.

---

## 10. Auth: dashboard token vs. OAuth

The dashboard is **bearer-token gated** (`?token=` or `Authorization: Bearer`), not OAuth.
So the simplest, correct model is a **`password` preference** (§3.3) forwarded on every
request. Do **not** reach for `OAuth.PKCEClient` unless you later add a real OAuth provider.

If you ever do need OAuth: `@raycast/utils` provides `OAuthService` (built-ins: GitHub,
Google, Slack, Jira, Linear, Asana, Zoom), `withAccessToken(service)(Component)` to wrap a
command, and `getAccessToken()` to read the token inside it. For a custom provider, build an
`OAuth.PKCEClient` + `new OAuthService({ client, clientId, scope, authorizeUrl, tokenUrl })`.

---

## 11. Shared API client (recommended `src/lib/api.ts`)

Mirror the dashboard's own [`ui/observability/api.ts`](../ui/observability/api.ts) token
pattern so both clients behave identically:

```ts
// src/lib/api.ts
import { getPreferenceValues } from "@raycast/api";

function cfg() {
  const { dashboardUrl, token } = getPreferenceValues<Preferences>();
  return { base: dashboardUrl.replace(/\/$/, ""), token };
}

function authHeaders(token?: string): HeadersInit {
  return token ? { authorization: `Bearer ${token}` } : {};
}

/** Absolute URL with the token appended as a query param (for links / EventSource). */
export function withToken(path: string): string {
  const { base, token } = cfg();
  const url = `${base}${path}`;
  if (!token) return url;
  return `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
}

export async function api<T>(path: string): Promise<T> {
  const { base, token } = cfg();
  const res = await fetch(`${base}${path}`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const { base, token } = cfg();
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(body),
  });
  return (await res.json().catch(() => ({}))) as T;
}
```

Then in a command:

```tsx
import { useFetch } from "@raycast/utils";
import { withToken } from "./lib/api";

const { isLoading, data } = useFetch<Device[]>(withToken("/api/devices"), { initialData: [] });
```

> Reuse the dashboard's TypeScript types where practical: see
> [`ui/observability/types.ts`](../ui/observability/types.ts). Response shapes are defined by
> the server in [`src/observability/dashboard.ts`](../src/observability/dashboard.ts) — treat
> that file as the API contract.

### Dashboard endpoints to mirror (from `src/observability/dashboard.ts`)

| Feature                 | Endpoints                                                                               | Raycast surface                       |
| ----------------------- | --------------------------------------------------------------------------------------- | ------------------------------------- |
| Devices                 | `GET /api/devices`, `POST /api/devices/toggle`                                          | List + toggle action                  |
| Topology / connectivity | `GET /api/topology`                                                                     | Detail (markdown/metadata)            |
| Clients                 | `GET /api/clients`, `/allow` `/block` `/label` `/limits` `/remove` `/set-ip` `/traffic` | List + destructive actions (confirm!) |
| Backups                 | `GET /api/backups`, `/create` `/restore` `/delete` `/rename` `/get`                     | List + Form (create)                  |
| Snapshots               | `GET /api/snapshots`, `/diff`                                                           | List + Detail diff                    |
| Config history          | `GET /api/config/history`, `/get` `/diff` `/restore` `/checkpoint` `/rollback`          | List + Detail                         |
| Usage / stats           | `GET /api/usage`, `/usage/heatmap`, `/stats`, `/meta`                                   | Detail / menu-bar summary             |
| Packet capture          | `GET /api/capture/status` `/packets`, `POST /start` `/stop`                             | List + start/stop actions             |
| Modules                 | `GET /api/modules`, `POST /modules/toggle`                                              | List (toggle)                         |
| AAA                     | `GET /api/aaa/entities`, `/add` `/update` `/remove` `/toggle`                           | List + Form                           |
| S3                      | `GET /api/s3/list`, `/presign` `/delete`                                                | List                                  |
| Live stream             | `GET /api/stream` (WebSocket) · `GET /api/sse` (EventSource fallback)                   | see §11.1                             |

### 11.1 Live updates

Raycast runs on Node, so a browser `EventSource`/`WebSocket` isn't built-in. Two options:

1. **Poll** (simplest, robust): call `revalidate()` on an interval, or set a low
   `interval` on a `menu-bar`/`no-view` command for background summaries.
2. **SSE via a dependency** (`eventsource`) or **WebSocket** (`ws`) against
   `withToken("/api/sse")` / `withToken("/api/stream")` inside a `usePromise` with an
   `abortable` ref. Prefer polling unless you truly need push — extra deps must be justified
   for Store review (§15).

---

## 12. Platform gating & runtime

- **Windows vs macOS:** guard macOS-only APIs. Window Management is **Pro + macOS only**:
  `if (environment.canAccess(WindowManagement)) { … }`. AppleScript (`runAppleScript`) is
  macOS-only.
- **AI (`AI.ask`)** is **Pro**: gate with `environment.canAccess(AI)`; rate-limited
  (10/min, 100/hr).
- Runtime is **Node** (not Bun) — use `fetch`, `node:*`. Avoid `Bun.*`/`bun:sqlite` in `src/`.

---

## 13. Debugging

- `console.log/debug/error` print to the `ray develop` terminal (disabled in Store builds).
- Unhandled exceptions/rejections show a Raycast error overlay (stack trace in dev, message
  only in prod) — always surface expected errors as a **Toast** instead.
- Detect dev: `environment.isDevelopment` or `process.env.NODE_ENV === "development"`.
- React DevTools: `npm i -D react-devtools@6.1.1`, then `⌘⌥D` in dev mode.
- VS Code: install the Raycast VS Code extension → "Attach Debugger".

---

## 14. AI extensions & tools (optional, and thematically apt)

Since the parent project **is** an MCP server, exposing Raycast **tools** lets users drive
the dashboard from Quick AI / AI Chat. A tool = `src/tools/<name>.ts` with a default export
taking one typed input object; register it in the manifest `tools` array.

```ts
// src/tools/list-devices.ts
import { api } from "../lib/api";

type Input = {
  /** Optional case-insensitive substring to filter device names */
  filter?: string;
};

/** List MikroTik devices known to the dashboard, with reachability. */
export default async function tool(input: Input) {
  const devices = await api<Device[]>("/api/devices");
  return input.filter
    ? devices.filter((d) => d.name.toLowerCase().includes(input.filter!.toLowerCase()))
    : devices;
}
```

- **JSDoc matters** — the tool description and each field's `/** … */` guide the AI.
- **Confirmations** for side-effects: export `const confirmation: Tool.Confirmation<Input>`
  returning `{ message, style?: Action.Style.Destructive, info? }` (return `undefined` to
  skip). Use for anything that mutates the router (toggle/restore/remove).
- **Instructions & evals** live under `ai` in the manifest (or `ai.yaml`): `instructions`
  (system-prompt guidance) and `evals` (`input`, `mocks`, `expected` with
  `includes`/`matches`/`meetsCriteria`/`callsTool`).

---

## 15. Store preparation & publishing

Before submitting (`npm run build` and `npm run lint` must pass locally):

- **Manifest:** `author` = Raycast username, `license: MIT`, latest `@raycast/api`,
  accurate `platforms`, ≥1 Title-Case category.
- **Icon:** 512×512 PNG, light+dark safe; remove unused assets.
- **Screenshots:** 2000×1250 PNG (16:10), 3–6, no sensitive data (capture via the dev-mode
  Window Capture hotkey → "Save to Metadata").
- **README.md** at root (required when setup is non-trivial — this extension needs a
  dashboard URL + token, so document how to start `mikrotik-mcp serve --dashboard` and where
  to get the token). Media in a top-level `media/` folder, not `assets/`.
- **CHANGELOG.md** — H2 `## [Title] - {PR_MERGE_DATE}`.
- **Credentials via Preferences only** (no separate "config" command); no external analytics;
  US English.
- **Lockfile:** public Store CI needs npm + a committed `package-lock.json`. In this Bun
  workspace, generate one with `npm install` inside `raycast/` at publish time (or publish
  privately to the `usex` org store, where `ray publish` handles a private extension).
- **Publish:** `npm run publish` (`npx @raycast/api@latest publish`) opens a PR to
  `raycast/extensions`; a private `owner` publishes to the org store instead.

---

## 16. Conventions & gotchas for this extension

1. **Never edit `raycast-env.d.ts`** — change the manifest; `ray` regenerates it (it's
   gitignored). After adding preferences/commands/args, run `npm run dev` once to regenerate
   before relying on the `Preferences`/`Arguments` types.
2. **Prettier width is 120** (root `.prettierrc`). `ray lint` enforces `@raycast/eslint-config`
   (incl. Title Case on `Action`/command titles). Run `npm run lint` / `npm run fix-lint`.
3. **Keep `tsconfig.json` local & commonjs.** Do not extend the root ESM/Bun tsconfig.
4. **Node runtime, not Bun.** No `Bun.*` / `bun:*` in `src/`.
5. **All device I/O goes through the dashboard HTTP API** — never import the MCP server's
   SSH/RouterOS code into the extension. The extension is a UI client.
6. **Destructive actions** (client block/remove, config restore/rollback, backup delete,
   route disable) must use `Action.Style.Destructive` **and** a `confirmAlert`; AI tools must
   add a `Tool.Confirmation`.
7. **Loading UX:** render the component immediately with `isLoading`, then fill — use the
   `@raycast/utils` hooks; show `List.EmptyView` for empty/error states and
   `showFailureToast` in catches.
8. **Reuse dashboard contracts:** align types with `ui/observability/types.ts` and treat
   `src/observability/dashboard.ts` as the endpoint spec so the Raycast views stay a faithful
   mirror of the web dashboard.

---

### Quick links

- Docs index: <https://developers.raycast.com/llms.txt> (append `.md` to any page URL)
- API reference: <https://developers.raycast.com/api-reference>
- Utils: <https://developers.raycast.com/utilities>
- ESLint rules: <https://github.com/raycast/eslint-plugin#rules>
