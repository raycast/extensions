# Remote Shelf Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Ten Four's local-file shelf transport with a tailnet-hosted HTTP service so a push from the remote box (Guppy) appears in Raycast on the Mac.

**Architecture:** A dependency-free Node HTTP server on Guppy owns the JSON store and exposes a small REST API at `/shelf`, fronted by `tailscale serve`. The `tenfour` CLI POSTs to it (`TENFOUR_URL`); the Raycast extension polls it (a "Shelf URL" preference). No local-file mode remains.

**Tech Stack:** Node 22 (built-in `http`, `fs`, global `fetch`, `node:test`), TypeScript + `@raycast/api` for the extension, `tailscale serve` + `systemd` for deployment.

## Global Constraints

- **No new runtime dependencies.** Server and CLI use only Node built-ins; the extension uses only `@raycast/api` and global `fetch` (no `node-fetch`, no `@raycast/utils`).
- **Node 22** is the floor (Guppy runs v22.23.1; global `fetch` and `node:test` assumed).
- **Service-only.** No local-file fallback, no dual-mode, no migration of existing `~/.ten-four.json`.
- **No auth token.** `tailscale serve` is the security boundary.
- **Item shape is fixed:** `{ id, label, text, ts, pinned }`.
- **Store path:** `~/.ten-four.json`, overridable with `TENFOUR_FILE`.
- **Copy rule:** no em dashes in any shipped extension/CLI/README text (repo convention — see recent commits).
- **MAX_ITEMS = 200**, with all pinned items retained on top of the most-recent 200 unpinned.

---

### Task 1: Shelf server + tests

**Files:**
- Create: `server/shelf.js`
- Test: `server/shelf.test.js`
- Create: `server/ten-four-shelf.service` (systemd unit)
- Create: `server/README.md` (run + `tailscale serve` instructions)

**Interfaces:**
- Produces (consumed by Task 2 CLI and Task 3 extension over HTTP):
  - `GET /shelf` → `200` `Item[]` (pinned first, then newest by `ts`)
  - `POST /shelf` body `{label?: string, text: string}` → `201` `Item` (server fills `id`, `ts`, `pinned:false`); empty/whitespace `text` → `400 {error}`
  - `PATCH /shelf/:id` body `{pinned: boolean}` → `200` `Item`; unknown id → `404`
  - `DELETE /shelf/:id` → `200 {ok:true}`; unknown id → `404`
  - `DELETE /shelf` → `200 {ok:true}`
- Produces (consumed by `server/shelf.test.js`): module exports `{ createServer, load, save, sortItems, firstLine, truncate, makeId }`.

- [ ] **Step 1: Write the failing test**

Create `server/shelf.test.js`:

```js
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const os = require("os");
const fs = require("fs");
const path = require("path");

// Point the store at a temp file BEFORE requiring the server (STORE is read at load).
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "tenfour-"));
process.env.TENFOUR_FILE = path.join(TMP, "shelf.json");

const { createServer, truncate } = require("./shelf.js");

let server;
let base;

before(async () => {
  server = createServer();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const post = (body) =>
  fetch(`${base}/shelf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

test("GET /shelf is empty initially", async () => {
  const res = await fetch(`${base}/shelf`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), []);
});

test("POST /shelf adds an item and derives the label", async () => {
  const res = await post({ text: "hello world\nsecond line" });
  assert.equal(res.status, 201);
  const item = await res.json();
  assert.equal(item.text, "hello world\nsecond line");
  assert.equal(item.label, "hello world");
  assert.equal(item.pinned, false);
  assert.ok(item.id);
  assert.ok(typeof item.ts === "number");
});

test("POST honors an explicit label", async () => {
  const item = await (await post({ label: "My Label", text: "x" })).json();
  assert.equal(item.label, "My Label");
});

test("POST with blank text is 400", async () => {
  const res = await post({ text: "   " });
  assert.equal(res.status, 400);
});

test("PATCH pins an item", async () => {
  const id = (await (await fetch(`${base}/shelf`)).json())[0].id;
  const res = await fetch(`${base}/shelf/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pinned: true }),
  });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).pinned, true);
});

test("PATCH on unknown id is 404", async () => {
  const res = await fetch(`${base}/shelf/nope`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pinned: true }),
  });
  assert.equal(res.status, 404);
});

test("DELETE /shelf/:id removes one", async () => {
  const id = (await (await fetch(`${base}/shelf`)).json())[0].id;
  const res = await fetch(`${base}/shelf/${id}`, { method: "DELETE" });
  assert.equal(res.status, 200);
  const after = await (await fetch(`${base}/shelf`)).json();
  assert.ok(!after.some((i) => i.id === id));
});

test("DELETE /shelf clears all", async () => {
  await post({ text: "a" });
  const res = await fetch(`${base}/shelf`, { method: "DELETE" });
  assert.equal(res.status, 200);
  assert.deepEqual(await (await fetch(`${base}/shelf`)).json(), []);
});

test("truncate keeps all pinned plus MAX_ITEMS unpinned", () => {
  const items = [];
  for (let i = 0; i < 250; i++)
    items.push({ id: String(i), pinned: false, ts: i, text: "x", label: "x" });
  items.push({ id: "pin", pinned: true, ts: 0, text: "p", label: "p" });
  const out = truncate(items);
  assert.equal(out.filter((i) => i.pinned).length, 1);
  assert.equal(out.filter((i) => !i.pinned).length, 200);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test server/`
Expected: FAIL — `Cannot find module './shelf.js'`.

- [ ] **Step 3: Write the server**

Create `server/shelf.js`:

```js
#!/usr/bin/env node
/*
 * ten-four-shelf: the Ten Four shelf service.
 *
 * Owns the JSON store (~/.ten-four.json) and exposes a small REST API at /shelf.
 * The tenfour CLI pushes to it; the Raycast extension polls it. Bind loopback
 * only and let `tailscale serve` provide TLS + tailnet exposure.
 *
 *   GET    /shelf      -> Item[] (pinned first, then newest)
 *   POST   /shelf      -> add {label?, text} ; returns the Item
 *   PATCH  /shelf/:id  -> set {pinned}       ; returns the Item
 *   DELETE /shelf/:id  -> remove one
 *   DELETE /shelf      -> clear all
 *
 * Store: ~/.ten-four.json  (override TENFOUR_FILE)
 * Port:  7801             (override PORT or TENFOUR_PORT)
 */
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const STORE =
  process.env.TENFOUR_FILE || path.join(os.homedir(), ".ten-four.json");
const PORT = Number(process.env.PORT || process.env.TENFOUR_PORT || 7801);
const HOST = process.env.TENFOUR_HOST || "127.0.0.1";
const MAX_ITEMS = 200;

function load() {
  try {
    const data = JSON.parse(fs.readFileSync(STORE, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function save(items) {
  fs.mkdirSync(path.dirname(STORE), { recursive: true });
  fs.writeFileSync(STORE, JSON.stringify(items, null, 2));
}

function sortItems(items) {
  return [...items].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return b.ts - a.ts;
  });
}

function firstLine(text, max = 60) {
  const line =
    text.replace(/\r/g, "").split("\n").find((l) => l.trim()) || text;
  const t = line.trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function truncate(items) {
  const pinned = items.filter((it) => it.pinned);
  const rest = items.filter((it) => !it.pinned).slice(0, MAX_ITEMS);
  return [...pinned, ...rest].slice(0, MAX_ITEMS + pinned.length);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
  });
}

function json(res, code, body) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function handle(req, res) {
  const url = new URL(req.url, "http://localhost");
  const parts = url.pathname.split("/").filter(Boolean); // ["shelf", id?]
  if (parts[0] !== "shelf") return json(res, 404, { error: "not found" });
  const id = parts[1];

  try {
    if (req.method === "GET" && !id) {
      return json(res, 200, sortItems(load()));
    }
    if (req.method === "POST" && !id) {
      const body = JSON.parse((await readBody(req)) || "{}");
      const text = String(body.text || "").replace(/\n$/, "");
      if (!text.trim()) return json(res, 400, { error: "text is required" });
      const item = {
        id: makeId(),
        label: body.label || firstLine(text),
        text,
        ts: Date.now(),
        pinned: false,
      };
      save(truncate([item, ...load()]));
      return json(res, 201, item);
    }
    if (req.method === "PATCH" && id) {
      const body = JSON.parse((await readBody(req)) || "{}");
      const items = load();
      const item = items.find((i) => i.id === id);
      if (!item) return json(res, 404, { error: "not found" });
      item.pinned = !!body.pinned;
      save(items);
      return json(res, 200, item);
    }
    if (req.method === "DELETE" && id) {
      const items = load();
      if (!items.some((i) => i.id === id))
        return json(res, 404, { error: "not found" });
      save(items.filter((i) => i.id !== id));
      return json(res, 200, { ok: true });
    }
    if (req.method === "DELETE" && !id) {
      save([]);
      return json(res, 200, { ok: true });
    }
    return json(res, 405, { error: "method not allowed" });
  } catch (err) {
    return json(res, 500, { error: err.message });
  }
}

function createServer() {
  return http.createServer(handle);
}

if (require.main === module) {
  createServer().listen(PORT, HOST, () => {
    console.log(`ten-four-shelf on http://${HOST}:${PORT} (store: ${STORE})`);
  });
}

module.exports = { createServer, load, save, sortItems, firstLine, truncate, makeId };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test server/`
Expected: PASS — all tests pass (`# pass 9`, `# fail 0`).

- [ ] **Step 5: Write the systemd unit and deploy doc**

Create `server/ten-four-shelf.service`:

```ini
[Unit]
Description=Ten Four shelf service
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/env node %h/code/ten-four/server/shelf.js
Restart=on-failure
Environment=PORT=7801

[Install]
WantedBy=default.target
```

Create `server/README.md`:

````markdown
# Ten Four shelf service

A dependency-free Node HTTP server that owns the shelf JSON store and exposes
`/shelf`. Run it on a tailnet host (Guppy); the CLI and Raycast extension reach
it over the tailnet.

## Run

```sh
node server/shelf.js        # listens on 127.0.0.1:7801
```

Override with `PORT`, `TENFOUR_FILE`, `TENFOUR_HOST`.

## Run as a service (systemd, user unit)

```sh
mkdir -p ~/.config/systemd/user
cp server/ten-four-shelf.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now ten-four-shelf
systemctl --user status ten-four-shelf
```

## Expose on the tailnet

Map the `/shelf` path to the loopback port with TLS:

```sh
tailscale serve --bg --set-path /shelf http://127.0.0.1:7801/shelf
```

The shelf is then reachable at `https://<host>.<tailnet>.ts.net/shelf`
(e.g. `https://guppy.tail72863e.ts.net/shelf`). Point `TENFOUR_URL` (CLI) and the
Raycast "Shelf URL" preference at that URL.
````

- [ ] **Step 6: Commit**

```bash
git add server/
git commit -m "feat: add tailnet shelf service with REST API and tests"
```

---

### Task 2: Rewrite the `tenfour` CLI to use the service

**Files:**
- Modify: `assets/tenfour` (full rewrite of the store logic)

**Interfaces:**
- Consumes: the Task 1 HTTP API at `$TENFOUR_URL` (`GET`/`POST`/`DELETE /shelf`).
- Produces: same CLI surface as before — `tenfour [--label X] "text"`, stdin (`-`), `list`, `clear`, `--version`. No module exports (it is an executable script).

- [ ] **Step 1: Replace the CLI script**

Replace the entire contents of `assets/tenfour`:

```js
#!/usr/bin/env node
/*
 * tenfour: "copy that." Push a clean, copyable snippet onto the Ten Four shelf.
 *
 * The shelf is an HTTP service (see server/). Set TENFOUR_URL to its /shelf
 * endpoint, e.g. https://guppy.tail72863e.ts.net/shelf. Snippets travel as data,
 * so when you copy them out of Raycast you get the exact bytes: no wrapping, no
 * stray indentation, no mangled line breaks.
 *
 * Usage:
 *   tenfour "the text"                 add a snippet (label = first line)
 *   tenfour --label "Railway URL" "…"  add with an explicit label
 *   tenfour -l "API key" "…"           short form
 *   echo "multi\nline" | tenfour -     read the snippet from stdin
 *   tenfour list                       print the current shelf
 *   tenfour clear                      empty the shelf
 *   tenfour --version                  print version
 *
 * Config: TENFOUR_URL  (the shelf service /shelf endpoint)
 */
const fs = require("fs");

const VERSION = "2.0.0";

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function firstLine(text, max = 60) {
  const line =
    text.replace(/\r/g, "").split("\n").find((l) => l.trim()) || text;
  const t = line.trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

function baseUrl() {
  const url = process.env.TENFOUR_URL;
  if (!url) {
    console.error(
      "tenfour: TENFOUR_URL is not set. Point it at your shelf, e.g.\n" +
        "  export TENFOUR_URL=https://guppy.tail72863e.ts.net/shelf"
    );
    process.exit(1);
  }
  return url.replace(/\/$/, "");
}

async function api(method, suffix = "", body) {
  const res = await fetch(baseUrl() + suffix, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const j = await res.json();
      if (j && j.error) msg = j.error;
    } catch {
      // non-JSON error body; keep the status line
    }
    throw new Error(msg);
  }
  return res.json();
}

async function main() {
  const argv = process.argv.slice(2);

  if (argv[0] === "--version" || argv[0] === "-v" || argv[0] === "version") {
    return console.log(`tenfour ${VERSION}`);
  }
  if (argv[0] === "list") {
    const items = await api("GET");
    if (!items.length) return console.log("Ten Four shelf is empty.");
    items.forEach((it, i) =>
      console.log(`${i + 1}. [${it.label}] ${firstLine(it.text, 80)}`)
    );
    return;
  }
  if (argv[0] === "clear") {
    await api("DELETE");
    return console.log("Ten Four shelf cleared.");
  }

  // parse --label / -l and gather the snippet text
  let label = null;
  const textParts = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--label" || a === "-l") {
      label = argv[++i] ?? null;
    } else if (a === "-" || a === "--stdin") {
      textParts.push(readStdin());
    } else {
      textParts.push(a);
    }
  }

  let text = textParts.join(" ");
  // allow: tenfour < file — but only when stdin is piped/redirected, never on
  // an interactive TTY (where readStdin would block forever waiting on input)
  if (!text.trim() && !process.stdin.isTTY) text = readStdin();
  text = text.replace(/\n$/, ""); // drop one trailing newline, keep internal ones

  if (!text.trim()) {
    console.error(
      'tenfour: nothing to add. Usage: tenfour [--label "X"] "text"  |  echo … | tenfour -'
    );
    process.exit(1);
  }

  const item = await api("POST", "", { label, text });
  console.log(`📋 10-4, added to shelf: ${item.label}`);
}

main().catch((err) => {
  console.error(`tenfour: ${err.message}`);
  process.exit(1);
});
```

- [ ] **Step 2: Verify against a live server (smoke test)**

Run (starts a throwaway server on a temp store, exercises the CLI, then stops it):

```bash
TENFOUR_FILE="$(mktemp -d)/shelf.json" PORT=7811 node server/shelf.js & SRV=$!
sleep 0.5
export TENFOUR_URL=http://127.0.0.1:7811/shelf
node assets/tenfour --label "Smoke" "hello from cli"
node assets/tenfour list
echo "piped line" | node assets/tenfour -l "Piped" -
node assets/tenfour list
node assets/tenfour clear
node assets/tenfour list
kill $SRV
```

Expected output (order):
- `📋 10-4, added to shelf: Smoke`
- `1. [Smoke] hello from cli`
- `📋 10-4, added to shelf: Piped`
- `1. [Piped] piped line` / `2. [Smoke] hello from cli`
- `Ten Four shelf cleared.`
- `Ten Four shelf is empty.`

- [ ] **Step 3: Verify the unset-URL guard**

Run: `env -u TENFOUR_URL node assets/tenfour "x"`
Expected: stderr `tenfour: TENFOUR_URL is not set. …`, exit code 1 (`echo $?` → `1`).

- [ ] **Step 4: Commit**

```bash
git add assets/tenfour
git commit -m "feat: tenfour CLI pushes to the shelf service via TENFOUR_URL"
```

---

### Task 3: Rewrite the Raycast extension to poll the service

**Files:**
- Modify: `package.json` (add the `shelfUrl` preference)
- Modify: `src/ten-four.tsx` (full rewrite: drop file watching, poll the API)

**Interfaces:**
- Consumes: the Task 1 HTTP API at the `shelfUrl` preference value.
- Produces: no exports consumed elsewhere; this is a Raycast view command.

- [ ] **Step 1: Add the preference to `package.json`**

Add a top-level `preferences` array (sibling of `commands`). Insert after the `commands` array:

```json
  "preferences": [
    {
      "name": "shelfUrl",
      "title": "Shelf URL",
      "description": "The Ten Four shelf service endpoint, e.g. https://guppy.tail72863e.ts.net/shelf",
      "type": "textfield",
      "required": true,
      "placeholder": "https://guppy.tail72863e.ts.net/shelf"
    }
  ],
```

- [ ] **Step 2: Replace `src/ten-four.tsx`**

Replace the entire file:

```tsx
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";

type Item = {
  id: string;
  label: string;
  text: string;
  ts: number;
  pinned?: boolean;
};

const { shelfUrl } = getPreferenceValues<{ shelfUrl: string }>();
const BASE = shelfUrl.replace(/\/$/, "");
const POLL_MS = 1000;

function sortItems(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return b.ts - a.ts;
  });
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function preview(text: string): string {
  const line = text.split("\n").find((l) => l.trim()) ?? text;
  return line.trim();
}

function asMarkdown(item: Item): string {
  // Fence the snippet so multiline/whitespace renders verbatim.
  const fence = item.text.includes("```") ? "~~~" : "```";
  return `### ${item.label}\n\n${fence}\n${item.text}\n${fence}`;
}

async function shelfFetch(suffix = "", init?: RequestInit): Promise<Response> {
  const res = await fetch(BASE + suffix, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res;
}

export default function Command() {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(true);
  const lastGood = useRef<Item[]>([]);
  const reachable = useRef(true);

  async function refresh() {
    try {
      const data = (await (await shelfFetch()).json()) as Item[];
      lastGood.current = data;
      setItems(data);
      reachable.current = true;
    } catch (error) {
      // Keep showing the last-known list instead of blanking, and only toast
      // on the transition from reachable -> unreachable.
      if (reachable.current) {
        showToast({
          style: Toast.Style.Failure,
          title: "Can't reach shelf",
          message: error instanceof Error ? error.message : String(error),
        });
      }
      reachable.current = false;
      setItems(lastGood.current);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, POLL_MS);
    return () => clearInterval(iv);
  }, []);

  function toastError(error: unknown) {
    showToast({
      style: Toast.Style.Failure,
      title: "Shelf action failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }

  async function togglePin(item: Item) {
    try {
      await shelfFetch(`/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !item.pinned }),
      });
      await refresh();
    } catch (error) {
      toastError(error);
    }
  }

  async function remove(item: Item) {
    try {
      await shelfFetch(`/${item.id}`, { method: "DELETE" });
      await refresh();
      showToast({ style: Toast.Style.Success, title: "Removed" });
    } catch (error) {
      toastError(error);
    }
  }

  async function clearAll() {
    const ok = await confirmAlert({
      title: "Clear the whole shelf?",
      message: "This removes every snippet, including pinned ones.",
      primaryAction: {
        title: "Clear All",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!ok) return;
    try {
      await shelfFetch("", { method: "DELETE" });
      await refresh();
      showToast({ style: Toast.Style.Success, title: "Shelf cleared" });
    } catch (error) {
      toastError(error);
    }
  }

  const sorted = sortItems(items);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail && sorted.length > 0}
      searchBarPlaceholder="Search snippets…"
    >
      <List.EmptyView
        icon={Icon.Tray}
        title="Shelf is empty"
        description={`Push a snippet from your terminal:  tenfour "your text"`}
      />
      {sorted.map((item) => (
        <List.Item
          key={item.id}
          icon={
            item.pinned
              ? { source: Icon.Tack, tintColor: Color.Yellow }
              : Icon.Clipboard
          }
          title={item.label}
          subtitle={showDetail ? undefined : preview(item.text)}
          accessories={[{ text: timeAgo(item.ts) }]}
          detail={<List.Item.Detail markdown={asMarkdown(item)} />}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title="Copy Snippet"
                  content={item.text}
                />
                <Action.Paste title="Paste to Active App" content={item.text} />
                <Action.CopyToClipboard
                  title="Copy Label"
                  content={item.label}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title={item.pinned ? "Unpin" : "Pin"}
                  icon={Icon.Tack}
                  shortcut={{ modifiers: ["cmd"], key: "p" }}
                  onAction={() => togglePin(item)}
                />
                <Action
                  title="Toggle Detail"
                  icon={Icon.Eye}
                  shortcut={{ modifiers: ["cmd"], key: "y" }}
                  onAction={() => setShowDetail((v) => !v)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Remove Snippet"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => remove(item)}
                />
                <Action
                  title="Clear Shelf"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                  onAction={clearAll}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```

- [ ] **Step 3: Lint (the only check runnable on Guppy)**

Run: `npm run lint`
Expected: no errors. (`ray build` / `ray develop` cannot run on Guppy — they run on the Mac; see Step 4.)

- [ ] **Step 4: Manual verification on the Mac (document, do not run here)**

On the Mac, with the Guppy server running and `/shelf` served: `npm install && npx ray develop`, set the "Shelf URL" preference to `https://guppy.tail72863e.ts.net/shelf`, then from any tailnet host run `tenfour "test"` and confirm it appears within ~1s; test Pin, Remove, Clear.

- [ ] **Step 5: Commit**

```bash
git add package.json src/ten-four.tsx
git commit -m "feat: extension polls the shelf service via a Shelf URL preference"
```

---

### Task 4: Update install guidance and docs

**Files:**
- Modify: `src/install-cli.tsx:108-137` (markdown guidance)
- Modify: `README.md` (How it works + install)
- Modify: `CHANGELOG.md`

**Interfaces:** none (documentation only).

- [ ] **Step 1: Add the `TENFOUR_URL` note to the install command**

In `src/install-cli.tsx`, replace the `markdown` template's closing section. Change the trailing block (currently ending after the Claude Code snippet, lines ~126-137) so the markdown ends with a "Point it at your shelf" section. Replace:

```tsx
---

**For Claude Code users:** add this to your \`CLAUDE.md\` so Claude pushes copyable
snippets automatically:

\`\`\`md
When you output a snippet I'm likely to want to copy (a URL, token, command,
path, or code block), also run:
  tenfour --label "<short label>" "<the exact text>"
so it lands on my Ten Four shelf with clean formatting.
\`\`\`
`;
```

with:

```tsx
---

**Point it at your shelf.** The CLI pushes to the shelf service, so set
\`TENFOUR_URL\` to your service endpoint (and the same URL in this extension's
**Shelf URL** preference):

\`\`\`sh
export TENFOUR_URL=https://guppy.tail72863e.ts.net/shelf
\`\`\`

---

**For Claude Code users:** add this to your \`CLAUDE.md\` so Claude pushes copyable
snippets automatically:

\`\`\`md
When you output a snippet I'm likely to want to copy (a URL, token, command,
path, or code block), also run:
  tenfour --label "<short label>" "<the exact text>"
so it lands on my Ten Four shelf with clean formatting.
\`\`\`
`;
```

- [ ] **Step 2: Update the README "How it works" diagram**

In `README.md`, replace the data-flow line:

```
your terminal / Claude Code  ──tenfour──▶  ~/.ten-four.json  ──▶  Raycast "Ten Four"
```

with:

```
your terminal / Claude Code  ──tenfour──▶  shelf service (/shelf)  ──▶  Raycast "Ten Four"
                              (TENFOUR_URL)   tailnet, owns the store     (Shelf URL pref)
```

Then add a short paragraph after that block:

```markdown
The shelf is a small HTTP service (see [`server/`](server/README.md)) that owns
the store. Run it on any always-on host on your network, expose `/shelf` over
your tailnet with `tailscale serve`, then point `TENFOUR_URL` (CLI) and the
extension's **Shelf URL** preference at it. Snippets still travel as data, so you
copy them out of Raycast with pristine formatting.
```

- [ ] **Step 3: Update CHANGELOG**

Prepend an entry to `CHANGELOG.md` (keep the existing Raycast `{PR_MERGE_DATE}` convention used by the file; match its current heading style):

```markdown
## [2.0.0] - Remote shelf service

- The shelf is now an HTTP service instead of a local file, so pushes from a
  remote box (Claude Code on another host) show up in Raycast on your Mac.
- CLI pushes to `TENFOUR_URL`; the extension reads from a new "Shelf URL"
  preference. Run the service from `server/` and expose `/shelf` over your tailnet.
```

- [ ] **Step 4: Verify docs reference real paths**

Run: `test -f server/README.md && grep -q "TENFOUR_URL" src/install-cli.tsx README.md && echo OK`
Expected: `OK`.

- [ ] **Step 5: Commit**

```bash
git add src/install-cli.tsx README.md CHANGELOG.md
git commit -m "docs: document the shelf service, TENFOUR_URL, and Shelf URL preference"
```

---

## Self-Review

**Spec coverage:**
- Shelf service on Guppy, `/shelf` API, single owner of store → Task 1. ✓
- Service-only / no fallback → Tasks 2 & 3 remove all local-file logic. ✓
- Standalone `server/` in this repo, systemd + `tailscale serve` → Task 1 (unit + `server/README.md`). ✓
- Path exposure under existing hostname → documented in `server/README.md` and README (Task 1, Task 4). ✓
- No auth token → not added; noted in design. ✓
- CLI uses `TENFOUR_URL`, keeps flags, errors when unset → Task 2 (Steps 1, 3). ✓
- Extension "Shelf URL" preference, ~1s poll, keep last-known on failure → Task 3. ✓
- MAX_ITEMS + pinned retention server-side → Task 1 `truncate` + test. ✓
- Error table (400/404/500/unset URL/unreachable) → Task 1 tests + Task 2 guard + Task 3 toast. ✓
- Two-host deployment (git transport, Mac builds extension) → Task 3 Step 4 + README/server docs. ✓
- Testing (server node:test, CLI smoke, extension manual) → Tasks 1-3. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code; the only "manual, do not run here" step (Task 3 Step 4) is inherent to Raycast living on the Mac and is explicitly documented, not deferred. ✓

**Type consistency:** Item shape `{id,label,text,ts,pinned}` is identical across server, CLI, and extension. `sortItems`/`firstLine`/`truncate` signatures match between `server/shelf.js` and its test. The extension's `shelfFetch(suffix, init)` and the server routes (`/shelf`, `/shelf/:id`) agree on paths and methods. CLI `api(method, suffix, body)` matches the same routes. ✓
