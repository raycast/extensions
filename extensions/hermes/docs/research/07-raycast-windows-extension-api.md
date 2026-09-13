# 07 — Raycast for Windows: Extension Development API (ground truth)

> **Status:** researched 2026-08-19 against (a) the Raycast for Windows app installed on this
> machine, (b) the `@raycast/api` npm tarballs, (c) the official JSON Schema, (d) the official
> docs at developers.raycast.com.
> Everything below is traceable to a file path + line/offset or a literal command output.
> Anything not verified is explicitly marked **UNVERIFIED**.
>
> **Adversarial fact-check pass: 2026-08-19.** Every schema constraint, `types/index.d.ts` line
> citation, minified backend identifier, CLI code quote and docs quote in this file was re-checked
> against the live sources (`@raycast/api@2.0.3` + `@1.104.25` npm tarballs, the downloaded
> `extension.json` schema, the installed app under `C:\Program Files\WindowsApps\`, the 8 installed
> Store extensions, and `developers.raycast.com/*.md`). Corrections applied inline; each is flagged
> with *(corrected 2026-08-19)*. The §3.2 example manifest was machine-validated against the
> official schema (`jsonschema` Draft 2020-12): **0 errors**.

---

## 0. Environment snapshot (this machine, verified)

| Fact | Value | Source |
| --- | --- | --- |
| Raycast for Windows version | **2.0.3.0** (MSIX/AppX, x64) | `Get-AppxPackage -Name *Raycast*` → `PackageFullName : Raycast.Raycast_2.0.3.0_x64__qypenmj9wpt2a` |
| App install root | `C:\Program Files\WindowsApps\Raycast.Raycast_2.0.3.0_x64__qypenmj9wpt2a\` | same |
| App payload root | `…\Raycast\` (`Raycast.exe`, `Raycast.dll`, `backend\`, `api\`, `frontend\`) | dir listing |
| Bundled Node.js for extensions | **22.22.2** | `(Get-Item "…\Raycast\backend\node.exe").VersionInfo.ProductVersion` → `22.22.2` |
| Bundled React (runtime) | **19.2.1** | string `"19.2.1"` in `…\Raycast\api\node_modules\react\react.production.js` |
| Bundled react-reconciler | 19.0.0 | string `"19.0.0"` in `…\Raycast\api\node_modules\react-reconciler\react-reconciler.production.js` |
| Raycast user data root | `C:\Users\<usuario>\AppData\Local\Raycast\` | dir listing |
| Local/dev extension root (what the app reads) | `C:\Users\<usuario>\.config\raycast\extensions\` | `function Au(){return Zs.join(TXt(),".config","raycast")}` and `function $t(e){return Zs.join(Au(),"extensions",e.uuid\|\|e.name)}` in `…\Raycast\backend\index.mjs` |
| Per-extension support dir (`environment.supportPath`) | `C:\Users\<usuario>\AppData\Local\Raycast\extensions\<uuid>\` | dir listing; matches `function ns(e){return Zs.join(te.SUPPORT_DIR,"extensions",e.uuid\|\|e.name)}` in `backend\index.mjs` |
| `Cache` on-disk directory name | `com.raycast.api.cache` (inside supportPath) | observed dir `…\AppData\Local\Raycast\extensions\c460fc92-…\com.raycast.api.cache\`; string in `…\Raycast\api\node_modules\@raycast\api\index.js` |
| Latest `@raycast/api` on npm | **2.0.3** (published 2026-08-19T13:22:18Z) | `npm view @raycast/api version` → `2.0.3`; `npm view @raycast/api dist-tags` → `{"latest":"2.0.3","latest-v0":"0.71.7"}` |
| Previous 1.x line | `1.104.25` (2026-08-18) | `npm view @raycast/api time` |
| Latest `@raycast/utils` on npm | **2.3.0** | `npm view @raycast/utils version` |
| `@raycast/api` versions actually used by the 8 extensions installed on this Windows machine | `^1.77.1`, `^1.100.2`, `^1.104.2`, `^1.104.3`, `^1.104.6`, `^1.104.8`, `^1.104.13`, `^1.104.19` — **none is 2.x** | grep of each `C:\Users\<usuario>\.config\raycast\extensions\<uuid>\package.json` |
| `@raycast/api` pinned by the scaffold template shipped **inside** Raycast 2.0.3 | `"@raycast/api": "^1.104.20"`, `"@raycast/utils": "^2.2.7"` | `…\Raycast\api\template\package.json` |

> **Version guidance:** the template that Raycast for Windows 2.0.3 itself writes when you scaffold an
> extension pins `@raycast/api@^1.104.20`. `2.0.3` exists on npm and its `types/index.d.ts` is a
> superset, but the 2.0.3 **CLI** has a Windows-affecting default-target regression (see §15.4).
> Safest choice today: **`"@raycast/api": "^1.104.20"`** (what the app scaffolds), or `^2.0.3`
> *only* with `ray develop --target release`.

---

## 1. Where the authoritative artifacts live

| Artifact | Path / URL |
| --- | --- |
| Official manifest JSON Schema | `https://www.raycast.com/schemas/extension.json` (`$id: https://raycast.com/schemas/extension.json`) — this is the schema `ray lint` / `ray validate` use (`--schema` flag overrides it) |
| Scaffold template shipped with the Windows app | `C:\Program Files\WindowsApps\Raycast.Raycast_2.0.3.0_x64__qypenmj9wpt2a\Raycast\api\template\` |
| Raycast-provided runtime `@raycast/api` (what extensions actually load) | `…\Raycast\api\node_modules\@raycast\api\index.js` (986 KB, single file) |
| Symlink extensions resolve `node_modules` through | `C:\Users\<usuario>\.config\raycast\extensions\node_modules` → `C:\Program Files\WindowsApps\Raycast.Raycast_2.0.3.0_x64__qypenmj9wpt2a\Raycast\api\node_modules` |
| TypeScript definitions (API surface) | `@raycast/api` npm tarball → `types/index.d.ts` (9519 lines in 2.0.3, 9100 in 1.104.25) |
| `ray` CLI | `@raycast/api` npm tarball → `bin/run.js` (+ `bin/run.cmd` for Windows), `dist/commands/*` |
| Docs index | `https://developers.raycast.com/llms.txt` (every page also available as `<url>.md`) |

---

## 2. Scaffold procedure on Windows

### 2.1 The supported path — in-app "Create Extension"

Documented flow (`https://developers.raycast.com/basics/create-your-first-extension.md`):

1. Open Raycast → run the **Create Extension** command (you must be signed in; `Manage Extensions`
   and `Import Extension` are the sibling commands, per `basics/getting-started.md`).
2. Enter name, pick a template, pick a parent folder, press `⌘` `↵`. *(The docs only ever spell the
   macOS chord `⌘` `↵`; the Windows equivalent `Ctrl+Enter` is the obvious mapping but is
   **UNVERIFIED** — not stated anywhere in the docs.)*
3. `cd` into the created folder and run:
   ```
   npm install && npm run dev
   ```
4. Docs verbatim: *"`npm run dev` starts the extension in development mode with hot reloading,
   error reporting and more"*. Stop with `Ctrl+C`.

Documented prerequisites (`basics/getting-started.md`): Raycast ≥ 1.26.0, **Node.js 22.14 or higher**,
npm ≥ 7, React + TypeScript knowledge. (The `@raycast/api` package itself declares
`"engines": { "node": ">=22.22.2" }` — see §16.)

### 2.2 `npm init raycast-extension` — **DO NOT USE ON WINDOWS**

`npm init raycast-extension` resolves to the npm package **`create-raycast-extension`**:

```
npm view create-raycast-extension version   →  0.1.0
created: 2022-10-06 ; only version ever published: 0.1.0
maintainers: mathieudutour ; author: thomaspaulmann
```

Its `dist/index.js` hard-codes POSIX temp paths and shells out to `git`:

```js
const templatesRepoPath = `/tmp/raycast-templates-${repo.replace("/", "-")}`;
```

It git-clones `raycast/extensions` sparse-checkout `templates/` into `/tmp/...`. On Windows `/tmp`
resolves to the current drive root, and the tool is 4 years stale relative to the current template.
**It is not the documented path and must not be used.** Use the in-app *Create Extension* command,
or copy the template shipped inside the app (§2.3).

### 2.3 Exactly what the scaffold produces (verified, from the app's own template)

`…\Raycast\api\template\` contains:

```
template
├── .gitignore
├── .prettierrc
├── eslint.config.js
├── package.json
├── tsconfig.json
├── assets/extension-icon.png       (512x512 PNG, 81903 bytes)
├── src/
│   ├── ai.tsx
│   ├── blank.ts
│   ├── detail.tsx
│   ├── form.tsx
│   ├── grid.tsx
│   ├── list-and-detail.tsx
│   ├── menu-bar-extra.tsx
│   ├── script.ts
│   ├── static-list.tsx
│   ├── typeahead-search.tsx
│   └── tools/
│       ├── blank.ts
│       └── confirmation.ts
└── dist/   (prebuilt copies of the above, used by the app when materialising a template)
```

Documented final layout for a *single-command* extension
(`https://developers.raycast.com/information/file-structure.md`, verbatim):

```bash
extension
├── .prettierrc
├── assets
│   └── icon.png
├── eslint.config.js
├── node_modules
├── package-lock.json
├── package.json
├── src
│   ├── command.tsx
└── tsconfig.json
```

Plus `raycast-env.d.ts`, generated by the CLI on every build (and git-ignored — see `.gitignore` below).

**`…\Raycast\api\template\tsconfig.json` (literal):**
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "include": ["src/**/*", "raycast-env.d.ts"],
  "compilerOptions": {
    "lib": ["ES2023"],
    "module": "commonjs",
    "target": "ES2023",
    "strict": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "jsx": "react-jsx",
    "resolveJsonModule": true
  }
}
```

**`…\Raycast\api\template\eslint.config.js` (literal):**
```js
const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([...raycastConfig]);
```

**`…\Raycast\api\template\.prettierrc` (literal):**
```json
{
  "printWidth": 120,
  "singleQuote": false
}
```

**`…\Raycast\api\template\.gitignore` (literal):**
```
# See https://github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules

# Raycast specific files
raycast-env.d.ts
.raycast-swift-build
.swiftpm
compiled_raycast_swift
compiled_raycast_rust

# misc
.DS_Store
```
*(the first line in the real file reads `# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.`)*

**`…\Raycast\api\template\package.json` — devDependencies + scripts block (literal excerpt;
*abridged — the real `scripts` block also contains `"_template_build": "ray build --skip-types -e dist -o dist"`,
which is internal to Raycast's template-materialisation step and must not be copied into your own manifest*):**
```json
{
  "scripts": {
    "dev": "ray develop",
    "lint": "ray lint",
    "fix-lint": "ray lint --fix",
    "build": "ray build",
    "publish": "npx @raycast/api@latest publish",
    "prepublishOnly": "echo \"\\n\\nIt seems like you are trying to publish the Raycast extension to npm.\\n\\nIf you did intend to publish it to npm, remove the \\`prepublishOnly\\` script and rerun \\`npm publish\\` again.\\nIf you wanted to publish it to the Raycast Store instead, use \\`npm run publish\\` instead.\\n\\n\" && exit 1"
  },
  "dependencies": {
    "@raycast/api": "^1.104.20",
    "@raycast/utils": "^2.2.7"
  },
  "devDependencies": {
    "@raycast/eslint-config": "^2.2.0",
    "@types/node": "22.19.17",
    "@types/react": "19.0.10",
    "eslint": "^10.5.0",
    "prettier": "^3.8.5",
    "typescript": "^6.0.3"
  }
}
```

> Note the app's template pins bleeding-edge devDeps (`eslint ^10`, `typescript ^6`). The
> *store extensions actually installed on this machine* use `eslint ^9.36.0`, `typescript ^5.8.2`,
> `@types/node 22.13.9`, `@types/react ^19.2.16` (see `…\.config\raycast\extensions\30370bf8-…\package.json`).
> Either works; the CLI does not enforce devDependency versions.

### 2.4 Template command sources (literal, useful as canonical examples)

`…\Raycast\api\template\src\detail.tsx`:
```tsx
import { Detail } from "@raycast/api";

export default function Command() {
  return <Detail markdown="# Hello World" />;
}
```

`…\Raycast\api\template\src\script.ts` (a `no-view` command):
```ts
import { showHUD, Clipboard } from "@raycast/api";

export default async function main() {
  const now = new Date();
  await Clipboard.copy(now.toLocaleDateString());
  await showHUD("Copied date to clipboard");
}
```

`…\Raycast\api\template\src\ai.tsx`:
```tsx
import { Detail } from "@raycast/api";
import { useAI } from "@raycast/utils";

export default function Command() {
  const { data, isLoading } = useAI("Suggest 5 jazz songs");

  return <Detail isLoading={isLoading} markdown={data} />;
}
```

`…\Raycast\api\template\src\tools\confirmation.ts`:
```ts
import { Tool } from "@raycast/api";

type Input = {
  /** The description for the input property */
  query: string;
};

export default async function (input: Input) {
  // Your tool code here
  console.log("Tool executed with input:", input);
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: "Run Tool",
    info: [{ name: "Query", value: input.query }],
  };
};
```

---

## 3. Manifest (`package.json`) — complete, schema-verified

Source of truth: `https://www.raycast.com/schemas/extension.json` (downloaded 2026-08-19, 30417 bytes).

### 3.1 Top-level

```
"required": ["name", "title", "description", "icon", "author", "license", "commands", "dependencies"]
"properties": icon, name, debug, owner, title, access, author, license, platforms, commands,
              tools, ai, keywords, description, preferences, categories, contributors,
              pastContributors, dependencies, external, scripts
```

> ⚠️ **Discrepancy:** the schema's `required` array does **not** include `platforms` or `categories`,
> but `https://developers.raycast.com/information/manifest.md` marks both with a red `*` (required).
> Treat them as required for the Store; always declare them.

| Field | Type / constraint (from schema) |
| --- | --- |
| `name` | string, `^(@workaround/)?[a-z0-9-~][a-z0-9-_~]*$`, len 3–255 |
| `title` | string, `^[^\s]+(?: [^\s]+)*$`, len 2–255 |
| `description` | string, `^[^\s]+(\s+[^\s]+)*$`, len **16**–2048 |
| `icon` | string, `contentMediaType: image/png`; 512×512; `@dark` suffix for dark theme |
| `author` | string, `^[a-zA-Z0-9-*~][a-zA-Z0-9-*._~]*$`, len 2–75 — your **Raycast Store handle** |
| `license` | `"MIT"` (`const`; nothing else accepted) |
| `platforms` | array of `"macOS" \| "Windows"`, `minItems: 1`, `uniqueItems` — see §4 |
| `categories` | array of enum: `Applications, Communication, Data, Documentation, Design Tools, Developer Tools, Finance, Fun, Media, News, Productivity, Security, System, Web, Other` |
| `keywords` | array of string, `^[^,\r\n\t]+$`, each len 1–25, `maxItems: 12`, unique |
| `commands` | array, `minItems: 1`, `maxItems: 100`, unique — see §5 |
| `tools` | array, `minItems: 0`, `maxItems: 100` — see §14 |
| `ai` | object `{ instructions?: string, evals?: [{ input: string, usedAsExample?: boolean }] }` |
| `preferences` | array — see §6 |
| `owner` | string (same pattern as `author`); presence ⇒ private unless `access: "public"` |
| `access` | `"public" \| "private"` |
| `contributors` / `pastContributors` | array of handles |
| `external` | array of strings — packages/files excluded from the bundle, `import` preserved & evaluated at runtime |
| `dependencies` | object; **`"@raycast/api"` is `required`** |
| `scripts` | object with known keys `dev`, `build`, `lint`, `fix-lint`, `publish`, `prepublishOnly` |
| `debug` | `{ reloadShortcut: { modifiers: ("command"\|"option"\|"control"\|"shift")[], key: string } }` — note these modifier names differ from `Keyboard.KeyModifier` |

### 3.2 COMPLETE valid example manifest (Windows-targeted)

This is a synthesised-but-schema-valid manifest that exercises every field an implementation agent
is likely to need. Field shapes copied verbatim from the schema and from real installed extensions.

```json
{
  "$schema": "https://www.raycast.com/schemas/extension.json",
  "name": "hermes-agent",
  "title": "Hermes Agent",
  "description": "Talk to your local Hermes agent from Raycast: ask questions, stream answers, and act on the current selection.",
  "icon": "extension-icon.png",
  "author": "desenvolvimento",
  "categories": ["Developer Tools", "Productivity"],
  "keywords": ["hermes", "agent", "ai", "assistant"],
  "license": "MIT",
  "platforms": ["Windows"],
  "commands": [
    {
      "name": "ask",
      "title": "Ask Hermes",
      "subtitle": "Hermes Agent",
      "description": "Send a prompt to the local Hermes agent and stream the answer.",
      "mode": "view",
      "icon": "command-ask.png",
      "keywords": ["prompt", "chat"],
      "arguments": [
        {
          "name": "prompt",
          "type": "text",
          "placeholder": "What do you want to ask?",
          "required": false
        },
        {
          "name": "profile",
          "type": "dropdown",
          "placeholder": "Profile",
          "required": false,
          "data": [
            { "title": "Default", "value": "default" },
            { "title": "Fast", "value": "fast" }
          ]
        }
      ],
      "preferences": [
        {
          "name": "streamResponses",
          "title": "Streaming",
          "label": "Stream responses token by token",
          "description": "Render the answer incrementally as it arrives from the agent.",
          "type": "checkbox",
          "required": false,
          "default": true
        }
      ]
    },
    {
      "name": "ask-selection",
      "title": "Ask About Selection",
      "description": "Send the text currently selected in the foreground app to Hermes.",
      "mode": "view",
      "shortcut": {
        "macOS": { "modifiers": ["cmd", "shift"], "key": "h" },
        "Windows": { "modifiers": ["ctrl", "shift"], "key": "h" }
      }
    },
    {
      "name": "refresh-index",
      "title": "Refresh Hermes Index",
      "description": "Refresh the cached Hermes capability index in the background.",
      "mode": "no-view",
      "interval": "30m",
      "disabledByDefault": true
    }
  ],
  "tools": [
    {
      "name": "ask-hermes",
      "title": "Ask Hermes",
      "description": "Sends a natural-language question to the local Hermes agent and returns its answer.",
      "icon": "command-ask.png"
    }
  ],
  "ai": {
    "instructions": "Always show the Hermes run id next to the answer.",
    "evals": [
      {
        "input": "@hermes-agent what tools do you have?",
        "usedAsExample": true
      }
    ]
  },
  "preferences": [
    {
      "name": "baseUrl",
      "title": "Hermes API Base URL",
      "description": "Base URL of the local Hermes API server, e.g. http://127.0.0.1:8642",
      "type": "textfield",
      "required": true,
      "placeholder": "http://127.0.0.1:8642",
      "default": { "Windows": "http://127.0.0.1:8642", "macOS": "http://127.0.0.1:8642" }
    },
    {
      "name": "apiKey",
      "title": "Hermes API Key",
      "description": "Bearer token used to authenticate against the Hermes API server.",
      "type": "password",
      "required": true
    },
    {
      "name": "defaultModel",
      "title": "Default Model",
      "description": "Model used when a command does not specify one explicitly.",
      "type": "dropdown",
      "required": false,
      "default": "auto",
      "data": [
        { "title": "Auto", "value": "auto" },
        { "title": "Fast", "value": "fast" },
        { "title": "Deep", "value": "deep" }
      ]
    },
    {
      "name": "transcriptDirectory",
      "title": "Transcript Folder",
      "description": "Folder where conversation transcripts are written when you export them.",
      "type": "directory",
      "required": false
    }
  ],
  "dependencies": {
    "@raycast/api": "^1.104.20",
    "@raycast/utils": "^2.2.7"
  },
  "devDependencies": {
    "@raycast/eslint-config": "^2.2.0",
    "@types/node": "22.19.17",
    "@types/react": "19.0.10",
    "eslint": "^9.36.0",
    "prettier": "^3.8.5",
    "typescript": "^5.8.2"
  },
  "scripts": {
    "build": "ray build -e dist",
    "dev": "ray develop",
    "fix-lint": "ray lint --fix",
    "lint": "ray lint",
    "publish": "npx @raycast/api@latest publish"
  }
}
```

Notes on the example:
* `commands[].shortcut` is **not documented** in `information/manifest.md` and is **not** in the
  schema's explicit command property list — but command items are declared
  `"additionalProperties": true`, and a real Store extension installed on this Windows machine uses
  exactly this shape (see §8.3). Safe to use.
* `preferences[].default` as a per-platform object is officially supported (§6.3).
* `"platforms": ["Windows"]` alone is schema-valid (`minItems: 1`); use `["macOS","Windows"]` if you
  also ship for macOS.

---

## 4. `platforms` — exact accepted values (**VERIFIED, case-sensitive**)

Schema (`extension.json` → `properties.platforms`), literal:

```json
{
  "type": "array",
  "items": { "enum": ["macOS", "Windows"], "type": "string" },
  "title": "The extension's supported platforms",
  "description": "Currently only `macOS` and `Windows` are accepted. If not present, the extension is assumed to be available on all platforms.",
  "minItems": 1,
  "uniqueItems": true
}
```

Independent confirmations:

1. **On-disk, real extensions installed on this Windows machine** — e.g.
   `C:\Users\<usuario>\.config\raycast\extensions\20c4bfd5-bd88-44e4-a270-815dac42e0f4\package.json`:
   ```json
   "platforms": [
     "macOS",
     "Windows"
   ]
   ```
   Same exact casing in `5fdb86d3-…` (bitwarden), `c460fc92-…` (weather), `dbec16d9-…`
   (media-converter), `f1d79c96-…` (font-sniper), `65e6105d-…` (remove-paywall).
2. **Docs** `information/manifest.md` line 41: ``An Array of platforms supported by the extension(`"macOS"` or `"Windows"`)``, and the sample manifest at line 16: `"platforms": ["macOS", "Windows"],`.
3. **App backend**, `…\Raycast\backend\index.mjs`: store search sends `explicit_platform=Windows`
   (`new URLSearchParams({ q: i, page: …, per_page:"50", ...{[n?"platform":"explicit_platform"]:"Windows"} })`),
   and onboarding filters with `.filter(i => i.platforms.includes("macOS"))`.
   Internally the platform id is lowercase (`Ua="windows"`) but it is mapped for the manifest/API
   surface: `Ua==="windows" ? "Windows" : "macOS"`.

**❌ Wrong:** `["windows"]`, `["win32"]`, `["Win"]`, `["macos"]`.
**✅ Right:** `["Windows"]` or `["macOS", "Windows"]`.

### 4.1 Default when omitted — contradiction, resolve by always declaring

* Schema says: *"If not present, the extension is assumed to be available on all platforms."*
* Changelog `https://developers.raycast.com/misc/changelog.md` (§1.103.0 — 2025-09-15) says, verbatim:
  *"there's a new `platforms` field in the manifest. We've intentionally chosen to release only
  extensions that we are tested on Windows. This is the field that allow extensions to be available
  on Windows. By default, if not specified, the field's value is `["macOS"]`. If you want to make an
  extension available on Windows, you can set it to `["macOS", "Windows"]`"*

**Action:** always set `platforms` explicitly. Never rely on the default.

---

## 5. Commands

### 5.1 `mode` — exactly three values

Schema `properties.commands.items.properties.mode`:
```json
{ "enum": ["view", "no-view", "menu-bar"], "type": "string" }
```
Schema description (verbatim): *"A value of 'view' indicates that the command will show a main view
when performed. 'no-view' means that the command does not push a view to the main navigation stack
in Raycast. … 'menu-bar' renders an extra item in the **macOS** system menu bar at the top of the
screen."*

**`menu-bar` on Windows — CONFIRMED UNSUPPORTED.**
`https://developers.raycast.com/api-reference/menu-bar-commands.md`, line 8, verbatim:

> **Menubar commands aren't available on Windows.**

Nuance observed on disk: the `weather` extension installed here declares
`"platforms": ["macOS","Windows"]` *and* contains a `"mode": "menu-bar"` command
(`…\.config\raycast\extensions\c460fc92-…\package.json`). So Raycast does **not** reject a
menu-bar command in a Windows-enabled manifest — it simply does not surface it on Windows.
Do not build features that depend on it.

### 5.2 Command properties (schema-exact)

Required: `["name", "title", "description", "mode"]`. `additionalProperties: true`.

| Property | Constraint |
| --- | --- |
| `name` | `^[a-z0-9-~][a-zA-Z0-9-._~]*$`, len 2–255. Maps to `src/<name>.{ts,tsx,js,jsx}` |
| `title` | `^[^\s]+(?: [^\s]+)*$`, len 2–255 |
| `description` | `^[^\s]+(\s+[^\s]+)*$`, len **12**–2048 |
| `mode` | `view` \| `no-view` \| `menu-bar` |
| `subtitle` | `^[^\s]+(?: [^\s]+)*$`, len 2–255. Shown next to the command name in root search. Updatable at runtime via `updateCommandMetadata` |
| `icon` | PNG asset name; `@light` / `@dark` suffixes supported; inherits extension icon if absent |
| `keywords` | see `$defs/keywords` (≤12 items, each ≤25 chars, no `,\r\n\t`) |
| `interval` | `^(\d+)(s\|m\|h\|d)$` — e.g. `90s`, `1m`, `12h`, `1d`. Only for `no-view` / `menu-bar` |
| `arguments` | ≤3 items — see §7 |
| `preferences` | per-command preferences; inherit + override extension-level by matching `name` |
| `disabledByDefault` | boolean, default `false` (schema). The "only honoured on first install / new command" nuance is **not** in the schema — it comes from `information/manifest.md` line 70: *"Note that this flag is only used when installing a new extension or when there is a new command."* *(citation corrected 2026-08-19)* |
| `shortcut` | *(undocumented but accepted — `additionalProperties: true`)* per-platform shortcut object, see §8.3 |

> ⚠️ **`interval` minimum discrepancy:** schema says *"The minimum value is 10 seconds (10s)"*;
> `information/manifest.md` says *"The minimum value is 1 minute (1m)"*. Use `≥ 1m` to be safe.

---

## 6. Preferences

### 6.1 Types — exactly seven

Schema `$defs.preferences.items.properties.type`:
```json
{
  "enum": ["textfield", "password", "checkbox", "dropdown", "appPicker", "file", "directory"],
  "type": "string"
}
```

Required on every preference: `["name", "description", "type", "required"]`.
Plus conditionally:
* every type **except** `checkbox` → `title` is required (`^[^\s]+(?: [^\s]+)*$`, len 2–255)
* `checkbox` → **`label` is required** (len 1–255); its `title` may be `""` (pattern `^$|^[^\s]+(?: [^\s]+)*$`, minLength 0) so consecutive checkboxes group under one section header
* `dropdown` → **`data` is required**: array of `{ "title": string, "value": string }`, `minItems: 1`, `additionalProperties: false`, unique

Other properties: `placeholder` (string), `default` (see below), `name` (`^[a-zA-Z0-9-._~]*$`, len 2–255),
`description` (len 8–1024).

### 6.2 Runtime value types

From `https://developers.raycast.com/api-reference/preferences.md` (verbatim table):

| Preference type | Value type |
| --- | --- |
| `textfield` | `string` |
| `password` | `string` |
| `checkbox` | `boolean` |
| `dropdown` | `string` |
| `appPicker` | `Application` |
| `file` | `string` |
| `directory` | `string` |

Generated automatically into `raycast-env.d.ts`. The generator is
`@raycast/api@2.0.3/dist/utils/generate-typeScript-definitions.js`; it emits, literally:

```
/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = { … }

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `ask` command */
  export type Ask = ExtensionPreferences & { … }
}
declare namespace Arguments {
  /** Arguments passed to the `ask` command */
  export type Ask = { … }
}
```
A preference becomes optional (`?`) in the generated type when
`!preference.required && preference.default == null`, or whenever `type === "appPicker"`.

### 6.3 Per-platform `default` (**Windows-relevant**)

The schema allows `default` to be either a scalar **or** an object keyed by platform, for
`textfield`, `checkbox`, `dropdown`, `appPicker`, `file`, `directory`:

```json
"default": {
  "type": "object",
  "title": "The optional default value for the textfield, per platform",
  "patternProperties": { "^(Windows)|(macOS)$": { "type": "string" } }
}
```

Docs (`information/manifest.md` line 84) and the changelog agree; changelog example verbatim:
```json
"default": {
  "macOS": "foo",
  "Windows": "bar"
}
```

The app resolves it at runtime — `…\Raycast\backend\index.mjs`:
```js
async function wO(e, t) {
  let n = null, r = t.platform === "windows" ? "Windows" : "macOS";
  for (let i of Object.values(e)) switch (i.type) {
    case "checkbox": if (typeof i.default == "boolean") break;
      typeof i.default == "object" && typeof i.default[r] == "boolean" ? i.default = i.default[r] : i.default = void 0; break;
    case "textfield": case "password": …
```

### 6.4 Extension-level vs per-command vs per-tool

* Extension-level: top-level `"preferences"` — shown in *Raycast Preferences → Extensions* on the extension row.
* Per-command: `commands[].preferences` — *"Commands automatically 'inherit' extension preferences and can also override entries with the same `name`."* (schema description).
* Per-tool: `tools[].preferences` — same `$ref`, same inheritance/override rule (schema description).

### 6.5 Opening preferences programmatically

`@raycast/api@2.0.3/types/index.d.ts:7745` and `:7750`:
```ts
/** Opens Raycast's preference window and selects the current command. */
export declare function openCommandPreferences(): Promise<void>;

/** Opens Raycast's preference window and selects the current extension. */
export declare function openExtensionPreferences(): Promise<void>;
```

> ⚠️ **There is NO `Action.OpenExtensionPreferences` component.** Verified: `grep -c
> "OpenExtensionPreferences"` over `types/index.d.ts` is **0** in both `@raycast/api@2.0.3` and
> `@raycast/api@1.104.25`, and it is absent from the documented `Action.*` list in
> `api-reference/user-interface/actions.md`. Use a plain `<Action>` with `onAction`, exactly as the
> official docs show:
```tsx
import { ActionPanel, Action, Detail, openExtensionPreferences } from "@raycast/api";

export default function Command() {
  const markdown = "API key incorrect. Please update it in extension preferences and try again.";
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
```

---

## 7. Command arguments + `LaunchProps`

Schema `$defs.arguments`: array, `maxItems: 3`, unique. Each item requires `["type","name","placeholder"]`.

| Property | Constraint |
| --- | --- |
| `name` | `^[a-zA-Z0-9-._~]*$`, len 2–255 — key in `props.arguments` |
| `type` | `"text" \| "password" \| "dropdown"` (exactly these three) |
| `placeholder` | `^[^\s]+(?: [^\s]+)*$`, len 1–255 |
| `required` | boolean, default `false` |
| `data` | **required when `type === "dropdown"`**: `[{ "title": string, "value": string }]`, `minItems: 1` |

Real, on-disk Windows example (`…\.config\raycast\extensions\65e6105d-…\package.json`):
```json
"arguments": [
  { "name": "url", "type": "text", "placeholder": "URL (or selection/clipboard)", "required": false },
  {
    "name": "service",
    "type": "dropdown",
    "placeholder": "Service",
    "required": false,
    "data": [
      { "title": "archive.is", "value": "https://archive.is" },
      { "title": "removepaywall.com", "value": "https://www.removepaywall.com" },
      { "title": "freedium-mirror.cfd", "value": "https://freedium-mirror.cfd" }
    ]
  }
]
```

`LaunchProps` (`types/index.d.ts:6521` — *line corrected 2026-08-19; `:6518` is the opening `/**` of its doc comment*):
```ts
export declare type LaunchProps<T extends {
    arguments?: Arguments; draftValues?: Form.Values; launchContext?: LaunchContext;
} = { arguments: Arguments; draftValues: Form.Values; launchContext?: LaunchContext }> = {
    launchType: LaunchType;
    arguments: T["arguments"];
    draftValues?: T["draftValues"];
    launchContext?: T["launchContext"];
    fallbackText?: string;
};
```
`LaunchType` (`:6553`): `UserInitiated = "userInitiated"`, `Background = "background"`.

Usage: `export default function Command(props: LaunchProps<{ arguments: Arguments.Ask }>) { … }`
(`Arguments.Ask` comes from the generated `raycast-env.d.ts`).

---

## 8. Keyboard shortcuts on Windows

### 8.1 `Keyboard.KeyModifier` — literal (`types/index.d.ts:6438`)

```ts
export type KeyModifier = "cmd" | "ctrl" | "opt" | "shift" | "alt" | "windows";
```

Docs note (`api-reference/keyboard.md` line 183, verbatim):
> Note that `"alt"` and `"opt"` are the same key, they are just named differently on macOS and Windows.

**Platform mapping (from the changelog, 1.103.0, verbatim):**
> *"If you use shortcuts and specify a modifier like `cmd`, the shortcut will be ignored on Windows
> (and vice-versa, if you specify a modifier like `windows`, it won't be available on macOS)."*

⇒ On Windows, use **`ctrl`**, **`shift`**, **`alt`** (`opt` is the same physical key), and
**`windows`** for the Win key. **Never use `cmd` for a Windows shortcut.**

### 8.2 `Keyboard.KeyEquivalent` — literal (`types/index.d.ts:6442`) *(line corrected 2026-08-19; `:6441` is the closing `*/` above it)*

```
"a"…"z" | "0"…"9" | "." | "," | ";" | "=" | "+" | "-" | "[" | "]" | "{" | "}" | "«" | "»" |
"(" | ")" | "/" | "\\" | "'" | "`" | "§" | "^" | "@" | "$" | "return" | "delete" |
"deleteForward" | "tab" | "arrowUp" | "arrowDown" | "arrowLeft" | "arrowRight" |
"pageUp" | "pageDown" | "home" | "end" | "space" | "escape" | "enter" | "backspace"
```

### 8.3 Per-platform shortcut object (the correct cross-platform form)

`Keyboard.Shortcut` is a union (`types/index.d.ts:6318`, *line corrected 2026-08-19*):
```ts
export type Shortcut =
  | { modifiers: KeyModifier[]; key: KeyEquivalent }
  | {
      Windows: { modifiers: KeyModifier[]; key: KeyEquivalent };
      /** @deprecated Use Windows instead */
      windows?: { modifiers: KeyModifier[]; key: KeyEquivalent };
      macOS:   { modifiers: KeyModifier[]; key: KeyEquivalent };
    };
```
Note the key is capital-`W` **`Windows`**; lowercase `windows` is deprecated.

Docs (`api-reference/keyboard.md` lines 63–68, the `js` fence; the `macOS`/`Windows` lines are 64–65) literal:
```js
{
  macOS: { modifiers: ["cmd", "shift"], key: "c" },
  Windows: { modifiers: ["ctrl", "shift"], key: "c" },
}
```

Real on-disk manifest usage (`…\.config\raycast\extensions\65e6105d-…\package.json`), as a
**command-level** `shortcut`:
```json
"shortcut": {
  "macOS":   { "modifiers": ["cmd"],  "key": "o" },
  "Windows": { "modifiers": ["ctrl"], "key": "o" }
}
```

### 8.4 `Keyboard.Shortcut.Common` — cross-platform, prefer these

Members (`types/index.d.ts:6415`, `const Common: { … }` inside `export namespace Shortcut` at `:6360`
— *line corrected 2026-08-19; `:6404` is inside the preceding doc comment*): `Copy, CopyDeeplink,
CopyName, CopyPath, Save, Duplicate, Edit, MoveDown, MoveUp, New, Open, OpenWith, Pin, Refresh,
Remove, RemoveAll, ToggleQuickLook` — all 17 confirmed, in that order.

Windows bindings (docs `api-reference/keyboard.md` lines 76–92, verbatim table):

| Name | macOS | Windows |
| --- | --- | --- |
| Copy | ⌘ + ⇧ + C | `ctrl` + `shift` + C |
| CopyDeeplink | ⌘ + ⇧ + C | `ctrl` + `shift` + C |
| CopyName | ⌘ + ⇧ + . | `ctrl` + `alt` + C |
| CopyPath | ⌘ + ⇧ + , | `alt` + `shift` + C |
| Save | ⌘ + S | `ctrl` + S |
| Duplicate | ⌘ + D | `ctrl` + `shift` + S |
| Edit | ⌘ + E | `ctrl` + E |
| MoveDown | ⌘ + ⇧ + ↓ | `ctrl` + `shift` + ↓ |
| MoveUp | ⌘ + ⇧ + ↑ | `ctrl` + `shift` + ↑ |
| New | ⌘ + N | `ctrl` + N |
| Open | ⌘ + O | `ctrl` + O |
| OpenWith | ⌘ + ⇧ + O | `ctrl` + `shift` + O |
| Pin | ⌘ + ⇧ + P | `ctrl` + . |
| Refresh | ⌘ + R | `ctrl` + R |
| Remove | ⌃ + X | `ctrl` + D |
| RemoveAll | ⌃ + ⇧ + X | `ctrl` + `shift` + D |
| ToggleQuickLook | ⌘ + Y | `ctrl` + Y |

Usage: `shortcut={Keyboard.Shortcut.Common.Copy}` (the app template uses exactly this in
`src/typeahead-search.tsx`).

### 8.5 `debug.reloadShortcut` uses DIFFERENT modifier names

Manifest-level only (`extension.json` → `properties.debug`): modifiers enum is
`["command", "option", "control", "shift"]` — spelled-out, **not** `cmd/ctrl/opt`.

---

## 9. UI API surface (from `@raycast/api@2.0.3/types/index.d.ts`)

### 9.1 `List`

`ListProps_2` (`:6908`) `extends ActionsInterface, NavigationChildInterface, SearchBarInterface, PaginationInterface`:
```ts
{
  actions?: ReactNode;
  children?: ReactNode;
  onSelectionChange?: (id: string | null) => void;
  searchBarAccessory?: ReactElement<DropdownProps_2> | undefined | null;  // `DropdownProps_2` === `List.Dropdown.Props`
  searchText?: string;
  enableFiltering?: boolean;           // deprecated in favour of `filtering`
  searchBarPlaceholder?: string;
  selectedItemId?: string;
  isShowingDetail?: boolean;
}
```
`SearchBarInterface` (`:8259`):
```ts
{ filtering?: boolean | { keepSectionOrder: boolean }; isLoading?: boolean; throttle?: boolean;
  onSearchTextChange?: (text: string) => void; }
```
`NavigationChildInterface` (`:7355`): `{ navigationTitle?: string; isLoading?: boolean }`
`ActionsInterface` (`:417`): `{ actions?: ReactNode }`

`PaginationInterface` (`:7887`) — literal:
```ts
declare interface PaginationInterface {
    pagination?: {
        /** Number of items per page. Used by Raycast to decide how many placeholders should be shown while the extension is loading more items. */
        pageSize: number;
        /** Indicates whether there are more items to load. If set to `true`, Raycast will call `onLoadMore` when the user scrolls to the end of the view. */
        hasMore: boolean;
        /** Called when the user scrolls to the bottom of the view and there are more items to load. */
        onLoadMore: () => void;
    };
}
```
(`Grid` shares `PaginationInterface` — `GridProps` at `:5155`.)

Namespace members (`:6653`): `List.Item`, `List.Item.Detail`, `List.Item.Detail.Metadata`
(`.Label`, `.Separator`, `.Link`, `.TagList`, `.TagList.Item`), `List.Section`, `List.Dropdown`
(`.Item`, `.Section`), `List.EmptyView`.

`List.Item` props (`ItemProps`, `:6114`) — literal:
```ts
declare interface ItemProps extends ActionsInterface {
    id?: string;
    title: string | { value: string; tooltip?: string | null };
    subtitle?: string | { value?: string | null; tooltip?: string | null };
    keywords?: string[];
    icon?: Image.ImageLike | { value: Image.ImageLike | undefined | null; tooltip: string };
    accessoryIcon?: Image.ImageLike;   // deprecated
    accessoryTitle?: string;           // deprecated
    accessories?: ItemAccessory[] | undefined | null;
    actions?: ReactNode | null;
    detail?: ReactNode;                // <List.Item.Detail …/>, requires List isShowingDetail
    quickLook?: { name?: string | null; path: PathLike };
}
```

`ItemAccessory` (`:6006`) — literal:
```ts
declare type ItemAccessory = ({
    text?: string | undefined | null | { value: string | undefined | null; color?: Color };
} | {
    date?: Date | undefined | null | { value: Date | undefined | null; color?: Color };
} | {
    tag: string | Date | undefined | null | { value: string | Date | undefined | null; color?: Color.ColorLike };
}) & {
    icon?: Image.ImageLike | undefined | null;
    tooltip?: string | undefined | null;
};
```

`List.Item.Detail` props (`DetailProps_3`, `:2297` — *line corrected 2026-08-19*): `{ isLoading?: boolean; markdown?: string | null; metadata?: ReactNode }`.

> **Note on the "literal" blocks in §9:** the d.ts uses generated alias names for nested prop
> interfaces (`DropdownProps_2`, `LinkAccessoryProps`, `DetailProps_3`, …). Where this document
> writes the public alias (`List.Dropdown.Props`, `Form.LinkAccessory.Props`) instead, it is the
> same type — the alias is declared inside the corresponding namespace. Everything else in these
> blocks is byte-for-byte from `@raycast/api@2.0.3/types/index.d.ts`.

### 9.2 `Detail`

`DetailProps_2` (`:2286`) `extends ActionsInterface, NavigationChildInterface`:
```ts
{ markdown?: string | null; metadata?: ReactNode }
```
⇒ `isLoading` and `navigationTitle` come from `NavigationChildInterface`, so
`<Detail isLoading markdown={…} navigationTitle="…" actions={…} metadata={…} />` is valid.

`Detail.Metadata` members: `Label`, `Separator`, `Link`, `TagList` (+ `TagList.Item`).

### 9.3 `Form`

`FormProps_2` (`:4579`) `extends ActionsInterface, NavigationChildInterface`:
```ts
{ enableDrafts?: boolean; searchBarAccessory?: ReactElement<LinkAccessoryProps> | undefined | null; children?: ReactNode }
// `LinkAccessoryProps` === `Form.LinkAccessory.Props`
```
Field components (`FormMembers`, from `:4008`): **`Checkbox`, `DatePicker`, `Description`,
`Dropdown`, `PasswordField`, `Separator`, `TagPicker`, `TextArea`, `TextField`, `FilePicker`,
`LinkAccessory`** (plus `Dropdown.Item`, `Dropdown.Section`, `TagPicker.Item`).

Shared item props (`FormItemProps_2`, `:3874`):
```ts
{ id: string; title?: string; info?: string; error?: string; storeValue?: boolean;
  autoFocus?: boolean; value?: T; defaultValue?: T;
  onChange?: (newValue: T) => void;
  onBlur?: (event: FormEvent<T>) => void;
  onFocus?: (event: FormEvent<T>) => void; }
```

`Form.FilePicker` (`FilePickerProps`, `:3042`):
```ts
declare interface FilePickerProps extends FormItemProps_2<string[]> {
    canChooseFiles?: boolean;
    canChooseDirectories?: boolean;   // ⚠ On Windows this is IGNORED if canChooseFiles is true
    showHiddenFiles?: boolean;
    allowMultipleSelection?: boolean;
}
```
Windows caveat is stated in the d.ts itself (`:3050`) and in
`api-reference/user-interface/form.md` line 1191: *"Note: On Windows, this property is ignored if
`canChooseFiles` is set to `true`."*

Canonical form (from the app's own template, `…\api\template\src\form.tsx`) — see §2.4 area; it
demonstrates `TextField`, `TextArea`, `Separator`, `DatePicker`, `Checkbox` (with `storeValue`),
`Dropdown` + `Dropdown.Item`, `TagPicker` + `TagPicker.Item`, `Description`, and
`<Action.SubmitForm onSubmit={handleSubmit} />`.

`useForm` from `@raycast/utils@2.3.0` (`dist/types.d.ts:995`) — literal:
```ts
export function useForm<T extends Form.Values>(props: {
    /** Callback that will be called when the form is submitted and all validations pass. */
    onSubmit: (values: T) => void | boolean | Promise<void | boolean>;
    /** The initial values to set when the Form is first rendered. */
    initialValues?: Partial<T>;
    /** The validation rules for the Form. … */
    validation?: Validation<T>;
}): FormProps<T>;
```
plus `export enum FormValidation` (`:915`) for the `Required`/`Email`/`Number` shorthands.

### 9.4 `ActionPanel` / `Action`

`ActionProps` (`:371`) — literal:
```ts
declare interface ActionProps {
    id?: string;
    title: string;
    icon?: Image.ImageLike | undefined | null;
    style?: ActionStyle;             // "regular" | "destructive"
    shortcut?: Keyboard.Shortcut | undefined | null;
    onAction?: () => void;
    autoFocus?: boolean;
}
```

Full list of `Action.*` convenience components (`ConvenienceActions`, `:1498` — one entry per line
number): `CopyToClipboard` (1523), `Open` (1549), `OpenInBrowser` (1574), `OpenWith` (1603),
`Paste` (1628), `Push` (1658), `ShowInFinder` (1686), `SubmitForm` (1712), `Trash` (1737),
`CreateSnippet` (1759), `CreateQuicklink` (1781), `InstallMCPServer` (1803), `ToggleQuickLook` (1828),
`PickDate` (1852). **That is the complete set.**

Selected prop shapes:
```ts
// Action.CopyToClipboard  (:1879)
{ content: string | number | Clipboard.Content; title?: string; icon?: Image.ImageLike;
  transient?: boolean; concealed?: boolean; shortcut?: Keyboard.Shortcut;
  onCopy?: (content: string | number | Clipboard.Content) => void }

// Action.Paste  (:7949)
{ content: string | number | Clipboard.Content; title?: string; icon?: Image.ImageLike;
  shortcut?: Keyboard.Shortcut; onPaste?: (content: string | number | Clipboard.Content) => void }

// Action.Push  (:8192)   ← corrected 2026-08-19: `onPop` was missing from the original listing
{ title: string; target: ReactNode; icon?: Image.ImageLike; shortcut?: Keyboard.Shortcut;
  onPush?: () => void; onPop?: () => void }

// Action.SubmitForm<T>  (:8751)
{ title?: string; icon?: Image.ImageLike; shortcut?: Keyboard.Shortcut; style?: Action.Style;
  onSubmit?: (input: T) => void | boolean | Promise<void | boolean> }

// Action.OpenInBrowser  (:7771)   ← completed 2026-08-19 (the trailing "…" hid exactly one prop)
{ url: string; title?: string; icon?: Image.ImageLike; shortcut?: Keyboard.Shortcut;
  onOpen?: (url: string) => void }
```

`ActionPanel` members: `ActionPanel.Section`, `ActionPanel.Submenu` (`:176`).
Windows-adapted defaults baked into the d.ts:
* `Action.ShowInFinder` — *"@defaultValue `\"Show in Finder\"` on macOS and `\"File Explorer\"` on Windows"* (`:8500`), icon *"`Icon.Finder` on macOS and `Icon.HardDrive` on Windows"* (`:8505`).
* `Action.Trash` — *"@defaultValue `\"Move to Trash\"` on macOS and `\"Move to Recycle Bin\"` on Windows"* (`:9265`).

### 9.5 Feedback: Toast / HUD / Alert

```ts
// :8565 / :8567
export declare function showToast(options: Toast.Options): Promise<Toast>;
export declare function showToast(style: Toast.Style, title: string, message?: string): Promise<Toast>;

// Toast namespace :9020
export declare namespace Toast {
  export interface Options {
    title: string; message?: string; style?: Style;
    primaryAction?: ActionOptions; secondaryAction?: ActionOptions;
  }
  export interface ActionOptions {
    title: string; shortcut?: Keyboard.Shortcut; onAction: (toast: Toast) => void;
  }
}
// ToastStyle_2 enum (:9120)
{ Success = "SUCCESS", Failure = "FAILURE", Animated = "ANIMATED" }
```
`Toast` is a class with **mutable** accessors (`export declare class Toast` at `types/index.d.ts:8972`
— *the original citation was the placeholder `:8..`; real line supplied 2026-08-19*): `style`, `title`,
`message`, `primaryAction`, `secondaryAction` (all get/set), plus `show()` and `hide()`. So the standard
progress pattern is:
```ts
const toast = await showToast({ style: Toast.Style.Animated, title: "Asking Hermes…" });
// …later…
toast.style = Toast.Style.Success;
toast.title = "Done";
toast.primaryAction = { title: "Copy answer", shortcut: Keyboard.Shortcut.Common.Copy, onAction: (t) => { Clipboard.copy(answer); t.hide(); } };
```

```ts
// :8442
export declare function showHUD(title: string, options?: {
  clearRootSearch?: boolean; popToRootType?: PopToRootType;
}): Promise<void>;

// :1496
export declare function confirmAlert(options: Alert.Options): Promise<boolean>;

// Alert namespace :734
export declare namespace Alert {
  export interface Options {
    icon?: Image.ImageLike; title: string; message?: string;
    primaryAction?: ActionOptions; dismissAction?: ActionOptions;
    rememberUserChoice?: boolean;
  }
  export interface ActionOptions { title: string; style?: ActionStyle; onAction?: () => void }
}
```
`Alert.ActionStyle` (`AlertActionStyle_2`, `:837`) — literal, in declaration order:
`{ Default = "default", Cancel = "cancel", Destructive = "destructive" }` *(values added 2026-08-19;
the original "family" wording did not give the string literals)*.

### 9.6 Window & navigation

```ts
// :1340
export declare function closeMainWindow(options?: { clearRootSearch?: boolean; popToRootType?: PopToRootType }): Promise<void>;
// :8057
export declare function popToRoot(options?: { clearSearchBar?: boolean }): Promise<void>;
// :8064
export declare enum PopToRootType { Default = "default", Immediate = "immediate", Suspended = "suspended" }
// :1135
export declare function clearSearchBar(options?: { forceScrollToTop?: boolean }): Promise<void>;
// :7338
export declare interface Navigation { push: (component: ReactNode, onPop?: () => void) => void; pop: () => void }
// :9371
export declare function useNavigation(): Navigation;
// :9308
export declare function updateCommandMetadata(metadata: { subtitle?: string | null }): Promise<void>;
```

---

## 10. Clipboard + `getSelectedText` (decides the "Perguntar sobre seleção" command)

### 10.1 `Clipboard` namespace — literal (`types/index.d.ts:1143`)

```ts
export declare namespace Clipboard {
    export function copy(content: string | number | Content, options?: CopyOptions): Promise<void>;
    export function clear(): Promise<void>;
    export function paste(content: string | number | Content): Promise<void>;
    export function read(options?: { offset?: number }): Promise<ReadContent>;
    export function readText(options?: { offset?: number }): Promise<string | undefined>;

    export type ReadContent = { text: string; file?: string; html?: string };
    export type Content =
        | { text: string }
        | { file: PathLike }
        | { html: string; text?: string };
    export type CopyOptions = { transient?: boolean; concealed?: boolean };
}
```
`offset` reads from clipboard **history** (0 = latest).

### 10.2 `getSelectedText()` — **SUPPORTED ON WINDOWS. VERIFIED.**

Signature (`types/index.d.ts:4846`):
```ts
/** Gets the selected text of the frontmost application.
 *  @returns A Promise that resolves with the selected text. If no text is selected in the frontmost application, the promise will be rejected. */
export declare function getSelectedText(): Promise<string>;
```

Evidence it is implemented natively on Raycast for **Windows** 2.0.3:

1. **Windows-native handler class exists** in `C:\Program Files\WindowsApps\Raycast.Raycast_2.0.3.0_x64__qypenmj9wpt2a\Raycast\Raycast.dll` (a .NET/WPF assembly, not a macOS binary). Strings present:
   * `GetSelectedTextRequestHandler`
   * `Raycast.Handlers.Applications.GetSelectedTextRequestHandler+<Handle>d__1`
   * `Raycast.Handlers.Applications.GetSelectedTextRequestHandler+<ResolveForegroundRaycastWindowAsync>d__0`
2. **Backend routes the API call to it** — `…\Raycast\backend\index.mjs`:
   `s$i = async (e,t) => ({ text: await O.host.applications.getSelectedText() })`, registered as the
   `getSelectedText` request handler; also used by Raycast's own built-in "Selected Text"
   AI context extension (`static EXTENSION_ID = "selected-text"`, `displayName: "Selected Text"`).
3. **A Store extension installed on this Windows machine actually calls it.**
   `C:\Users\<usuario>\.config\raycast\extensions\65e6105d-7b4f-40fc-9a2b-80041aabaaa2\` — `remove-paywall`,
   manifest `"platforms": ["macOS","Windows"]`, bundled `remove-paywall.js` contains:
   ```js
   async function h(e){let t;if(e)t=e;else try{t=await (0,l.getSelectedText)()}catch{t=await l.Clipboard.readText()}…}
   ```
   Same in `video-downloader` (`30370bf8-…\index.js`), which also exposes a preference
   `autoLoadUrlFromSelectedText`.
4. The docs page `api-reference/environment.md` documents `getSelectedText` with **no** macOS-only
   hint (contrast: `runAppleScript` and `menu-bar` both carry explicit platform hints).

**Recommended production pattern (copied from the real Windows extension above):**
```ts
async function resolveInputText(explicit?: string): Promise<string> {
  if (explicit) return explicit;
  try {
    return await getSelectedText();
  } catch {
    return (await Clipboard.readText()) ?? "";
  }
}
```
Always keep the `Clipboard.readText()` fallback: `getSelectedText()` **rejects** when the foreground
app has no selection or does not expose it via UI Automation.

**UNVERIFIED:** whether Windows requires any additional accessibility/UIAccess grant for
`getSelectedText` to work in every app. The MSIX manifest does declare `rescap:Capability
Name="uiaccess"` and ships `Raycast.UIAccess.exe`, and `UIAutomationClient.dll` is bundled, which
strongly suggests UI-Automation-based extraction — meaning some apps (e.g. hardened/elevated
windows) may return nothing. Handle rejection gracefully.

### 10.3 macOS-only sibling

`getSelectedFinderItems()` (`:4820`) — *"If Finder is not the frontmost application, the promise will
be rejected."* Finder does not exist on Windows; do not use.

---

## 11. `LocalStorage` and `Cache`

### 11.1 `LocalStorage` (`types/index.d.ts:6972`) — literal

```ts
export declare namespace LocalStorage {
    export function allItems<T extends Values = Values>(): Promise<T>;
    export function getItem<T extends Value = Value>(key: string): Promise<T | undefined>;
    export function setItem(key: string, value: Value): Promise<void>;
    export function removeItem(key: string): Promise<void>;
    export function clear(): Promise<void>;
    // Value: string | number | boolean
    // Values: { [key: string]: any }
}
```
Docs (`api-reference/storage.md`):
* Backed by *"Raycast's local encrypted database"*.
* *"All commands in an extension have shared access to the stored data. Extensions can **not** access the storage of other extensions."*
* *"The API is not meant to store large amounts of data. For this, use Node's built-in APIs to write files … to the extension's support directory."*
* **No numeric size limit is documented.** (`grep -i "MB\|limit"` over `api-reference/storage.md` returns nothing relevant.) Treat "keep it small" as the contract.

### 11.2 `Cache` (`types/index.d.ts:1001`) — literal class surface

```ts
export declare class Cache {
    static get STORAGE_DIRECTORY_NAME(): string;   // "com.raycast.api.cache"
    static get DEFAULT_CAPACITY(): number;         // 1e7  === 10 MB
    constructor(options?: Cache.Options);
    get storageDirectory(): string;
    get(key: string): string | undefined;
    has(key: string): boolean;
    get isEmpty(): boolean;
    set(key: string, data: string): void;
    remove(key: string): boolean;
    clear(options?: { notifySubscribers: boolean }): void;
    subscribe(subscriber: Cache.Subscriber): Cache.Subscription;
}
export declare namespace Cache {
    export interface Options { namespace?: string; directory?: string; capacity?: number }
    export type Subscriber = (key: string | undefined, data: string | undefined) => void;
    export type Subscription = () => void;
}
```
Facts:
* **Synchronous** CRUD; data must be `string` (use `JSON.stringify`/`JSON.parse`).
* **LRU eviction**; default capacity **10 MB** — verified in the shipped runtime
  `…\Raycast\api\node_modules\@raycast\api\index.js`: `DEFAULT_CAPACITY(){return 1e7`.
  Docs confirm: *"The default capacity is 10 MB."* (`api-reference/cache.md` line 171).
* Stored on disk under the extension's support directory in `com.raycast.api.cache`.
  **Verified on this machine:**
  `C:\Users\<usuario>\AppData\Local\Raycast\extensions\c460fc92-202d-49bf-b9c4-e486b58a0189\com.raycast.api.cache\`
  containing `index\journal`, `index\<key-id>`, and `<sha1>\<data-id>` blobs. Example `index\journal`
  content: `1\nlast-fetch 1AJtfxmqKZJ-wyf_5KIxX 49`, and a value blob literally:
  `"__raycast_cached_date__2026-04-27T16:38:04.120Z"`.
* Shared between entry points by default; pass `namespace: environment.entryPointName` to isolate.

---

## 12. Streaming / incremental UI (progressive `<Detail>`)

There is **no dedicated streaming API**. The mechanism is plain React state; `AI.ask` is the only
built-in that exposes an event stream.

### 12.1 What the API gives you

```ts
// types/index.d.ts:437 (AI namespace)
export function ask(prompt: string, options?: AskOptions): Promise<string> & {
    on(event: "data", listener: (chunk: string) => void): void;
};
export type AskOptions = { creativity?: Creativity; model?: Model; signal?: AbortSignal };
```
`@raycast/utils@2.3.0` wraps this as `useAI(prompt, { stream?: boolean, … }) → { isLoading, data, error, revalidate }`
(`dist/types.d.ts:1021`).

For a **custom** stream (e.g. SSE from the local Hermes API server) you drive it yourself.

### 12.2 Correct pattern (React 19 + Node 22), with unmount abort

```tsx
import { Detail, ActionPanel, Action } from "@raycast/api";
import { useEffect, useRef, useState } from "react";

export default function Command({ prompt }: { prompt: string }) {
  const [markdown, setMarkdown] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(url, { signal: controller.signal, headers });
        if (!res.body) throw new Error("no body");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (cancelled) return;                       // guard: do not setState after unmount
          buf += decoder.decode(value, { stream: true });
          setMarkdown((prev) => prev + /* parsed delta */ "");
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;  // expected on unmount
        if (!cancelled) setMarkdown((p) => p + `\n\n> **Error:** ${String(err)}`);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();          // <- the actual cleanup
    };
  }, [prompt]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={<ActionPanel><Action.CopyToClipboard content={markdown} /></ActionPanel>}
    />
  );
}
```

Gotchas that are real here:
1. **React 19 StrictMode double-invoke.** Raycast renders through `react-reconciler` 19.0.0. Effects
   may run twice in development. The `cancelled` flag + `AbortController` make that idempotent.
   Without them you get two concurrent streams interleaving into one `markdown` string.
2. **Never `setState` after abort.** Raycast surfaces unhandled rejections as a full-screen error
   overlay in dev (`basics/debug-an-extension.md`), so a stray rejected `fetch` after `pop()` is
   very visible.
3. **Throttle re-renders.** Every `setMarkdown` re-renders the whole `Detail` markdown across the
   IPC bridge to the WPF host. For token-level streams, buffer and flush on a ~50–100 ms timer
   rather than per chunk. *(Recommendation, not a documented API constraint — **UNVERIFIED**
   whether Raycast internally coalesces.)*
4. **Background/`no-view` commands** get torn down when they return; do not stream in `no-view`.
5. `useNavigation().pop()` unmounts the pushed view → your cleanup runs → stream aborts. That's the
   intended behaviour.

---

## 13. `environment`, `launchCommand`, deeplinks

### 13.1 `Environment` interface — literal (`types/index.d.ts:2628`, const at `:2732`)

```ts
export declare interface Environment {
    raycastVersion: string;
    ownerOrAuthorName: string;
    extensionName: string;
    entryPointType: "command" | "tool";
    entryPointName: string;
    entryPointMode: "no-view" | "view" | "menu-bar";
    assetsPath: string;
    supportPath: string;
    isDevelopment: boolean;
    appearance: "light" | "dark";
    textSize: "medium" | "large";
    launchType: LaunchType;
    canAccess(api: unknown): boolean;
    /** @deprecated Use `environment.appearance` instead */        theme: "light" | "dark";
    /** @deprecated Use the top-level prop `launchContext` instead */ launchContext?: LaunchContext;
    /** @deprecated Use `environment.entryPointName` instead */     commandName: string;
    /** @deprecated Use `environment.entryPointMode` instead */     commandMode: "no-view" | "view" | "menu-bar";
}
export declare const environment: Environment;
```

* **`launchContext` on `environment` is DEPRECATED.** Read it from the top-level prop:
  `props.launchContext` (`LaunchProps`, §7).
* `supportPath` on Windows resolves to
  `C:\Users\<user>\AppData\Local\Raycast\extensions\<uuid-or-name>\` — verified: that directory
  exists on this machine and holds `com.raycast.api.cache`, downloaded CLIs (`bw.exe`,
  `speedtest.exe`, `ffmpeg.exe`) and extension data (`data.json`). Backend source:
  `function ns(e){return Zs.join(te.SUPPORT_DIR,"extensions",e.uuid||e.name)}`.
* `isDevelopment` — `true` when running via `ray develop`. Also usable:
  `process.env.NODE_ENV === "development"` (docs `basics/debug-an-extension.md`).
* `environment.canAccess(AI)` — gate AI usage on the user's plan.

### 13.2 `launchCommand` (`types/index.d.ts:6504`)

```ts
export declare function launchCommand(options: LaunchOptions): Promise<void>;
// LaunchOptions = IntraExtensionLaunchOptions | InterExtensionLaunchOptions
```
Doc-comment example, literal:
```ts
import { launchCommand, LaunchType } from "@raycast/api";
export default async () => {
  await launchCommand({ name: "list", type: LaunchType.UserInitiated, context: { "foo": "bar" } });
};
```
*"If the command is part of another extension, the user will be presented with a permission alert."*
Throws if the command does not exist or is disabled.

### 13.3 Deeplinks — format and Windows registration

Docs `information/lifecycle/deeplinks.md`, verbatim:
```
raycast://extensions/<author-or-owner>/<extension-name>/<command-name>
```
Query params: `launchType` (`userInitiated` | `background`), `arguments` (URL-encoded JSON object),
`context` (URL-encoded JSON object), `fallbackText` (string).
*"Whenever a command is launched using a Deeplink, Raycast will ask you to confirm that you want to run the command."*

**The `raycast://` scheme IS registered on Windows.** Verified in
`C:\Program Files\WindowsApps\Raycast.Raycast_2.0.3.0_x64__qypenmj9wpt2a\AppxManifest.xml`:
```xml
<uap:Extension Category="windows.protocol" desktop7:Scope="user">
  <uap:Protocol Name="raycast">
    <uap:DisplayName>Raycast Deeplink protocol</uap:DisplayName>
  </uap:Protocol>
</uap:Extension>
<uap:Extension Category="windows.protocol" desktop7:Scope="user">
  <uap:Protocol Name="com.raycast">
    <uap:DisplayName>Raycast OAuth sign-in protocol</uap:DisplayName>
  </uap:Protocol>
</uap:Extension>
```
The backend also normalises legacy Windows-1.x schemes
(`[["raycast-x-development://","raycast-development://"],["raycast-x-internal://","raycast-internal://"],["raycast-x://","raycast://"]]`
in `backend\index.mjs`).

Build them with `@raycast/utils` rather than by hand (`dist/types.d.ts:1414-1493`):
```ts
export enum DeeplinkType { ScriptCommand = "script-command", Extension = "extension" }
export function createDeeplink(options: CreateDeeplinkOptions): string;
export function createExtensionDeeplink(options: CreateExtensionDeeplinkOptions): string;
export function createScriptCommandDeeplink(options: CreateScriptCommandDeeplinkOptions): string;
// CreateExtensionDeeplinkBaseOptions = {
//   type?: DeeplinkType.Extension; command: string; launchType?: LaunchType;
//   arguments?: LaunchProps["arguments"]; context?: LaunchProps["launchContext"]; fallbackText?: string }
// (+ ownerOrAuthorName / extensionName for a cross-extension deeplink)
```

---

## 14. AI Extensions / Tools

**Available on Windows.** Evidence: the scaffold template shipped *inside the Windows app* has both
a `tools` array in `package.json` and `src/tools/{blank,confirmation}.ts`; the Windows app ships
`ai.db` in its data dir; and two Store extensions installed here (`video-downloader`,
`media-converter`) declare `tools` + `ai` and are marked `"platforms": ["macOS","Windows"]`.

### 14.1 Manifest `tools[]` (schema)

Required `["name","title","description"]`; `additionalProperties: true`; `maxItems: 100`.

| Property | Constraint |
| --- | --- |
| `name` | `^[a-z0-9-][a-zA-Z0-9-_]*$`, len 2–64. Maps to **`src/tools/<name>.{ts,tsx,js,jsx}`** |
| `title` | len 2–255 |
| `description` | len 12–2048 — *"helps users (and other actors like AI) understand what the tool does"* |
| `icon` | PNG asset |
| `keywords` | `$defs/keywords` |
| `functionalities` | array of `"AI attachment provider" \| "AI tool"` — *"Limits the tool to the specified functionalities. If not specified, the tool can be used in any context"* |
| `preferences` | `$defs/preferences` (inherits + overrides extension prefs) |

### 14.2 Manifest `ai` (schema)

```json
{
  "type": "object",
  "properties": {
    "instructions": { "type": "string", "description": "Additional system instructions added when the tools are used in AI" },
    "evals": {
      "type": "array",
      "items": { "type": "object", "properties": {
        "input": { "type": "string", "description": "The prompt to evaluate" },
        "usedAsExample": { "type": "boolean", "description": "Whether the eval can be used as an example in Raycast (default `true`)" }
      }, "required": ["input"] }
    }
  }
}
```

> ⚠️ **`ai.yaml` vs `package.json`.** `information/manifest.md` says the AI object *"should be written
> in a `ai.yaml` file at the root of the extension"*, but the JSON Schema puts `ai` in `package.json`
> **and** `ai/write-evals-for-your-ai-extension.md` shows evals inside `package.json`, **and** the
> real installed extension `video-downloader` has `"ai": { "instructions": …, "evals": [...] }`
> inline in its `package.json`. **Use `package.json`.** (`ai.yaml` support is **UNVERIFIED**.)

### 14.3 Tool source shape

A tool file default-exports an async function whose single parameter is an `Input` type; JSDoc on
each property becomes the parameter description for the model. Optional named export
`confirmation: Tool.Confirmation<Input>` gates destructive actions. See the literal template in §2.4.

`Tool.Confirmation<T>` (`types/index.d.ts:9178`; `:9154` is the opening of `export declare namespace Tool`
— *line corrected 2026-08-19*):
```ts
export type Confirmation<T> = (input: T) => Promise<undefined | {
    style?: Action.Style;
    info?: { name: string; value?: string }[];
    message?: string;
    image?: Image.URL | FileIcon;
}>;
```
Returning `undefined` skips confirmation.

### 14.4 Evals

Real eval shape, copied from `…\.config\raycast\extensions\30370bf8-…\package.json` (installed
Windows extension), literal but **abridged** — *(noted 2026-08-19)* the real file has two `evals`
entries, and the first one's `expected` array has three items, not one: the `callsTool` shown below
plus `{ "includes": "/Users/path/to/video.mp4" }` and
`{ "includes": "Raycast Focus: Enter Flow State" }`. So `expected` supports at least the
`callsTool` and `includes` matchers:
```json
"ai": {
  "instructions": "After downloading the video, always link the video with [<video title>](<download path>), so the user can easily open it.",
  "evals": [
    {
      "input": "@video-downloader download the video from https://www.youtube.com/watch?v=ykaj0pS4A1A",
      "mocks": {
        "download-video": {
          "downloadedPath": "/Users/path/to/video.mp4",
          "duration": 51,
          "fileName": "video.mp4",
          "title": "Raycast Focus: Enter Flow State"
        }
      },
      "expected": [
        { "callsTool": { "arguments": { "url": "https://www.youtube.com/watch?v=ykaj0pS4A1A" }, "name": "download-video" } }
      ]
    }
  ]
}
```
(`mocks` and `expected` are not in the published JSON Schema — schema only declares `input` and
`usedAsExample` — but they are what `ray evals` consumes and what the *Copy Eval* action produces.
Docs example in `ai/write-evals-for-your-ai-extension.md` matches.)

Run with `npx ray evals` (flags: `--skipBuild`, `--extension <path>`, `--only "0-2,1"`, `--apiEndpoint`).

### 14.5 `tools[].input` in built output

`ray build` derives a JSON Schema from the TypeScript `Input` type and injects it into the installed
manifest. Verified in the *installed* (built) manifest of `video-downloader`:
```json
{
  "name": "download-video",
  "title": "Download Video",
  "description": "Downloads a video from a given URL",
  "input": {
    "type": "object",
    "properties": { "url": { "type": "string", "description": "The URL of the video to download." } },
    "required": ["url"]
  },
  "confirmation": false
}
```
**Do not hand-write `input`/`confirmation` in your source `package.json`** — the CLI generates them
(`ray build --print-tool-schemas` prints them; `dist/utils/extract-tools-info.js`).

---

## 15. Development workflow on Windows

### 15.1 The `ray` CLI

`ray` ships inside `@raycast/api` (`"bin": { "ray": "bin/run.js" }`, plus `bin/run.cmd` for Windows
cmd.exe). Complete command list from `@raycast/api@2.0.3/oclif.manifest.json`:

| Command | Purpose |
| --- | --- |
| `ray build` | *"Build the extension to the output directory"*. Flags: `--target/-t`, `--environment`, `--output/-o`, `--skip-types` *(internal)*, `--print-tool-schemas` *(internal)*, `--exit-on-error`, `--emoji`, `--non-interactive/-I` |
| `ray develop` | *"Start the extension in development mode and watches for changes"*. Flags: `--target/-t`, `--print-tool-schemas`, `--print-instructions`, `--print-tool-calls` *(all internal)* |
| `ray lint` | *"Validate the extension manifest and metadata, and lint its source code"*. Flags: `--fix`, `--relaxed` (*"skip validation of: package.json schema, icons and metadata"*), `--schema <path>` *(internal)* |
| `ray evals` | *"Run AI evals defined in extension package.json"*. Flags: `--skipBuild`, `--extension`, `--apiEndpoint`, `--only` |
| `ray migrate` | *"Migrate the extension to a newer version of the Raycast API"* (uses `@raycast/migration`). Flag: `--path` |
| `ray publish` | *"Publish the extension on the Raycast Store."* Flags: `--clipboard`, `--verbose`, `--skip-validation`/`--skip-notify-raycast` *(internal)* |
| `ray validate` | *(internal)* *"Validate the extension so that it can be published"*. Flags: `--schema`, `--skip-owner` |
| `ray login` / `ray logout` / `ray profile` / `ray token` | account management. *(corrected 2026-08-19: the extra flags are **not** shared — `--json` exists only on `profile` and `token`; `--clipboard` exists only on `token`; `login` and `logout` carry the global flags only.)* Descriptions: *"Log into your Raycast account"*, *"Log out of your Raycast account"*, *"Show profile of the currently logged in user"*, *"Display the access token"* |
| `ray pull-contributions` | pull contributions of the extension |
| `ray version` | print version |

Global flags on every command: `--exit-on-error`, `--emoji`, `--help`, `--non-interactive/-I`,
`--target/-t` with options `development | internal | release`.

> *(citation corrected 2026-08-19)* The defaults are **not** in `oclif.manifest.json` — that file
> records no `default` for these flags. They are set in `@raycast/api@2.0.3/dist/utils/BaseCommand.js`,
> literally: `"exit-on-error": import_core.Flags.boolean({ default: true, helpGroup: "GLOBAL",
> aliases: ["exitOnError"], deprecateAliases: true, summary: "Always exit with non-zero code on
> error", allowNo: true })` and `emoji: import_core.Flags.boolean({ default: false, … })`.
> Because `allowNo: true`, `--no-exit-on-error` is a valid negation.

Docs (`information/developer-tools/cli.md`) add: `npx ray build -e dist` *"to validate that your
extension builds properly"*; `ray develop` gives hot reload, error overlays with stack traces,
terminal logs, a build-status indicator, and *"Imports the extension to Raycast if it wasn't before"*.

### 15.2 What `ray build` actually validates

Derived from the shipped bundle `@raycast/api@2.0.3/dist/commands/build/index.js` (31.7 MB):
1. **Reads + parses `package.json`** (`dist/manifest.js` → `readManifest`); errors:
   `cannot resolve package manifest path: …`, `cannot read package manifest: …`,
   `extension name in manifest cannot be empty`.
2. **De-duplicates entry points** across `commands` and `tools`; warns literally:
   `Ignoring duplicate extension entry points: <kind> "<name>" at /commands/2/name duplicates /commands/0/name. The first definition is used.`
3. **Resolves entry points to files**: `src/<command>.{ts,tsx,js,jsx}` and `src/tools/<tool>.{…}`.
4. **Type-checks with TypeScript** — the full TS compiler is bundled into the build command
   (all `Add_all_missing_*` diagnostic strings are present). `--skip-types` disables it *(internal flag)*.
   Also emits *"Package '<name>' provides its own types but they are missing."*
5. **Bundles with esbuild** (`esbuild ^0.28.0` is a direct dependency), honouring `external`,
   plus plugins for `.node` native modules, Swift files, and Rust files
   (`dist/utils/esbuild-plugins/{node-files,swift-files,rust-files,rust-parser}.js`).
6. **Generates `raycast-env.d.ts`** (`dist/utils/generate-typeScript-definitions.js`).
7. **Copies assets** and writes output to the extension build directory (§15.3).
8. **Notifies Raycast** via a deeplink (§15.4).

`ray lint` additionally validates `package.json` against the JSON Schema, icons and metadata
(that's exactly what `--relaxed` skips) and runs ESLint over `src`.

### 15.3 Where the built extension is written, and how Raycast picks it up

CLI (`@raycast/api@2.0.3/dist/config.js`, original TS recovered from the inline sourcemap):
```ts
export function extensionBuildDirectory(): string {
  const manifest = readManifest();
  if (!manifest.name) throw new Error("extension name in manifest cannot be empty");
  return path.join(raycastExtensionDirectory(), "extensions", manifest.name);
}
function raycastDirectoryNameForFlavorName(flavorName) { return flavorName == "" ? "raycast" : `raycast-${flavorName}`; }
function configDirectoryForFlavorName(flavorName) {
  const configPath = path.join(os.homedir(), ".config", raycastDirectoryNameForFlavorName(flavorName));
  fs.mkdirSync(configPath, { recursive: true });
  return configPath;
}
```
App (`…\Raycast\backend\index.mjs`):
```js
function Au(){ return Zs.join(TXt(), ".config", "raycast") }          // %USERPROFILE%\.config\raycast
function $t(e){ return Zs.join(Au(), "extensions", e.uuid || e.name) }
function vD(e,t,n){ return Zs.join(e, t === "tool" ? "tools" : "", `${n}.js`) }
function MXt(){ return Zs.join(Au(), "node-compile-cache") }
function vqn(){ return p3e.join(xqi(), ".config", "raycast-x") }      // legacy Windows-1.x root, migrated
```
**Verified on disk** — `C:\Users\<usuario>\.config\raycast\`:
```
.config\raycast\
├── extensions\
│   ├── <uuid>\                      one dir per installed extension
│   │   ├── package.json             (full manifest, built form)
│   │   ├── <command-name>.js        (+ .js.map)
│   │   ├── tools\<tool-name>.js
│   │   └── assets\extension-icon.png, assets\compiled_raycast_rust\*.exe, …
│   └── node_modules -> C:\Program Files\WindowsApps\Raycast.Raycast_2.0.3.0_x64__qypenmj9wpt2a\Raycast\api\node_modules   (symlink)
└── node-compile-cache\
```
The `node_modules` **symlink** is how extension bundles resolve `@raycast/api`, `react`,
`react-reconciler`, `react-devtools-raycast` at runtime — those are supplied by the app, never
bundled into your build.

CLI↔app handshake (`dist/commands/develop/index.js`, literal):
```js
function openRaycastDeeplink(extensionName, command, info, raycastRoute2) {
  const cwd = process.cwd();
  const url = `${raycastRoute2.scheme}://cli/${extensionName}/${command}?cwd=${encodeURIComponent(cwd)}&info=${encodeURIComponent(info || "")}`;
  … await open(url, { background: true });
}
function isWindowsRaycastRunning() {
  const output = execSync(`tasklist /FI "IMAGENAME eq Raycast.exe" /FO CSV /NH`, { encoding: "utf8" });
  return output.toLowerCase().includes("raycast.exe");
}
```
It also drops `cli.pid` and `dev.log` in the build directory. If Raycast isn't running you get
`warn - Raycast is not running`.

### 15.4 ⚠️ CRITICAL Windows gotcha in `@raycast/api@2.0.3`: default `--target`

`@raycast/api@2.0.3/dist/config.js` (dead-code-folded in the published build):
```js
case "flavorName":
  if (process.env.RAY_Target) return process.env.RAY_Target;
  if (typeof config.Target !== "undefined") return config.Target;
  if (false) { return raycastFlavorName(RaycastTarget.release); }   // was: process.env.NODE_ENV === "production"
  return raycastFlavorName(RaycastTarget.development);
```
**Empirically executed** (`node -e` against the extracted tarballs, on this machine):

| Package | invocation | resulting scheme | resulting config/extension dir |
| --- | --- | --- | --- |
| `@raycast/api@2.0.3` | default (no `--target`) | `raycast-development` | `C:\Users\<usuario>\.config\raycast-development` ❌ |
| `@raycast/api@2.0.3` | `--target release` | `raycast` | `C:\Users\<usuario>\.config\raycast` ✅ |
| `@raycast/api@2.0.3` | `RAY_Target=x` | `raycast` | `C:\Users\<usuario>\.config\raycast` ✅ |
| `@raycast/api@1.104.25` | default | `raycast` | `C:\Users\<usuario>\.config\raycast-x` (matches Raycast **for Windows 1.x**) |
| `@raycast/api@1.104.25` | `--target release` | `raycast` | `C:\Users\<usuario>\.config\raycast` ✅ |

(1.104.25 has explicit Windows handling. Its `dist/config.js` ships **minified**, so the literal
text is — *(quote corrected to the real shipped bytes, 2026-08-19)*:
```js
case"flavorName":return process.env.RAY_Target?process.env.RAY_Target:typeof r.Target<"u"?r.Target:i(process.platform==="win32"?a.x:a.release)
```
where `a = {debug:"debug",internal:"internal",release:"release",x:"x",xDevelopment:"x-development",xInternal:"x-internal"}`
and `i = (e) => e === a.release ? "" : e`. So on Windows the 1.x default flavor is `"x"`. The 1.x
route table also special-cases it: `e==="x" ? {bundleID:"com.raycast-x.macos", scheme: process.platform==="darwin" ? "raycast-x" : "raycast"}` —
which is why the 1.104.25 default row above has scheme `raycast` but directory `.config\raycast-x`.
2.0.3 dropped that whole branch.)

Raycast for Windows **2.0.3 reads `%USERPROFILE%\.config\raycast\extensions`** (see §15.3) and it
migrates the old `.config\raycast-x` into it.

**⇒ Practical recommendation for this project:**
```json
"scripts": {
  "dev":   "ray develop --target release",
  "build": "ray build --target release -e dist",
  "lint":  "ray lint"
}
```
`RAY_Target=x` works too (the alias map is `{ debug:"development", x:"", "x-development":"development", "x-internal":"internal" }`,
so `x` normalises to the empty/release flavor). **`RAY_Target=release` does NOT work** — it bypasses
`raycastFlavorNameForTarget`, yielding flavor `"release"` → `raycast-release://` + `.config\raycast-release`.

*(The temp `.config\raycast-development` directory created while testing this was removed.)*

### 15.5 Loading a local extension into Raycast on Windows

1. Sign in to Raycast (needed for `Create Extension` / `ray login`).
2. `npm install` in the extension folder.
3. `npm run dev` (i.e. `ray develop`, ideally with `--target release`, §15.4).
   The CLI builds into `%USERPROFILE%\.config\raycast\extensions\<manifest.name>\`, writes
   `cli.pid` + `dev.log`, and fires `raycast://cli/<name>/start?cwd=…`.
   The docs describe this as *"Imports the extension to Raycast if it wasn't before"*.
4. Alternative, no terminal: Raycast's **Import Extension** command
   (`basics/getting-started.md`: *"Import Extension: Import extensions from source code"*).
5. The extension appears at the top of Raycast root search while dev mode is running, and stays
   installed after you stop it.

### 15.6 Headless / no-UI testing — what actually exists

| Want | Reality |
| --- | --- |
| Run a `view` command without the Raycast UI | **Not possible.** The renderer is `react-reconciler` driving the WPF/WebView2 host over IPC; there is no offscreen renderer or test renderer in `@raycast/api`. **VERIFIED** by absence: `tar tzf raycast-api-2.0.3.tgz \| grep -iE "test\|renderer\|jest"` returns **nothing**, and the published tarball's complete top-level entry list is `README.md, bin, dist, oclif.manifest.json, package.json, types`. *(corrected 2026-08-19: the original attributed that list to a `"files"` field in `@raycast/api`'s `package.json` — **there is no `files` field in that package.json at all**. The list is right; the citation was wrong.)* |
| Validate manifest + types + bundle, no UI | ✅ `npx ray build -e dist --target release` and `npx ray lint`. Both are pure CLI; `ray build` does NOT need Raycast running (it only *warns* `Raycast is not running`). |
| Exercise AI tools headlessly | ✅ `npx ray evals` — runs the `ai.evals` entries against the real model with `mocks`, prints pass/fail. `--skipBuild` to reuse the last build. |
| Unit-test pure logic | ✅ Standard practice: keep API client / parsing / formatting in plain `.ts` modules with no `@raycast/api` import, and test them with vitest/jest outside Raycast. The Raycast-facing components stay thin. *(Recommendation — no official guidance exists.)* |
| Debug interactively | VS Code extension `tonka3000.raycast` → `Raycast: Attach Debugger` (Node debugger attach), React DevTools via `npm i -D react-devtools@6.1.1` then `⌘⌥D` (macOS chord; **Windows chord UNVERIFIED**). `console.log/debug/error` go to the `ray develop` terminal. Console logging is disabled for Store builds. |

---

## 16. Node runtime available to extensions

| Fact | Value | Source |
| --- | --- | --- |
| Node binary shipped with Raycast for Windows 2.0.3 | **v22.22.2** (`ProductName: Node.js`) | `(Get-Item "C:\Program Files\WindowsApps\Raycast.Raycast_2.0.3.0_x64__qypenmj9wpt2a\Raycast\backend\node.exe").VersionInfo` |
| `@raycast/api` engine requirement | `"engines": { "node": ">=22.22.2" }` | `@raycast/api@2.0.3/package.json` (identical in 1.104.25) |
| Docs prerequisite | *"Node.js 22.14 or higher installed"* | `basics/getting-started.md` |
| Changelog | *"The extensions now run on Nodejs 22 and react 19. Among other benefits, this makes `fetch` globally available."* | `misc/changelog.md` §1.94.0 |
| React | 19.2.1 runtime / `@types/react` pinned `19.0.10` | see §0 |
| Module format of built extensions | **CommonJS** (`tsconfig` `"module": "commonjs"`; built files are `.js` CJS) | `…\api\template\tsconfig.json`; inspection of built `…\.config\raycast\extensions\*\*.js` |

Globals / built-ins:

| API | Status |
| --- | --- |
| `fetch`, `Headers`, `Request`, `Response` | ✅ Node 22 globals (undici). Confirmed by the changelog quote above and by the template's `typeahead-search.tsx` using `Response` as a type. |
| `AbortController` / `AbortSignal` | ✅ Node 15+ global. `@raycast/api` itself types `AI.AskOptions.signal?: AbortSignal`, and `@raycast/utils`' `runPowerShellScript`/`useExec` take `signal`. |
| `ReadableStream`, `TextDecoder`, `TextDecoderStream`, `structuredClone`, `Blob`, `FormData`, `URL`, `URLSearchParams`, `WebSocket`, `crypto` | ✅ Node 22 globals. (`node:url`'s `URLSearchParams` is imported explicitly in the app's own template.) |
| `EventSource` (global) | ⚠️ **Assume NOT available.** The bundled `node.exe` contains the flag string `--experimental-eventsource` (i.e. still gated in Node 22), and `@raycast/api`'s bundled undici defines `install()` (which would set `globalThis.EventSource`) but **never calls it** (`grep -c "\.install()"` over `…\Raycast\api\node_modules\@raycast\api\index.js` → `0`). **UNVERIFIED** whether Raycast passes `--experimental-eventsource` to the extension worker (I could not execute the sandboxed `node.exe` — `Acesso negado`). **Do not rely on a global `EventSource`.** For SSE, either use `fetch` + `response.body.getReader()` (§12.2) or add `undici` / `eventsource` to your `dependencies` (esbuild will bundle it). |
| `node:https`, `node:http`, `node:fs`, `node:child_process`, `node:os`, `node:path`, `node:url`, `node:crypto`, … | ✅ Full Node stdlib is usable — real installed extensions `require("node:fs")`, spawn `.exe` helpers from `assets\`, etc. Native `.node` addons are supported via the CLI's `node-files` esbuild plugin. |
| `process.env.NODE_ENV` | `"development"` under `ray develop`, `"production"` for Store builds; overridable via *Raycast Preferences → Advanced → "Use Node production environment"* (docs `basics/debug-an-extension.md`). |

---

## 17. Windows-specific limitations — complete list found

Explicit, documented:
1. **Menu-bar commands are unavailable.** `api-reference/menu-bar-commands.md` line 8: *"Menubar commands aren't available on Windows."* ⇒ `mode: "menu-bar"` and the whole `MenuBarExtra` component tree are dead code on Windows.
2. **`runAppleScript` is macOS-only.** `utilities/functions/runapplescript.md`: *"Only available on macOS"*. Use `runPowerShellScript` (`utilities/functions/runpowershellscript.md`: *"Only available on Windows"*; default timeout 10000 ms; takes `signal`, `timeout`, `parseOutput`).
3. **`Form.FilePicker.canChooseDirectories` is ignored on Windows when `canChooseFiles` is `true`** (`types/index.d.ts:3050`; `api-reference/user-interface/form.md` line 1191).
4. **`cmd` modifier shortcuts are silently ignored on Windows** (changelog 1.103.0). Conversely `windows` modifier is ignored on macOS. Use `Keyboard.Shortcut.Common` or the per-platform object.
5. **Store gating:** an extension without `platforms` is treated as `["macOS"]` for Store distribution (changelog 1.103.0), so it will not be installable on Windows.

Implicit / structural (derived from the API surface — **not** stated as "Windows limitation" in the docs, but macOS-shaped):
6. `getSelectedFinderItems()` — Finder-specific, will reject on Windows.
7. `Action.ShowInFinder` / `showInFinder()` still exist but are relabelled *"File Explorer"* with `Icon.HardDrive` (`types/index.d.ts:8500`, `:8505`).
8. `Action.Trash` / `trash()` relabelled *"Move to Recycle Bin"* (`types/index.d.ts:9265`).
9. `Action.ToggleQuickLook` / `List.Item.quickLook` — Quick Look is a macOS feature; **UNVERIFIED** what it does on Windows.
10. `Application.windowsAppId` exists as a Windows-only field on `Application` (`api-reference/utilities.md` line 267: *"The Windows App ID of the application."*) — `appPicker` preferences and `getApplications()` return it.
11. `WindowManagement` namespace (`types/index.d.ts:9376`) and `BrowserExtension` (`:899`) — **UNVERIFIED** on Windows; not covered by any Windows note in the docs.
12. `environment.canAccess(AI)` gating still applies (plan-based, not platform-based).

Not a limitation but worth knowing: `@raycast/utils` is explicitly cross-platform as of 1.103.0
(*"We've also updated the `@raycast/utils` to make it cross platform and added a `runPowerShellScript` function."*).

---

## 18. Quick reference: real installed Windows extensions used as evidence

All under `C:\Users\<usuario>\.config\raycast\extensions\` (bundle) with support dirs under
`C:\Users\<usuario>\AppData\Local\Raycast\extensions\`:

| UUID dir | `name` | `platforms` | `@raycast/api` | Notable |
| --- | --- | --- | --- | --- |
| `20c4bfd5-bd88-44e4-a270-815dac42e0f4` | `clean-keyboard` | `["macOS","Windows"]` | `^1.104.6` | ships `assets\compiled_raycast_rust\clean_keyboard.exe` |
| `30370bf8-bb2c-41ad-844b-ff661ae4337a` | `video-downloader` | `["macOS","Windows"]` | `^1.104.19` | 2 `tools`, 2 `ai.evals`, **10** preferences *(count corrected 2026-08-19 — was stated as 9; actual names: `downloadPath, homebrewPath, ytdlPath, ffmpegPath, ffprobePath, autoLoadUrlFromClipboard, autoLoadUrlFromSelectedText, enableBrowserExtensionSupport, forceIpv4, cookiesFromBrowser`)*, `getSelectedText` |
| `5fdb86d3-dfcc-45a7-8969-8113b51434ab` | `bitwarden` | `["macOS","Windows"]` | `^1.104.13` | ships `bw.exe` in supportPath |
| `65e6105d-7b4f-40fc-9a2b-80041aabaaa2` | `remove-paywall` | `["macOS","Windows"]` | `^1.104.3` | per-command per-platform `shortcut`, dropdown+text `arguments`, `getSelectedText` + `Clipboard.readText` fallback |
| `c460fc92-202d-49bf-b9c4-e486b58a0189` | `weather` | `["macOS","Windows"]` | `^1.104.8` | contains a `menu-bar` command (hidden on Windows); has `com.raycast.api.cache` on disk |
| `db530047-6a7d-46d3-bb7d-5d7ba9006b4d` | `speedtest` | `["macOS","Windows"]` | `^1.77.1` | downloads `speedtest.exe` into `<supportPath>\cli\` *(sub-folder path made exact 2026-08-19)*; also has an npm `overrides` block (`tar`, `brace-expansion`, `js-yaml@4`) |
| `dbec16d9-89d5-4255-a360-e9cd150076f4` | `media-converter` | `["macOS","Windows"]` | `^1.100.2` | `tools` + `ai`, ships `ffmpeg.exe` |
| `f1d79c96-d713-4609-aa7a-4fa5f148add4` | `font-sniper` | `["macOS","Windows"]` | `^1.104.2` | — |

Manifest key sets actually present in those files (superset, in file order for `video-downloader`):
`$schema, name, title, description, icon, author, contributors, categories, keywords, license,
commands, tools, preferences, ai, dependencies, devDependencies, scripts, platforms`.

---

## 19. Open items — explicitly UNVERIFIED

1. Whether Raycast passes `--experimental-eventsource` (or any experimental flag) to the extension
   worker → whether a **global `EventSource`** exists. Workaround documented in §16.
2. Whether `getSelectedText()` needs an extra Windows accessibility grant per target app, and which
   apps it fails on (§10.2).
3. Whether `ai.yaml` at the extension root is honoured (docs mention it, schema + real extensions use
   `package.json`) (§14.2).
4. React DevTools keyboard chord on Windows (docs only give `⌘⌥D`) (§15.6).
5. `WindowManagement`, `BrowserExtension`, `Action.ToggleQuickLook` behaviour on Windows (§17).
6. Whether Raycast internally coalesces rapid `Detail.markdown` updates (§12.2 gotcha #3).
7. Whether the `@raycast/api@2.0.3` default-target behaviour (§15.4) is an intentional change or a
   packaging regression — only the observable behaviour is documented here.
