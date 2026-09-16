# 03 — Raycast Store rules for a Claude-branded extension

Parent: [map.md](../map.md)
Type: research
Status: resolved
Blocked by: —

## Question

What do Raycast's extension manifest and Store review rules require of an extension that names and depicts a third party's product ("Claude")?

Cover:

- Required and recommended `package.json` manifest fields for a single `view` command (`name`, `title`, `description`, `icon`, `categories`, `license`, `author`), and the naming conventions review enforces (title casing, command title phrasing, description length).
- The Store's position on third-party trademarks: may an extension title contain "Claude", and may the icon be Anthropic's mark or a derivative? What do existing third-party-branded extensions in `~/Projects/Raycast/extensions/extensions/` do — sample several and note the pattern.
- Whether plain-HTTP network calls, and calls to unofficial or undocumented endpoints, are acceptable under review.
- Which of these constraints bite *now* (they shape the manifest we spec) versus only at submission time (out of scope).

The local checkout at `~/Projects/Raycast/extensions` is a full clone of `raycast/extensions` — prefer reading real extensions there over guessing from docs, and cite `developers.raycast.com` for the rules themselves.

Record findings under `## Answer`, and drop any long transcripts in `../research/03-*.md`.

## Answer

Evidence log, survey tables, and full citations: [research/03-store-rules.md](../research/03-store-rules.md).
Measured against `/Users/ken/Projects/Raycast/extensions` @ `d0d48b5` (2026-07-25), 3105 extensions. Rules tagged with their doc URL. Reasoning tagged `(inferred)`.

### (a) Manifest fields for a single `view` command

The authoritative list is the JSON schema CI validates against, `https://www.raycast.com/schemas/extension.json` — **not** the docs table, which marks fields required that 43% of the corpus omits.

**Schema-required:** `name`, `title`, `description`, `icon`, `author`, `license`, `commands`, `dependencies`.
Per command: `name`, `title`, `description`, `mode`.

Hard constraints worth knowing before writing the file:

- `license` is an **enum whose only value is `MIT`**. Measured: **3105/3105** extensions are MIT — zero exceptions in the corpus.
- `name`: `^[a-z0-9-~][a-z0-9-_~]*$`, 3–255 chars. It is the Store URL slug.
- `title`: 2–255, no leading/trailing/double spaces.
- `description`: **16–2048** chars. Corpus median **54**; single-command extensions median **50.5**; p90 114.
- `commands[].description`: min **12** chars (easy to trip with something terse).
- `commands[].name` maps to `src/<name>.tsx` — a file-layout decision, not just a label.
- `commands[].mode`: `view` | `no-view` | `menu-bar`.
- `author` must be the **Raycast Store handle**, not the GitHub one ([prepare-an-extension-for-store](https://developers.raycast.com/basics/prepare-an-extension-for-store), "Metadata and Configuration").
- `categories`: from a fixed 15-value Title Case enum. Schema doesn't force it (329/3105 omit); review does ("All extensions should be published with at least one category").
- `platforms`: docs mark it required, **1325/3105 omit it** → optional in practice. Open field for ticket 06.
- `keywords`: only 362/3105 use it (12%). `extensions/claude` does: `["anthropic","claude","chat","ai"]`.
- `icon`: 512×512 PNG in `assets/`, optional `@dark` twin. **Using the default Raycast icon is an explicit rejection reason.**
- Latest deps at repo tip: `@raycast/api` `^1.104.23`, `@raycast/utils` `^2.2.7`.

**Naming conventions review enforces** — all from [prepare-an-extension-for-store](https://developers.raycast.com/basics/prepare-an-extension-for-store). None is CI-checked (`rg -il 'title case|apple style' .github scripts` → no hits), so a human reviewer applies them:

- Apple Style Guide **Title Case** for extension title, command titles, and Action Panel action titles.
- **The single-command rule** — *"If your extension has only one command, you probably need to name the extension close to what this command does. Example: `Visual Studio Code Recent Projects` instead of just `Visual Studio Code`."* This is the rule that bites us hardest (see the flag at the bottom).
- Nouns over verbs for the extension title; `<verb> <noun>` or `<noun>` for the command title; **no articles**.
- Command title must not be just the service name (`Search Packages` ✅, `NPM` ❌).
- **No subtitle for a single-command extension** — *"Don't use a subtitle if it doesn't add context. Usually, this is the case with single command extensions."* Soft in practice: several single-command brand extensions keep one anyway.
- Description is **one sentence**.
- **US English only**, no localization mechanism. (The map's English-only lock is not a preference — it's the rule.)
- **No external analytics**, ever.

### (b) Trademark and icon — yes to both, with strong precedent

There is **no trademark policy and no logo policy** anywhere in Raycast's developer docs. `rg -in 'trademark|brand|logo|copyright|third.party'` over the entire `docs/` tree returns two hits, neither restrictive: "check the terms of service of third-party services" and "it's okay to use lower case for … trademarks that are canonically written with lower case letters."

[manual.raycast.com/extensions-guidelines](https://manual.raycast.com/extensions-guidelines) lists the rejection reasons. The only brand-adjacent ones are **impersonation**, **violating the third party's ToS** (example: "scraping a website without permission"), and **restricted words — currently only "Assistant"**. Naming a vendor's product and showing its mark is neither impersonation nor a ToS breach on this evidence.

Precedent from the clone, icons verified by opening the PNGs:

- `extensions/claude/package.json` — `"title": "Claude"`, the **bare trademark**, plus `assets/icon.png` and `icon@dark.png` which are **Anthropic's exact "A\\" wordmark, unmodified**. `"description": "Interact with Anthropic's Claude API directly from Raycast"`. No disclaimer, no "unofficial", 8 contributors, live on the Store.
- `extensions/claude-sessions/assets/icon.png` — the **Claude sunburst glyph** verbatim, on Anthropic's clay/coral.
- `extensions/claude-code-launcher/assets/icon.png` — sunburst glyph, brand palette.
- `extensions/claudecast/assets/command-icon.png` — sunburst **rotated inside a diamond**: a derivative.
- `extensions/claude-code-cheatsheet/assets/extension_icon.png` — plain **"CC" lettermark** in Anthropic's palette, no vendor glyph at all.
- `extensions/agent-usage/assets/` bundles 14 vendors' marks (`claude-icon.svg`, `codex-icon.svg`, `copilot-icon.svg`, …) and names all 14 trademarks in its description.
- Same outside Anthropic: `extensions/perplexity/assets/perplexity-logo.png` is Perplexity's exact mark (verified visually); `notion/notion-logo.png`, `linear/linear-app-icon.png`, `slack/slack-icon-rounded.png`, `chatgpt/chatgpt-logo.png`, `openai-gpt/openai-logo.png`. Corpus census: **548 extensions** ship an icon whose filename names a brand.

So: verbatim vendor mark, glyph derivative, and own-lettermark-in-vendor-palette **all** ship. Choosing a derivative is a legal-comfort call for the author, not a Store requirement.

**Naming pattern for single-command brand extensions** (43 sampled): `<Brand> <Function Noun>` — `GitHub Repository Search`, `GitHub Stars`, `GitHub Status`, `Notion Page Search`, `Figma Variables`, `Slack Status`, `Claude Code Launcher`, `OpenAI Speak`. The single bare-brand counterexample is `Perplexity` (one command, `Ask Perplexity`).

The closest structural analogue in the entire corpus is `extensions/china-ip-address`: title `China IP Address`, one `view` command `Lookup China IP Address`, no subtitle, no `platforms`, 32-char description, `categories: ["Applications"]`.

### (c) Plain HTTP and undocumented endpoints — both pass

**Plain HTTP is not a review gate** (measured; nothing in the docs mentions transport). `http://ip-api.com/json/` — the very geo provider under consideration — ships over plain HTTP in **7 extensions**: `roblox/src/hooks/ip-info.tsx:21`, `whois/src/hooks/use-whois-data.ts:5`, `world-clock/src/utils/costants.ts:8`, `ipcheck-ing/src/getIPDetails.ts:12`, `mozilla-vpn/src/utils/fetchCurrentIP.ts:119`, `ip-geolocation/src/utils/constants.ts:3`, `ip-tools/src/geoLocation.tsx:20`. Also `http://numbersapi.com` (`number-facts`, 4 files), `http://bugmenot.com` (an HTML scrape), `http://apilayer.net`. `mailboxlayer/src/validate-email-address.tsx:12` and `vatlayer/src/utils/constants.ts:6` gate it behind a `USE_HTTPS` preference — the tidiest precedent if the geo call ends up on `http://`.

**`cdn-cgi/trace` is shipped idiom.** `ipcheck-ing/src/getExternalIP.ts:31,50,69,88,107` hits it on `4.ipcheck.ing`, `6.ipcheck.ing`, `64.ipcheck.ing`, `1.0.0.1`, and `[2606:4700:4700::1111]`; `charged/src/utils/analytics.tsx:17` hits `www.cloudflare.com/cdn-cgi/trace`. (Don't copy `charged`'s surrounding analytics module — external analytics are explicitly banned.)

**Undocumented vendor endpoints are shipped too.** The best precedent: `china-ip-address/src/ip.tsx:18` fetches `https://www.taobao.com/help/getip.php` — an undocumented, unauthenticated IP-echo helper on Alibaba's own website, part of no published API, used solely to read the caller's egress IP. That is nearly the exact shape of `claude.ai/cdn-cgi/trace`.

Explicit "Unofficial" framing in the description is a normal, accepted move — 16+ extensions do it, including `things` ("uses an unofficial internal format that may break on Things updates") and `slackmojis` ("An unofficial directory…").

**No extension currently *fetches* from `claude.ai`** — the 7 `claude.ai` references in the corpus are all URL-opening or link validation (`prompts-chat/src/utils.ts:63`, `search-router/…:12396`, `agent-usage/src/agent-usage.tsx:182`, `claude-session-bookmarks/…`). So our call would be the first, but the technique and the endpoint shape both have precedent.

(inferred) The one rule that genuinely applies is "Violates the Terms of Service of the service provided". `cdn-cgi/trace` returns only the requester's own connection metadata — no site content, no user data, no authenticated resource — so it is not scraping and not "access to content not intentionally made available". Whether Anthropic's ToS objects to non-browser requests to `claude.ai` is a question the Raycast docs cannot answer, and it is a **submission-time** question, not a manifest one.

### (d) Bites now vs. bites at submission

**Shapes the manifest / repo now:**

1. `license: "MIT"` — schema enum, 3105/3105. Pins the `LICENSE` file at repo bootstrap.
2. **Single-command naming rule** — the extension title must be function-specific, not a bare product name.
3. No `subtitle` on the single command (soft, but the default should be to omit).
4. Title Case, no articles, US English spelling.
5. `description` 16–2048, one sentence, target ~50–70 chars to match the corpus.
6. At least one category from the 15-value enum. `Developer Tools` is what `ipcheck-ing` uses alone; `Web` is the other plausible fit.
7. Icon decision — vendor mark vs. derivative — because it is a 512×512 PNG asset the build needs, plus the optional `@dark` twin (`extensions/claude` ships both).
8. `name` lowercase URL-safe, ≥3 chars; it is the Store URL.
9. `author` = Raycast Store handle (may differ from the GitHub handle — needs confirming before the manifest is written).
10. `commands[0].name` determines the source filename.
11. No analytics — constrains what any geo request may carry.
12. Pin `@raycast/api` at or near `^1.104.23`; `$schema` line by convention.

**Submission-time only (out of scope per the map):**

- `metadata/` screenshots, 2000×1250 PNG, CI-validated for padding/symmetry (`scripts/check_raycast_images.py`) — but only when the folder exists.
- `CHANGELOG.md` with the `{PR_MERGE_DATE}` placeholder — **hard CI fail** (`changelog_enforcer.yml`) on any `extensions/**` change.
- `package-lock.json` committed; npm, not pnpm/bun.
- README if setup is required.
- Anthropic ToS check; duplicate-value check against `ipcheck-ing`, `ip-geolocation`, `myip`, `china-ip-address` (see research file §E — none answers the per-destination question).
- `npm run build` and `ray lint` clean.

### Precedent-shaped manifest skeleton

Not a decision — ticket 06 owns naming, author handle, icon, and platforms. This is the shape the corpus says review accepts, with every field traceable to a real extension. `<…>` marks a ticket-06 slot.

```jsonc
{
  "$schema": "https://www.raycast.com/schemas/extension.json",
  "name": "<lowercase-url-slug>",              // e.g. china-ip-address; ≥3 chars, [a-z0-9-_~]
  "title": "<Brand + Function Noun>",          // NOT bare "Claude" — single-command rule.
                                               // Shape per China IP Address / GitHub Status.
  "description": "<one sentence, 16-2048 chars, target ~50-70>",
  "icon": "extension-icon.png",                // 512x512 PNG in assets/; add extension-icon@dark.png
                                               // if the mark needs a light/dark pair (cf. extensions/claude)
  "author": "<raycast-store-handle>",          // Raycast handle, not GitHub
  "categories": ["Developer Tools"],           // ipcheck-ing uses this alone; "Web" also fits
  "license": "MIT",                            // only accepted value
  "keywords": ["claude", "anthropic", "ip"],   // optional; extensions/claude does this
  "platforms": ["macOS"],                      // optional (43% omit); declare if intent is macOS-only
  "commands": [
    {
      "name": "<maps-to-src/<name>.tsx>",
      "title": "<Verb Noun>",                  // e.g. "Lookup Claude Exit IP"; no articles
      "description": "<≥12 chars>",
      "mode": "view"
      // no "subtitle" — single-command extension
    }
  ],
  "dependencies": {
    "@raycast/api": "^1.104.23",
    "@raycast/utils": "^2.2.7"
  },
  // devDependencies below are the modal values among extensions already on
  // @raycast/api ^1.104.23 (measured, n=28 such extensions)
  "devDependencies": {
    "@raycast/eslint-config": "^2.2.0",
    "@types/node": "^26.1.1",
    "@types/react": "19.2.17",
    "eslint": "^10.7.0",
    "prettier": "^3.9.6",
    "typescript": "^6.0.0"
  },
  "scripts": {
    "build": "ray build", "dev": "ray develop",
    "lint": "ray lint", "fix-lint": "ray lint --fix",
    "publish": "npx @raycast/api@latest publish"
  }
}
```

### Flag for the map

The **single-command naming rule** is the one finding that constrains a decision the map has left open: a manifest with `"title": "Claude"` would be against a documented guideline, even though `extensions/claude` (5 commands) gets exactly that title. A one-command extension needs a function-qualified title in the `China IP Address` / `GitHub Status` mould. Nothing else here contradicts the map: English-only is required rather than merely chosen, `mode: view` is fine, and `claude.ai/cdn-cgi/trace` plus a plain-HTTP geo provider both have shipped precedent.
