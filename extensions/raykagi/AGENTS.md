# AGENTS.md

Guidance for AI coding agents working on **RayKagi** — an unofficial [Raycast](https://raycast.com) extension for [Kagi](https://kagi.com). Human contributors: see [CONTRIBUTING.md](CONTRIBUTING.md).

## What this is

A Raycast extension that surfaces Kagi services. Only **Search** uses Kagi's paid v1 Search API (results shown in Raycast); every other command opens a Kagi web page in the browser. Built with the Raycast API + React + TypeScript.

## Setup & commands

```sh
npm install
npm run dev      # ray develop — loads into Raycast with hot reload; keep running while iterating
npm run build    # ray build (distribution build)
npm run lint     # ray lint (ESLint + Prettier + manifest/icon validation)
npm run fix-lint # ray lint --fix
node scripts/check-urls.mjs   # dependency-free assertions for src/urls.ts
```

### The gate (run all before committing / opening a PR)

```sh
npx prettier --write "src/**/*.{ts,tsx}"
npx tsc --noEmit
node scripts/check-urls.mjs
npm run lint
npm run build
```

All five must pass. `ray build` is laxer than `ray lint` — **always trust `ray lint`** (it caught a bad license value and non-PNG icons that `ray build` ignored).

## Architecture

| Path | Purpose |
| --- | --- |
| `src/search.tsx` | Search command: free autosuggest (debounced) → paid v1 Search on Enter; `⌘⇧R` runs the `!research` bang |
| `src/bang.tsx` | "Create Kagi Bang Shortcut": browse bang catalog → Create Quicklink |
| `src/translate.tsx` | Translate to a default language; save language-pair presets (`useLocalStorage`); bind pairs as Quicklinks |
| `src/summarize.tsx` | Open Kagi Universal Summarizer for a URL |
| `src/news.ts`, `src/smallweb.ts`, `src/assistant.ts` | `no-view` launchers that `open()` a Kagi URL |
| `src/kagi.ts` | Kagi v1 Search client + bangs catalog cache (`Cache`); re-exports `./urls` |
| `src/urls.ts` | **Pure** URL builders/parsers (no `@raycast/api` import → unit-testable) |
| `scripts/check-urls.mjs` | Assertions over `src/urls.ts` (no test framework) |
| `assets/` | Command icons — **PNG only** |
| `media/` | Non-runtime sources (e.g. `bang.svg`) — kept out of `assets/` |

If you change a URL builder in `src/urls.ts`, update/extend `scripts/check-urls.mjs`.

## Hard constraints / gotchas (learned the hard way)

- **License MUST be `"MIT"`** in `package.json`. Raycast's manifest schema rejects anything else (`ray lint`: "must be equal to constant"), and the Store mandates MIT. Do not change it.
- **Command/extension icons must be PNG files in `assets/`** (512×512). Built-in icon identifiers (e.g. `"stars-16"`) and `.svg` files **fail `ray lint`** ("Use png format for icon") even though `ray build` accepts them. Built-in `Icon.*` is fine *inside* code (List/Action `icon` props).
- **Billing is gated on confirm.** The paid v1 Search API runs only when the user presses Enter (a `submitted` state). Autosuggest is the free endpoint and is **debounced 250ms** — never fire a paid request per keystroke.
- **Only Search needs the API token.** Quick-answer-style features, Translate, Summarize, News, Small Web, Assistant, and bangs are browser/URL only (Kagi exposes no API for them). The token is an optional `password` preference.
- **`fetch` is global** in the Raycast runtime — don't add `node-fetch`.
- **Kagi error shapes differ:** v0 = `error[].msg`, v1 = `errors[].message`. `kagiJson` handles both.
- **v1 search response shape is parsed defensively** (named `data.search` array *or* legacy flat `data[].t===0`).
- Icons are **Kagi's official product logos** (their trademark) except `assets/bang.png`/`media/bang.svg`, which are original.

## Conventions

- TypeScript + React (function components). Prettier + `@raycast/eslint-config`. US English. Title Case for command/action titles.
- Keep changes minimal and match existing patterns. No new dependencies without strong reason.
- Don't commit secrets; the Kagi token is entered via Raycast preferences at runtime.

## Store publishing

See [developers.raycast.com](https://developers.raycast.com/basics/prepare-an-extension-for-store). Notes:
- Screenshots go in `metadata/` — exactly **2000×1250 PNG**, 3–6 of them (must be captured from the live Raycast UI).
- `CHANGELOG.md` entries use `## [Title] - {PR_MERGE_DATE}` (Raycast replaces the placeholder on merge).
- Publish with `npm run publish` (opens a PR to `raycast/extensions`; requires the maintainer's auth).
