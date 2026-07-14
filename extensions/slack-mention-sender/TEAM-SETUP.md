# Slack Mention Sender — Raycast Extension (Setup via Claude Code)

Send a Slack message to **any** channel from Raycast and **@mention any person or bot so they actually get pinged** — something Raycast's built-in Slack "Send Message" can't do (it only sends the destination; typed `@names` land as dead text).

You'll get a Raycast command with:
- a **searchable channel dropdown** (public + 🔒 private)
- a **searchable, multi-select mention picker** (people *and* apps/bots) that produces real pings
- a message box
- your Slack token stored in **Raycast's encrypted preferences**

---

## How to run this (~15 minutes, mostly automated)

You hand this whole file to **Claude Code** and it builds everything. You personally do only two things: **create a Slack token** (Claude can't — it's a credential) and **approve a few terminal actions** when Claude asks.

**Requirements (Claude will check these and help if missing):**
- **macOS** with **Raycast** installed and signed in — https://raycast.com
- **Node.js 18+** — https://nodejs.org (LTS) or `brew install node`

**Steps:**
1. Do **STEP 0** below (create your Slack token) — takes 3 minutes.
2. Open a terminal in a new empty folder, start Claude Code (`claude`).
3. Paste this entire file and say: **"Follow this file end to end."**
4. Approve Claude's terminal actions when prompted (npm install, etc.).
5. When Claude hands off, paste your token into Raycast and test.

---

## STEP 0 — Create your Slack user token (you do this)

This makes messages post **as you**, exactly like typing in Slack.

1. Go to **https://api.slack.com/apps** → sign in → select your workspace.
2. Click **Create New App** → **From an app manifest** → pick your workspace → **Next**.
3. Replace the box contents with this and click **Next** → **Create**:
   ```yaml
   display_information:
     name: Raycast Sender
   oauth_config:
     scopes:
       user:
         - chat:write
         - channels:read
         - groups:read
         - users:read
   ```
4. In the left sidebar click **OAuth & Permissions** → **Install to Workspace** → **Allow**.
   - If you see **"Request to Install"** instead, your workspace requires admin approval — click it and wait for an admin to approve. That's normal.
5. Copy the **User OAuth Token** (starts with `xoxp-`). Keep it handy — you'll paste it into **Raycast** later (never into Claude or any file).

> Notes: You can only post to channels you're a member of (same as Slack). If your token only shows a `xoxb-` (bot) token, the scopes were added under "Bot" instead of "User" — redo step 3's manifest, which puts them under `user:`.

---

## INSTRUCTIONS FOR CLAUDE CODE

You are setting up a **local Raycast extension** on this macOS machine, end to end. Work autonomously; only pause for (a) installing missing prerequisites, (b) the token hand-off at the end, and (c) any OS/Raycast permission prompt the user must click. **You do not need computer-use/desktop control** — `npm run dev` registers the extension into Raycast directly. **Never ask for or handle the user's Slack token** — the user pastes it into Raycast's secure preferences themselves.

### 1. Preflight
- Confirm macOS. Confirm Node ≥ 18: `node --version`. Confirm npm: `npm --version`. If Node is missing/older, stop and tell the user to install Node LTS (`brew install node` or nodejs.org), then continue.
- Confirm Raycast is installed: `ls -d /Applications/Raycast.app`. If missing, stop and tell the user to install Raycast (raycast.com) and sign in, then continue.
- Choose the install directory `~/raycast-slack-extension` and create `src/`, `assets/`, `scripts/` under it. If it already exists, ask before overwriting.

### 2. Write the source files
Create the four files exactly as given in **FILE CONTENTS** below (`package.json`, `tsconfig.json`, `src/send-message.tsx`, `scripts/make-icon.js`).
- In `package.json`, set `"author"` to the user's username: run `whoami`, lowercase it, and replace any non-`[a-z0-9_-]` characters with `-`. (If unsure, leave it as `archive`.)

### 3. Generate the icon
From the extension root, run `node scripts/make-icon.js`. It writes `assets/icon.png` (512×512) using only Node's built-in `zlib` — no image libraries, no Python, no network.

### 4. Install and build
- `npm install` (in the extension root). This also provides the `ray` CLI at `node_modules/.bin/ray`.
- `npm run build` — this typechecks and compiles. Fix any errors before proceeding. (Node 20–25 all work.)

### 5. Import into Raycast
- Run `npm run dev` **in the background** and wait for the line `ready - built extension successfully`. This registers the "Send Slack Message" command into Raycast; **it persists after the watcher stops** — it does not need to keep running.
- The first time, Raycast may show a prompt (e.g. to enable development extensions or to open the command). If it appears, tell the user to accept it.
- Once you see the success line, stop the background `npm run dev` process. Verify the build output exists and report success.

### 6. Hand off to the user
Tell the user, in plain terms:
1. Open Raycast → search **Send Slack Message** → open it.
2. First run only: press **⌘⇧,** to open its preferences, paste the `xoxp-…` token into **Slack User Token**, save, and return to the command.
3. In the form: pick a channel, search/select people or apps to mention, type a message, press **⌘↵** to send. Mentions become real pings.
4. Optional: in Raycast Settings → Extensions, add a **Hotkey** or **Alias** to the command for one-keystroke access.

### Gotchas to know
- Posts **as the user** via their `xoxp-` token (scopes: chat:write, channels:read, groups:read, users:read). Only channels the user belongs to can receive messages.
- If no command appears after `npm run dev` and there were no build errors, the user's Raycast **Organization may block development extensions** — they'll need to check with their Raycast admin.
- Do not create any token file on disk; the token lives only in Raycast's secure preferences.

---

## FILE CONTENTS (for Claude to write verbatim)

### `package.json`
```json
{
  "$schema": "https://www.raycast.com/schemas/extension.json",
  "name": "slack-mention-sender",
  "title": "Slack Mention Sender",
  "description": "Send a Slack message to any channel with real @mentions of users and bots.",
  "icon": "icon.png",
  "author": "archive",
  "license": "MIT",
  "categories": ["Communication", "Productivity"],
  "commands": [
    {
      "name": "send-message",
      "title": "Send Slack Message",
      "subtitle": "Slack",
      "description": "Pick a channel, mention users or bots, and send — mentions become real pings.",
      "mode": "view"
    }
  ],
  "preferences": [
    {
      "name": "token",
      "type": "password",
      "required": true,
      "title": "Slack User Token",
      "description": "Your xoxp-… user token with chat:write, channels:read, groups:read, users:read."
    }
  ],
  "dependencies": {
    "@raycast/api": "latest",
    "@raycast/utils": "latest"
  },
  "devDependencies": {
    "@raycast/eslint-config": "latest",
    "@types/node": "^22.0.0",
    "@types/react": "^18.3.0",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.0.0"
  },
  "scripts": {
    "build": "ray build",
    "dev": "ray develop",
    "lint": "ray lint",
    "fix-lint": "ray lint --fix"
  }
}
```

### `tsconfig.json`
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "include": ["src/**/*"],
  "compilerOptions": {
    "lib": ["ES2023"],
    "module": "commonjs",
    "target": "ES2022",
    "strict": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "resolveJsonModule": true
  }
}
```

### `src/send-message.tsx`
```tsx
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  closeMainWindow,
  getPreferenceValues,
  openCommandPreferences,
  popToRoot,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

interface Preferences {
  token: string;
}

interface Channel {
  id: string;
  name: string;
  isPrivate: boolean;
}

interface SlackUser {
  id: string;
  label: string;
  isBot: boolean;
}

interface Directory {
  channels: Channel[];
  users: SlackUser[];
}

interface FormValues {
  channel: string;
  mentions: string[];
  message: string;
}

/** Token comes only from Raycast's secure preferences — never from disk. */
function getToken(): string {
  const token = getPreferenceValues<Preferences>().token?.trim();
  if (!token) {
    throw new Error("No Slack token set. Open preferences (⌘⇧,) and paste your xoxp-… token.");
  }
  return token;
}

async function slackGet(method: string, token: string, params: Record<string, string>) {
  const url = new URL(`https://slack.com/api/${method}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  const data = (await res.json()) as { ok: boolean; error?: string; [k: string]: unknown };
  if (!data.ok) throw new Error(`${method}: ${data.error ?? "unknown error"}`);
  return data;
}

async function slackPost(method: string, token: string, body: Record<string, unknown>) {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { ok: boolean; error?: string };
  if (!data.ok) throw new Error(`${method}: ${data.error ?? "unknown error"}`);
  return data;
}

async function paginate(method: string, token: string, params: Record<string, string>, key: string) {
  const items: Record<string, unknown>[] = [];
  let cursor = "";
  do {
    const page = await slackGet(method, token, { ...params, ...(cursor ? { cursor } : {}) });
    items.push(...((page[key] as Record<string, unknown>[]) ?? []));
    cursor = ((page.response_metadata as { next_cursor?: string })?.next_cursor ?? "").trim();
  } while (cursor);
  return items;
}

async function loadDirectory(): Promise<Directory> {
  const token = getToken();
  const [rawChannels, rawUsers] = await Promise.all([
    paginate(
      "conversations.list",
      token,
      { types: "public_channel,private_channel", exclude_archived: "true", limit: "200" },
      "channels",
    ),
    paginate("users.list", token, { limit: "200" }, "members"),
  ]);

  const channels: Channel[] = rawChannels
    .filter((c) => c.name)
    .map((c) => ({ id: c.id as string, name: c.name as string, isPrivate: Boolean(c.is_private) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const users: SlackUser[] = rawUsers
    .filter((u) => !u.deleted)
    .map((u) => {
      const profile = (u.profile as { display_name?: string; real_name?: string }) ?? {};
      const label = profile.display_name || profile.real_name || (u.name as string) || (u.id as string);
      return { id: u.id as string, label, isBot: Boolean(u.is_bot) };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  return { channels, users };
}

export default function Command() {
  const { data, isLoading, error, revalidate } = useCachedPromise(loadDirectory);

  async function handleSubmit(values: FormValues) {
    try {
      const token = getToken();
      if (!values.channel) throw new Error("Pick a channel to send to.");

      const mentionTokens = (values.mentions ?? []).map((id) => `<@${id}>`).join(" ");
      const body = (values.message ?? "").trim();
      if (!mentionTokens && !body) throw new Error("Add a message or at least one mention.");
      const text = [mentionTokens, body].filter(Boolean).join(" ");

      const toast = await showToast({ style: Toast.Style.Animated, title: "Sending…" });
      await slackPost("chat.postMessage", token, { channel: values.channel, text });
      toast.style = Toast.Style.Success;
      toast.title = "Message sent";
      await closeMainWindow();
      await popToRoot();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't send",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Message" icon={Icon.Message} onSubmit={handleSubmit} />
          <Action
            title="Reload Channels & Users"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => revalidate()}
          />
          <Action
            title="Open Preferences"
            icon={Icon.Gear}
            shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            onAction={openCommandPreferences}
          />
        </ActionPanel>
      }
    >
      {error ? (
        <Form.Description
          title="Error"
          text={`${error.message}\n\nFix your token in Preferences (⌘⇧,), then press ⌘R to reload.`}
        />
      ) : null}

      <Form.Dropdown id="channel" title="Send to" isLoading={isLoading} storeValue>
        {(data?.channels ?? []).map((c) => (
          <Form.Dropdown.Item
            key={c.id}
            value={c.id}
            title={`#${c.name}`}
            icon={c.isPrivate ? Icon.Lock : Icon.Hashtag}
          />
        ))}
      </Form.Dropdown>

      <Form.TagPicker id="mentions" title="Mention" placeholder="Search people & apps to @mention…">
        {(data?.users ?? []).map((u) => (
          <Form.TagPicker.Item
            key={u.id}
            value={u.id}
            title={u.isBot ? `${u.label} (app)` : u.label}
            icon={u.isBot ? Icon.Bot : Icon.Person}
          />
        ))}
      </Form.TagPicker>

      <Form.TextArea id="message" title="Message" placeholder="Type your message here…" />
      <Form.Description text="Mentioned people/apps are prepended to your message as real @mentions when sent." />
    </Form>
  );
}
```

### `scripts/make-icon.js`
```js
// Generates assets/icon.png (512x512) with only Node's built-in zlib. No deps, no network.
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const W = 512,
  H = 512;
const BG = [74, 21, 75]; // Slack aubergine
const FG = [255, 255, 255];
const m = 120,
  r = 70,
  x0 = m,
  y0 = m,
  x1 = W - m,
  y1 = H - m;

function inside(x, y) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  let cx, cy;
  if (x < x0 + r && y < y0 + r) [cx, cy] = [x0 + r, y0 + r];
  else if (x > x1 - r && y < y0 + r) [cx, cy] = [x1 - r, y0 + r];
  else if (x < x0 + r && y > y1 - r) [cx, cy] = [x0 + r, y1 - r];
  else if (x > x1 - r && y > y1 - r) [cx, cy] = [x1 - r, y1 - r];
  if (cx !== undefined) return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  return true;
}

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const raw = Buffer.alloc(H * (1 + W * 3));
let o = 0;
for (let y = 0; y < H; y++) {
  raw[o++] = 0; // PNG filter byte
  for (let x = 0; x < W; x++) {
    const col = inside(x, y) ? FG : BG;
    raw[o++] = col[0];
    raw[o++] = col[1];
    raw[o++] = col[2];
  }
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // color type: RGB
const idat = zlib.deflateSync(raw, { level: 9 });
const png = Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);

const out = path.join(process.cwd(), "assets", "icon.png");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, png);
console.log("Wrote", out, png.length, "bytes");
```

---

## First run & test (you do this after Claude finishes)

1. Open Raycast, search **Send Slack Message**, open it.
2. Press **⌘⇧,**, paste your `xoxp-…` token into **Slack User Token**, save, go back.
3. Pick a channel, add a mention or two, type a short test message, press **⌘↵**.
4. You should see "Message sent" and a real ping land in Slack.

## Troubleshooting
| Symptom | Fix |
|---|---|
| `invalid_auth` | Token wrong/empty — re-open Preferences (⌘⇧,) and re-paste the `xoxp-` token. |
| `missing_scope` | A scope wasn't granted — in your Slack app add the four User scopes, then **Reinstall to Workspace**. |
| `not_in_channel` | You're not a member of that channel — join it in Slack first. |
| Command never appears (no build errors) | Your Raycast Organization may block development extensions — ask your Raycast admin. |
| `node`/`npm` not found | Install Node LTS (nodejs.org or `brew install node`) and rerun. |
| Channel/person missing | Press **⌘R** in the command to reload channels & users. |

## Notes
- Posts **as you** (your user token). You can only post to channels you belong to.
- The token is stored only in Raycast's encrypted preferences — nothing is written to disk.
- To edit later: change `src/send-message.tsx`, run `npm run dev` in the extension folder to hot-reload, then stop it — changes persist.
