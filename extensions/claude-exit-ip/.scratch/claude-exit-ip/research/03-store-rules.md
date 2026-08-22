# 03 — Store rules and manifest: evidence log

Support file for [issues/03-store-rules-and-manifest.md](../issues/03-store-rules-and-manifest.md).

## Sources and their provenance

| Source | What it is | Trust |
|---|---|---|
| `/Users/ken/Projects/Raycast/extensions` @ `d0d48b5` (2026-07-25 08:14 +0200) | full clone of `raycast/extensions`, **3105** extensions under `extensions/` | measured; read-only, never edited |
| `/Users/ken/Projects/Raycast/extensions/docs/` | GitBook source for `developers.raycast.com` | doc-derived; spot-verified against live |
| `https://www.raycast.com/schemas/extension.json` | the machine schema CI validates against; referenced as `$schema` by most manifests | doc-derived, authoritative |
| `https://developers.raycast.com/basics/prepare-an-extension-for-store` | review checklist | doc-derived; **verified identical** to `docs/basics/prepare-an-extension-for-store.md` |
| `https://manual.raycast.com/extensions-guidelines` | the acceptance/rejection policy | doc-derived |

Note: `docs/information/manifest.md` and the live `/information/manifest` page do **not** agree with the JSON schema on which fields are required — see the conflict table below. The schema is what CI enforces; the docs' asterisks are aspirational.

---

## A. Manifest fields — schema-measured

Top-level `required` per `https://www.raycast.com/schemas/extension.json`:
`name`, `title`, `description`, `icon`, `author`, `license`, `commands`, `dependencies`.

| Field | Schema constraint | Corpus reality (n=3105) |
|---|---|---|
| `name` | `^(@workaround/)?[a-z0-9-~][a-z0-9-_~]*$`, len 3–255 | doubles as the Store URL slug |
| `title` | `^[^\s]+(?: [^\s]+)*$` (no leading/trailing/double spaces), len 2–255 | — |
| `description` | same whitespace pattern, len **16–2048** | median 54 chars, p10 29, p90 114, max 553 |
| `icon` | string, resolved in `assets/`; 512×512 PNG per docs, `@dark` twin optional | — |
| `author` | `^[a-zA-Z0-9-*~][a-zA-Z0-9-*._~]*$`, len 2–75 | must be the **Raycast** Store handle, not the GitHub one (`prepare-an-extension-for-store.md:12`) |
| `license` | **enum: `MIT` only** | **3105/3105 are MIT** — no exceptions in the whole corpus |
| `categories` | array of the 15-value enum | **329/3105 omit it** → schema doesn't force it, review does (`prepare…:88` "at least one category") |
| `platforms` | array of `macOS` \| `Windows` | **1325/3105 omit it** → optional in practice despite `manifest.md:39` marking it required |
| `keywords` | array | only **362/3105** (12%) use it |
| `commands[]` | required per item: `name`, `title`, `description`, `mode` | — |
| `commands[].name` | `^[a-z0-9-~][a-zA-Z0-9-._~]*$`; maps to `src/<name>.tsx` | — |
| `commands[].title` | len 2–255 | — |
| `commands[].description` | len **12–2048** | — |
| `commands[].mode` | enum `view` \| `no-view` \| `menu-bar` | — |
| `commands[].subtitle` | optional | see naming rules — omit for single-command extensions |

Category enum (15, Title Case, case-sensitive): `Applications`, `Communication`, `Data`, `Documentation`, `Design Tools`, `Developer Tools`, `Finance`, `Fun`, `Media`, `News`, `Productivity`, `Security`, `System`, `Web`, `Other`.

Corpus category frequency: Productivity 1292, Developer Tools 959, Web 427, Applications 363, Fun 257, Media 253, Data 236, System 216, Other 183, Documentation 179, Communication 138, Design Tools 135, Finance 135, News 82, Security 74.

Single-command extensions: **1348/3105** (43%). Their description median is 50.5 chars.

Dependency versions at repo tip: `@raycast/api` `^1.104.23`, `@raycast/utils` `^2.2.7`.

`ipcheck-ing/package.json` scripts (the sibling extension's shape):
```json
"build": "ray build", "dev": "ray develop",
"lint": "ray lint", "fix-lint": "ray lint --fix",
"publish": "npx @raycast/api@latest publish"
```
The `ray` binary comes with `@raycast/api`; no separate CLI dependency appears in the corpus (inferred from the absence of any `ray`/`@raycast/cli` dependency entry).

### Naming rules review enforces

All from `docs/basics/prepare-an-extension-for-store.md` (= live `developers.raycast.com`). **No CI check exists for any of them** — `rg -il 'title case|titlecase|apple style' .github scripts` returns nothing, so these are human-reviewer rules.

- L23–26 — Apple Style Guide title case for extension *and* command titles. ✅ `Google Workplace`, `Doppler Share Secrets`. ❌ `Hacker news`, `my issues`. Lower case allowed for marks canonically lower case (`iOS`, `macOS`, `npm`).
- L36–38 — **"Avoid generic names for an extension when your extension doesn't provide a lot of commands. … Rule of thumb: If your extension has only one command, you probably need to name the extension close to what this command does. Example: `Visual Studio Code Recent Projects` instead of just `Visual Studio Code`."**
- L34–35 — nouns over verbs: `Emoji Search` > `Search Emoji`.
- L39–40 — description is **one sentence**, short and descriptive.
- L42–51 — command title is `<verb> <noun>` or `<noun>`; no articles (`Search Emoji` not `Search an Emoji`); never just the service name (`Search Packages` not `NPM`).
- L57–59 — **"Don't use a subtitle if it doesn't add context. Usually, this is the case with single command extensions."** / "If your subtitle is almost a duplication of your command title, you probably don't need it."
- L263–265 — Action Panel action titles are Title Case too (`Open in Browser`, `Copy to Clipboard`).
- L296 — **no external analytics**, ever.
- L300–301 — no localization; **US English spelling only** (not British).
- L69–74 — 512×512 PNG icon, must look good in light *and* dark, `@dark` suffix for a pair; **default Raycast icon = rejection**; remove unused assets.

---

## B. Third-party trademarks and icons

### What the rules actually say

`rg -in 'trademark|brand|logo|copyright|third.party' docs/` over the whole doc tree returns exactly **two** relevant hits:

- `docs/basics/prepare-an-extension-for-store.md:17` — "Please check the terms of service of third-party services that your extension uses."
- `docs/basics/prepare-an-extension-for-store.md:26` — "It's okay to use lower case for names and trademarks that are canonically written with lower case letters."

There is **no trademark policy, no logo policy, and no affiliation-disclaimer requirement** anywhere in the developer docs.

`https://manual.raycast.com/extensions-guidelines` lists the rejection reasons. The IP-adjacent ones:

- Violates Raycast ToS/Privacy Policy, including "Providing access to content not intentionally made available or provided for through the Service", **"Impersonation"**, "Promoting criminal activity"
- **"Violates the Terms of Service of the service provided"** — example given: "scraping a website without permission"
- "There is already a feature to accomplish this directly in Raycast, which offers comparable value"
- "There is an extension on our Store providing very similar value"
- "There is an open PR for an extension providing very similar value"
- "The extension does not follow our technical guidelines"
- **"The extension's name uses restricted words. Currently, we are restricting the use of the word 'Assistant'"**

So the only brand-related gates are *impersonation* and *the vendor's own ToS*. Naming a product and showing its mark is neither, on the evidence below.

### Claude / Anthropic precedent in the clone

| Extension | `title` | icon (verified by opening the PNG) | notes |
|---|---|---|---|
| `extensions/claude` | **`Claude`** — bare mark | `assets/icon.png` + `icon@dark.png` = **Anthropic's exact "A\\" wordmark**, unmodified | `description`: "Interact with Anthropic's Claude API directly from Raycast"; `keywords: ["anthropic","claude","chat","ai"]`; 5 commands, all `subtitle: "Claude"` |
| `extensions/claude-sessions` | `Claude Sessions` | `assets/icon.png` = **Claude sunburst glyph** on Anthropic clay/coral, rounded square | `subtitle: "Claude Sessions"` |
| `extensions/claude-code-launcher` | `Claude Code Launcher` | `assets/icon.png` = **sunburst glyph** in Anthropic palette on cream | single command `Open Project`, subtitle `Claude Code Launcher` |
| `extensions/claudecast` | `ClaudeCast` | `assets/command-icon.png` = sunburst **rotated inside a diamond** on black — a derivative | 10 commands |
| `extensions/claude-code-cheatsheet` | `Claude Code Cheatsheet` | `assets/extension_icon.png` = **"CC" lettermark** in Anthropic palette, no vendor glyph | single command, no `categories`, no `platforms` |
| `extensions/claude-code-config-switcher` | `Claude Code Switcher` | `icon.png` | — |
| `extensions/claude-session-bookmarks` | `Claude Session Bookmarks` | `command-icon.png` | — |
| `extensions/heyclaude` | `HeyClaude` | — | third party's own brand |
| `extensions/codex-claude-cli` | `PromptCast for Claude & Codex` | bundles `assets/claude.png` **and** `assets/codex.png` | two vendors' marks in one extension |
| `extensions/agent-usage` | `Agent Usage` | bundles `claude-icon.svg`, `codex-icon.svg`, `copilot-icon.svg`, `cursor-icon.svg`, `gemini-icon.png`, `grok-icon.svg`, … 14 vendor marks | description names 14 vendors by trademark |

So the full spectrum ships: **vendor wordmark verbatim** → **vendor glyph verbatim** → **glyph derivative** → **own lettermark in vendor palette**. All live on the Store. None carries a disclaimer.

### Same pattern for other vendors

| Extension | `title` | icon filename |
|---|---|---|
| `extensions/notion` | `Notion` | `notion-logo.png` |
| `extensions/linear` | `Linear` | `linear-app-icon.png` |
| `extensions/slack` | `Slack` | `slack-icon-rounded.png` |
| `extensions/github` | `GitHub` | `icon.png` |
| `extensions/spotify-player` | `Spotify Player` | `extension-icon.png` |
| `extensions/perplexity` | `Perplexity` | `perplexity-logo.png` = **Perplexity's exact mark**, verified visually |
| `extensions/chatgpt` | — | `chatgpt-logo.png` |
| `extensions/openai-gpt` | `OpenAI GPT` | `openai-logo.png` |
| `extensions/1password` | `1Password` | `1password-icon.png` |

Corpus census: **548 extensions** ship an extension icon whose filename names a brand or is `<something>-logo.png` / `<something>-icon.png` (excluding the generic `extension-icon` / `command-icon` names).

### Single-command + brand-in-title survey

43 extensions have exactly one command and a known third-party brand in the title. The pattern is `<Brand> <Function Noun>`:

```
[Claude]      'Claude Code Cheatsheet'      cmd='Claude Code Cheatsheet'  sub=None
[Claude]      'Claude Code Launcher'        cmd='Open Project'            sub='Claude Code Launcher'
[GitHub]      'GitHub Repository Search'    cmd='Search Repositories'     sub='GitHub'
[GitHub]      'GitHub Stars'                cmd='Starred Repositories'    sub='GitHub'
[GitHub]      'GitHub Status'               cmd='Summary'                 sub='GitHub Status'
[GitHub]      'GitHub Trending'             cmd='Trending Repositories'   sub='GitHub'
[GitHub]      'GitHub Users Search'         cmd='Search Users'            sub='GitHub'
[GitHub]      'GitHub Profile'              cmd='Show GitHub Profile'     sub='GitHub Profile'
[Notion]      'Notion Page Search'          cmd='Search Pages'            sub='Notion'
[Notion]      'Copy Notion Markdown Link'   cmd='Copy as Markdown Link'   sub='Notion'
[Figma]       'Figma Variables'             cmd='Explore Figma Variables' sub=None
[Figma]       'Figma Shortcuts'             cmd='Search Figma Shortcuts'  sub=None
[Figma]       'Figma Link Cleaner'          cmd='Clean Figma Link'        sub='Figma'
[Slack]       'Slack Status'                cmd='Set Status'              sub='Slack'
[Slack]       'Slackmojis'                  cmd='Slackmojis Search'       sub=None
[ChatGPT]     'ChatGPT Search'              cmd='ChatGPT Search'          sub=None
[OpenAI]      'OpenAI Speak'                cmd='Speak Selected Text'     sub='OpenAI Speak'
[Kagi]        'Kagi FastGPT'                cmd='Ask FastGPT'             sub=None
[Jira]        'Jira Time Tracking'          cmd='Log Time'                sub='Jira Time Tracking'
[Obsidian]    'Obsidian Clippings'          cmd='Create Clipping'         sub=None
[Perplexity]  'Perplexity'                  cmd='Ask Perplexity'          sub=None   ← only bare brand
```

`Perplexity` is the lone counterexample to the single-command naming rule — a bare vendor name with one command. Everything else qualifies the brand with a function noun. Several keep a subtitle despite the "don't for single-command" guidance, so that one is soft.

### The closest structural analogue in the whole corpus

`extensions/china-ip-address/package.json`:
```json
{
  "$schema": "https://www.raycast.com/schemas/extension.json",
  "name": "china-ip-address",
  "title": "China IP Address",
  "description": "Get your China public network IP",
  "icon": "command-icon.png",
  "author": "ErlichLiu",
  "categories": ["Applications"],
  "license": "MIT",
  "commands": [
    { "name": "ip", "title": "Lookup China IP Address",
      "description": "Get your China public network IP Address", "mode": "view" }
  ]
}
```
Scope-qualified noun title, one `view` command titled `<verb> <noun>`, no subtitle, no `platforms`, 32-char description. And `src/ip.tsx:18` fetches `https://www.taobao.com/help/getip.php` — see section C.

---

## C. Plain HTTP and undocumented endpoints

### Plain HTTP: shipped, repeatedly

`rg` over all `*.ts`/`*.tsx` for `http://` (excluding localhost, XML namespaces, schema URLs):

`http://ip-api.com/json/` — **7 extensions**, the exact geo provider the map is considering:
```
extensions/roblox/src/hooks/ip-info.tsx:21
extensions/whois/src/hooks/use-whois-data.ts:5
extensions/world-clock/src/utils/costants.ts:8
extensions/ipcheck-ing/src/getIPDetails.ts:12
extensions/mozilla-vpn/src/utils/fetchCurrentIP.ts:119
extensions/ip-geolocation/src/utils/constants.ts:3
extensions/ip-tools/src/geoLocation.tsx:20
```

Others:
```
extensions/number-facts/src/{math,date,trivia,year}.tsx  → http://numbersapi.com/...
extensions/bugmenot/src/find-login.tsx:43                → http://bugmenot.com/view/<domain>  (HTML scrape)
extensions/mailboxlayer/src/validate-email-address.tsx:12 → USE_HTTPS ? https : http://apilayer.net/api/check
extensions/vatlayer/src/utils/constants.ts:6              → USE_HTTPS ? https : http://apilayer.net/api/
extensions/tl-dr-ai-summary-tool/src/utils/keys.ts:2-3    → http://open.bigmodel.cn/api/paas/v3/...
```

Nothing in the docs or guidelines mentions transport security. Plain HTTP is not a review gate (measured). `mailboxlayer`/`vatlayer` expose it as a user preference, which is the tidiest precedent if the geo call ends up on `http://`.

### `cdn-cgi/trace` specifically

```
extensions/ipcheck-ing/src/getExternalIP.ts:31   https://4.ipcheck.ing/cdn-cgi/trace
extensions/ipcheck-ing/src/getExternalIP.ts:50   https://6.ipcheck.ing/cdn-cgi/trace
extensions/ipcheck-ing/src/getExternalIP.ts:69   https://64.ipcheck.ing/cdn-cgi/trace
extensions/ipcheck-ing/src/getExternalIP.ts:88   https://1.0.0.1/cdn-cgi/trace
extensions/ipcheck-ing/src/getExternalIP.ts:107  https://[2606:4700:4700::1111]/cdn-cgi/trace
extensions/charged/src/utils/analytics.tsx:17    https://www.cloudflare.com/cdn-cgi/trace
```
Parsing `ip=` out of the trace block, line-split, is the shipped idiom. `charged` uses it inside an analytics module (which is itself against `prepare…:296` — do not copy that part).

### Undocumented / unofficial third-party endpoints

The strongest precedent, and the closest in shape to `claude.ai/cdn-cgi/trace`:

`extensions/china-ip-address/src/ip.tsx:18`
```ts
const { data } = await axios.get("https://www.taobao.com/help/getip.php");
```
An entirely undocumented IP-echo helper on Alibaba's own website, no auth, not part of any published API, used only to read the caller's egress IP. Shipped and live.

Explicit "unofficial" disclosure is normal in descriptions — 16+ extensions do it:
```
extensions/things/package.json        "uses an unofficial internal format that may break on Things updates"
extensions/slackmojis/package.json    "An unofficial directory of the best custom Slack emojis from slackmojis.com"
extensions/rae-dictionary-raycast     "Using https://rae-api.com, unofficial API."
extensions/mistral/package.json       "An unofficial extension to use Mistral AI from Raycast"
extensions/cloudflare-images          "… Unofficial."
extensions/lunchmoney, rewardful, sefaria, habitica-todos, lunatask, paynow,
open-targets-raycast, ship24-client, datawrapper, fuelix   — all "Unofficial …"
```

### No extension currently fetches from `claude.ai`

`rg 'https://claude\.ai'` over all sources returns only **URL-opening and validation**, never a fetch:
```
extensions/prompts-chat/src/utils.ts:63              baseUrl: "https://claude.ai/new"
extensions/search-router/…/builtin-search-engines.ts:12396  "https://claude.ai/new?q={{{s}}}"
extensions/agent-usage/src/agent-usage.tsx:182       settingsUrl: "https://claude.ai/settings/billing"
extensions/claude-session-bookmarks/src/{session-form.tsx,storage.ts}  link validation only
```
Host-level counts across the corpus: `api.anthropic.com` ×9, `claude.ai` ×7 (all above), `docs.anthropic.com` ×4, `console.anthropic.com` ×2, `platform.claude.com` ×1, `code.claude.com` ×1.

So a `GET https://claude.ai/cdn-cgi/trace` would be the first of its kind in the repo — novel host, but the *technique* (`cdn-cgi/trace`) and the *shape* (undocumented vendor endpoint that echoes your IP) both have shipped precedent.

### What actually governs it

Guidelines rejection reason: "Violates the Terms of Service of the service provided", example "scraping a website without permission". Plus `prepare…:17` "Please check the terms of service of third-party services that your extension uses."

(inferred) `cdn-cgi/trace` is a Cloudflare-injected diagnostic path that returns only the requester's own connection metadata — no site content, no user data, no authenticated resource. That is not "scraping" and not "providing access to content not intentionally made available", since the endpoint is served unauthenticated by design and reveals nothing about Anthropic. Whether Anthropic's ToS forbids programmatic requests to `claude.ai` outside a browser is a separate question the Raycast docs cannot settle — and it is a submission-time question, not a manifest question.

---

## D. CI vs. human review — what is machine-checked

`.github/workflows/`:

| Workflow | Trigger | Enforces |
|---|---|---|
| `changelog_enforcer.yml` | any `extensions/**` change | `CHANGELOG.md` entry present — **hard fail** |
| `metadata_image_enforcer.yml` | only `extensions/**/metadata/**` changes | screenshot dimensions/padding via `scripts/check_raycast_images.py`: 2000×1250, pad 0.125 ±0.045, asymmetry ≤0.04 |
| `npm_check.yml` | any `extensions/**` change | npm install/build on macOS |
| `extensions_build_publish.yml` | merge | build + publish |

Plus, per `docs/information/security.md:13`, CI "validations to make sure that manifest conforms to the defined schema, required assets have the correct format, the author is valid, and no build and type errors are present."

Not machine-checked, therefore human-reviewer judgement: every naming rule, title casing, icon aesthetics, category choice, trademark/impersonation, ToS compliance, duplicate-value.

## E. Duplicate-value risk (submission-time)

Existing Store extensions in the same neighbourhood — relevant only to "There is an extension on our Store providing very similar value":

```
ipcheck-ing      'IPCheck'          'Show All Your IPs, from Local Network and Multiple Sources'   1 cmd
ip-geolocation   'IP Geolocation'   'Show local and public IPv4/IPv6 address. Query geolocation…'  3 cmds
myip             'MyIP'             'My IP information'                                           2 cmds
ip-tools         'IP Tools'         subnet convert/validate/calculate                             9 cmds
ipinfo           'IP Info'          ipinfo.io API                                                  3 cmds
china-ip-address 'China IP Address' 'Get your China public network IP'                            1 cmd
ipapi-is         'ipapi.is'         'Lookup IP or ASN via ipapi.is'                                1 cmd
whois            'Whois'            WHOIS/RDAP for domains and IPs                                 1 cmd
mozilla-vpn      —                  reads current IP for VPN state                                 —
```
(inferred) None of these answers "which IP does `claude.ai` see me from" — the per-destination framing is the differentiator, and `china-ip-address` is direct precedent that a destination/scope-specific IP extension coexists with the general ones.
