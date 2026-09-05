---

## name: raycast-extension

description: Comprehensive guide for creating Raycast extensions with TypeScript + React. Use when users request to create, develop, debug, or publish Raycast extensions. Covers project setup, manifest configuration, UI components (List/Detail/Form/Grid), data fetching with caching, preferences & OAuth, menu bar commands, background refresh, and Store publishing. Includes templates and real-world patterns for building native-feeling productivity tools.

# Raycast Extension Development

Build TypeScript + React extensions that run inside Raycast with a strongly-typed API and a native UI design system.

## Prerequisites

Before creating an extension:

- Raycast **1.37.0+** installed
- Node.js **22.14+** and npm **7.6.0+**
- User must be **signed in** to Raycast
- Familiarity with TypeScript and React (recommended: write commands as `tsx` when you render UI)

## Quick Start

### 1. Create Extension Structure

**Option A — Raycast UI (recommended):**

1. Open Raycast → run **Create Extension**
2. Choose a template (Detail, List, Form, Grid, Menu Bar, etc.)
3. Install dependencies + start dev:

   ```bash
   npm install
   npm run dev
   ```

**Option B — CLI scaffold:**

```bash
npm init raycast-extension -t <template-name>
```

Templates are listed in the Raycast “Templates” docs.

### 2. Project Structure

A typical extension looks like:

```text
my-extension/
├── src/              # Command entry files (tsx for UI commands)
├── assets/           # Icons and bundled assets
├── package.json      # Manifest (Raycast + npm fields)
└── tsconfig.json     # TypeScript config
```

Key mapping rule: each command’s `name` in `package.json` maps to an entry point in `src/` (e.g. `name: "create"` → `src/create.tsx`).

### 3. Development Workflow

Start dev mode (Raycast loads your extension from your local folder):

```bash
npm run dev
```

This uses the Raycast CLI under the hood.

Build + validate:

```bash
npm run build
```

(or `npx ray build`)

Notes:

- If your Raycast **Auto-reload on save** preference is enabled, Raycast reloads changes on file save (no manual restarts).
- Stopping the dev server **doesn’t uninstall** the extension; it remains available in Raycast, but won’t reflect new changes until you start dev again.

## Manifest Configuration

Your `package.json` is the extension **manifest**. Beyond normal npm fields, Raycast reads things like `commands`, `preferences`, and `platforms`.

Example:

```jsonc
{
  "name": "example-extension",
  "title": "Example Extension",
  "description": "Search and open results",
  "icon": "assets/icon.png",
  "author": "your-raycast-username",
  "license": "MIT",
  "categories": ["Productivity"],
  "platforms": ["macos", "windows"],
  "commands": [
    {
      "name": "search",
      "title": "Search Example",
      "description": "Search and open results",
      "mode": "view",
    },
  ],
  "dependencies": {
    "@raycast/api": "^1.x",
    "@raycast/utils": "^2.x",
  },
}
```

Command `mode` options:

- `mode: "view"` — renders UI (List / Detail / Form / Grid)
- `mode: "no-view"` — runs without UI (scripts/automation/background refresh helpers) ([Raycast API](https://developers.raycast.com/information/lifecycle/background-refresh "https://developers.raycast.com/information/lifecycle/background-refresh"))
- `mode: "menu-bar"` — renders a MenuBarExtra in macOS menu bar

Icon tips:

- Provide a 512×512 PNG.
- For dark mode variants, you can use an `@dark` suffix for assets (e.g. `icon@dark.png`).

## UI Components

Raycast UI is “React-declared, native-rendered.” The big building blocks are **List, Grid, Detail, Form**, with interactivity via **ActionPanel**.

### Detail View

Use for rich markdown (CommonMark) content, status screens, help text, etc.

```tsx
import { Detail } from "@raycast/api";

export default function Command() {
  return <Detail markdown="# Hello from Raycast\nThis is a Detail view." />;
}
```

### List View

The default UI for collections, search, and results.

```tsx
import { Action, ActionPanel, Icon, List } from "@raycast/api";

export default function Command() {
  return (
    <List searchBarPlaceholder="Search…">
      <List.Item
        title="Raycast Developer Docs"
        icon={Icon.Code}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url="https://developers.raycast.com" />
            <Action.CopyToClipboard content="https://developers.raycast.com" />
          </ActionPanel>
        }
      />
    </List>
  );
}
```

List features worth using:

- Built-in filtering for best performance, plus optional custom filtering (set `filtering={false}` if you handle filtering yourself).
- Typeahead search via `onSearchTextChange`, optionally throttled with `throttle`.
- Sections, empty states (`List.EmptyView`), right-side detail (`isShowingDetail` + `List.Item.Detail`), and pagination.

### Grid View

Use when visuals are primary (icons, images, media). Grid mirrors many List concepts: search, filtering, sections, pagination patterns (especially when paired with `@raycast/utils` pagination helpers).

### Form View

Use Forms for creation/edit flows (create task, file bug, submit request). Forms support:

- Controlled vs uncontrolled items
- Built-in validation patterns (recommended: `useForm` from `@raycast/utils`)
- Draft preservation with `enableDrafts`
- Persistent fields with `storeValue` (restored next time the form renders)

```tsx
import { Action, ActionPanel, Form } from "@raycast/api";

export default function Command() {
  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" storeValue />
      <Form.Dropdown id="priority" title="Priority" storeValue>
        <Form.Dropdown.Item value="high" title="High" />
        <Form.Dropdown.Item value="low" title="Low" />
      </Form.Dropdown>
    </Form>
  );
}
```

ActionPanel UX note: the first two actions are “primary” and “secondary” with default shortcuts (e.g., Enter / Cmd+Enter depending on the container).

## Data Fetching & Caching

For network + async work, prefer `@raycast/utils` hooks. They implement **stale-while-revalidate** caching and keep the last cached value between command runs.

### useFetch

`useFetch` caches responses and provides `data`, `isLoading`, `error`, plus `revalidate` and `mutate` for refresh and optimistic updates.

```tsx
import { Action, ActionPanel, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

type ApiResponse = { items: Array<{ id: string; title: string; url: string }> };

export default function Command() {
  const [query, setQuery] = useState("");

  const { data, isLoading } = useFetch<ApiResponse>(
    `https://api.example.com/search?q=${encodeURIComponent(query)}`,
    {
      execute: query.length > 0,
      keepPreviousData: true,
      // You can also customize the built-in failure toast via failureToastOptions
    },
  );

  return (
    <List isLoading={isLoading} onSearchTextChange={setQuery} throttle>
      {(data?.items ?? []).map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={item.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```

Why this pattern works well:

- `keepPreviousData` avoids flicker when the user types quickly and a new cache key hasn’t been populated yet.
- If you paginate, `useFetch` supports returning a `pagination` object you can pass directly to `List`/`Grid` (note: only the first page is cached).

### useCachedPromise

Use `useCachedPromise` when your “fetch” is an async function (not just a URL), and you still want stale-while-revalidate caching + `mutate` support.

## Preferences & Configuration

Preferences are declared in the manifest (per-extension or per-command). “Required” preferences must be set before the command opens.

Manifest example:

```jsonc
{
  "commands": [
    {
      "name": "search",
      "title": "Search",
      "mode": "view",
      "preferences": [
        {
          "name": "apiToken",
          "type": "password",
          "required": true,
          "title": "API Token",
          "description": "Your API token",
        },
      ],
    },
  ],
}
```

Access them type-safely:

```tsx
import { getPreferenceValues } from "@raycast/api";

type Preferences = { apiToken: string };

const prefs = getPreferenceValues<Preferences>();
```

Security notes:

- Raycast is local-first, uses a local encrypted database, and uses the system Keychain for secure data.
- Raycast connects directly to third-party APIs rather than proxying through Raycast servers (plan for typical client-side API rate limits and auth flows).

## Command Arguments

Arguments are defined in the manifest and requested when launching the command. Limit: **max 3 arguments** per command.

```jsonc
{
  "commands": [
    {
      "name": "search",
      "arguments": [{ "name": "query", "type": "text", "required": false }],
    },
  ],
}
```

Use `LaunchProps` to access:

```tsx
import { LaunchProps } from "@raycast/api";

export default function Command(
  props: LaunchProps<{ arguments: { query?: string } }>,
) {
  const { query } = props.arguments;
  // ...
}
```

## Storage APIs

### LocalStorage

Use for small-to-moderate persisted data shared across commands in an extension. Storage is in Raycast’s local encrypted database, and it’s **not meant for large amounts of data**.

```tsx
import { LocalStorage } from "@raycast/api";

await LocalStorage.setItem("key", JSON.stringify(data));
const value = await LocalStorage.getItem<string>("key");
```

If you want a hook-style API, `@raycast/utils` has `useLocalStorage`.

### Cache

Synchronous CRUD-style storage where values must be **strings** (you serialize/parse yourself).

```tsx
import { Cache } from "@raycast/api";

const cache = new Cache();
cache.set("key", JSON.stringify(data));
const value = cache.get("key");
```

### File Storage (Support Directory)

When storing larger blobs, use Node’s file APIs and write to the extension support directory. Raycast explicitly recommends this approach for large data rather than Storage APIs.

```tsx
import { environment } from "@raycast/api";
import fs from "fs";
import path from "path";

const filePath = path.join(environment.supportPath, "data.json");
fs.writeFileSync(filePath, JSON.stringify({ hello: "world" }));
```

## User Feedback

Use Raycast feedback APIs to keep the user in flow (instead of throwing).

### Toasts

```tsx
import { showToast, Toast } from "@raycast/api";

await showToast({
  style: Toast.Style.Success,
  title: "Done",
  message: "Operation successful",
});
```

### HUD

```tsx
import { showHUD } from "@raycast/api";

await showHUD("✅ Copied to clipboard");
```

### Alerts

```tsx
import { confirmAlert } from "@raycast/api";

const confirmed = await confirmAlert({
  title: "Delete item?",
  message: "This cannot be undone",
  primaryAction: { title: "Delete" },
});
```

## OAuth & Authentication

Raycast supports OAuth using **PKCE** (native/public client). The OAuth API securely stores/retrieves token sets and automatically shows a logout preference.

Low-level PKCE client:

```tsx
import { OAuth } from "@raycast/api";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Service Name",
  providerIcon: "icon.png",
  providerId: "service-id",
  description: "Connect your account",
});
```

Recommended higher-level approach: `@raycast/utils` OAuth utilities:

- `OAuthService` (including built-in providers like GitHub / Linear)
- `withAccessToken` (wraps view/no-view/menu-bar commands)
- `getAccessToken` (read token inside wrapped components)

## Menu Bar Commands

Menu bar commands use `MenuBarExtra` and are **macOS-only** (not available on Windows).

```tsx
import { MenuBarExtra } from "@raycast/api";

export default function Command() {
  return (
    <MenuBarExtra icon="📊" tooltip="Status">
      <MenuBarExtra.Item title="Status: Active" />
      <MenuBarExtra.Item title="Open Dashboard" onAction={() => {}} />
    </MenuBarExtra>
  );
}
```

Important lifecycle detail: menu bar commands aren’t long-lived; Raycast loads them, waits for `isLoading` to become `false` (if you set it), then unloads them. ([Raycast API](https://developers.raycast.com/information/lifecycle/background-refresh "https://developers.raycast.com/information/lifecycle/background-refresh"))

Manifest config:

```jsonc
{
  "name": "status",
  "mode": "menu-bar",
  "interval": "10m",
}
```

(Use `interval` for background refresh; see next section.) ([Raycast API](https://developers.raycast.com/information/lifecycle/background-refresh "https://developers.raycast.com/information/lifecycle/background-refresh"))

## Background Refresh

You can schedule `no-view` and `menu-bar` commands to run periodically via `interval`. Intervals support `s`, `m`, `h`, `d` (examples: `10m`, `12h`, `1d`). ([Raycast API](https://developers.raycast.com/information/lifecycle/background-refresh "https://developers.raycast.com/information/lifecycle/background-refresh"))

**Minimum interval note:** the Background Refresh guide states a minimum of **10 seconds (`10s`)** (use cautiously), while the Manifest reference states **minimum 1 minute (`1m`)**. To stay safe (and battery-friendly), prefer **minutes+** unless you have a strong reason and have tested behavior in Raycast. ([Raycast API](https://developers.raycast.com/information/lifecycle/background-refresh "https://developers.raycast.com/information/lifecycle/background-refresh"))

Detect launch type:

```tsx
import { environment, LaunchType } from "@raycast/api";

if (environment.launchType === LaunchType.Background) {
  // Background refresh logic
}
```

Background refresh behavior:

- Scheduling is not exact (macOS optimizes for energy).
- Commands are auto-terminated if they exceed maximum execution time.
- For Store installs, background refresh starts disabled; it activates after first run or when enabled in preferences. ([Raycast API](https://developers.raycast.com/information/lifecycle/background-refresh "https://developers.raycast.com/information/lifecycle/background-refresh"))

## Best Practices

### Error Handling

Handle “expected” failures (network, missing permissions) and keep the user moving—often with a Toast instead of an error screen.

### Performance

- Prefer built-in List filtering when possible.
- For typeahead APIs, use `onSearchTextChange` + `throttle` and `useFetch` with `keepPreviousData`.
- Cache aggressively (stale-while-revalidate is the default mental model in `@raycast/utils`).

### Type Safety

- Type `getPreferenceValues<T>()`.
- Keep response types explicit (`type ApiResponse = …`) and validate assumptions (especially for external APIs).

### Security

- Don’t log secrets.
- Use Preferences (password type) or OAuth token storage flows; store only what you must.
- Prefer local encrypted storage / Keychain-backed APIs rather than plain files for sensitive data.

## Store Publishing

Published extensions are open-source in the `raycast/extensions` repo and go through review + CI validation before being merged.

### Preparation Checklist

- **Author** matches your Raycast username
- **License** is `MIT`
- Use the **latest Raycast API** version
- Set **platforms** correctly (restrict if you use platform-specific APIs)
- Verify metadata + categories + icons

### Build & Submit

Validate/build:

```bash
npm run build
```

Publish (opens a PR to `raycast/extensions`):

```bash
npm run publish
```

If the script isn’t present, add:

```jsonc
"publish": "npx @raycast/api@latest publish"
```

## Reference Resources

- **Developer Tools** overview (Manage Extensions, CLI, ESLint, etc.)
- **UI API** (List / Detail / Form / Grid + ActionPanel patterns)
- **React hooks** (`useFetch`, `useCachedPromise`, pagination, optimistic updates)
- **Background refresh** (scheduling, constraints, diagnostics) ([Raycast API](https://developers.raycast.com/information/lifecycle/background-refresh "https://developers.raycast.com/information/lifecycle/background-refresh"))
- **Publishing** and **Store readiness** docs

## CLI Commands

Most templates expose these via npm scripts:

```bash
npm run dev        # Start development mode
npm run build      # Build & validate
npm run lint       # Run lint checks
npm run fix-lint   # Auto-fix lint issues (when configured)
npm run publish    # Validate + open PR to raycast/extensions (Store publish flow)
```

CLI equivalents (Raycast CLI):

```bash
npx ray help
npx ray develop
npx ray build
npx ray lint
npx ray migrate
```

## Common Patterns

### Search-Driven Workflow (List + Typeahead)

1. User types in search bar (`onSearchTextChange`)
2. Fetch results with `useFetch` (SWr caching)
3. Render `List.Item`s with `ActionPanel`
4. Use `keepPreviousData` + throttling to avoid flicker and over-fetching

### Form Submission (Create / Edit)

1. Collect inputs with `Form`
2. Validate (recommended: `useForm`)
3. Submit via `Action.SubmitForm`
4. Show Toast/HUD on success; handle expected errors gracefully

### Menu Bar Status + Background Refresh

1. `mode: "menu-bar"` command renders `MenuBarExtra`
2. Use cache so the menu populates instantly
3. Configure `interval` so it refreshes in background
4. Check `environment.launchType` to handle background vs user-initiated runs ([Raycast API](https://developers.raycast.com/information/lifecycle/background-refresh "https://developers.raycast.com/information/lifecycle/background-refresh"))

For the official docs hub:

```text
https://developers.raycast.com
```
