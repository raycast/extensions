# Raycast Store submission checklist — Opencode Info (`opencode-raycast-plugin`)

Research for [issue #6](https://github.com/maerzbow/opencode-raycast-plugin/issues/6), part of the [publish map (#5)](https://github.com/maerzbow/opencode-raycast-plugin/issues/5). Checked against this repo's current state on 2026-09-10. Primary sources: the [extension.json manifest schema](https://www.raycast.com/schemas/extension.json), developers.raycast.com, the `raycast/extensions` monorepo workflows and the Raycast manual. Branch: `research/raycast-publish`.

**TL;DR — what must change in THIS repo before the submission PR:**

1. `package.json`: add `"categories"` (≥1, Title Case from the fixed enum), `"platforms": ["macOS"]`, `"keywords"` (optional), a `"lint"`/`"fix-lint"`/`"publish"` script, and bump `@raycast/api` to `^2.3.0`. Do **not** add a `version` field.
2. Create `CHANGELOG.md` (format `## [<Title>] - {PR_MERGE_DATE}`) — hard-CI failure without it.
3. Create `metadata/` with 3–6 screenshots at exactly 2000×1250 PNG, one consistent background, named `opencode-raycast-plugin-N.png`.
4. Add ESLint config (`eslint.config.js` extending `@raycast/eslint-config`) + devDeps.
5. README: document the hardcoded `~/.local/share/opencode/auth.json` read and the `goKey` preference (additional setup is required).
6. Already OK: `name`/`title`/`description`/`icon`/`author`/`license: "MIT"`, 2 commands, `package-lock.json` committed, `node_modules` gitignored, icons 512×512.

---

## 1. How submission works

- Submission = a PR to the `raycast/extensions` monorepo (`extensions/<slug>/`). `npm run publish` (`npx @raycast/api@latest publish`) authenticates with **GitHub**, squashes commits, and auto-opens the PR. [Publish an Extension](https://developers.raycast.com/basics/publish-an-extension.md)
- The repo is a monorepo; each extension lives at `extensions/<name>/`. In *this* repo the extension **is the repo root**, so every file below is relative to the repo root and lands at the monorepo path `extensions/opencode-raycast-plugin/...`.
- After review/merge, the extension is automatically published to the public Store; the merge itself is done by the Raycast team (FIFO). [Publish an Extension](https://developers.raycast.com/basics/publish-an-extension.md), [Extensions Guidelines](https://manual.raycast.com/extensions-guidelines)
- Store link once published: `raycast.com/<author>/<name>` → `raycast.com/maerzbow/opencode-raycast-plugin`. Schema `name`/`owner` descriptions.

## 2. Manifest (`package.json`)

Schema `required`: `name`, `title`, `description`, `icon`, `author`, `license`, `commands`, `dependencies`. (Schema has **no `version` property** — do not add one.)

| Field | Rule (source) | This repo |
|---|---|---|
| `name` | slug, `^(@workaround/)?[a-z0-9-~][a-z0-9-_~]*$`, min 3 chars; store URL part (schema) | `opencode-raycast-plugin` ✓ (keep) |
| `title` | human name, Title-Case/Apple-Style-Guidance, min 2 (schema; [prepare](https://developers.raycast.com/basics/prepare-an-extension-for-store.md)) | `Opencode Info` ✓ |
| `description` | min 16 chars (schema) | ✓ ("Opencode Info — limit windows, model catalog, and daily picks.") |
| `icon` | 512×512 PNG in `assets/`, referenced by filename (schema; [manifest](https://developers.raycast.com/information/manifest.md)) | `assets/icon.png` ✓ 512×512 |
| `author` | **must be your Raycast Store handle (username)**, min 2, `^[a-zA-Z0-9-*~]...` (schema; manifest doc) | `maerzbow` ✓ **but must be a real Raycast username** (account task #7) |
| `license` | schema `const: "MIT"` — exactly `"MIT"` | ✓ `"MIT"` |
| `commands` | min 1; each `name`/`title`/`description`/`mode` (schema). Command name maps to `src/<name>.tsx` | 2 commands ✓ (view + menu-bar), names valid |
| `dependencies` | must include `@raycast/api` (schema `required`) | ✓ present, **but pinned `^2.2.1`, latest is 2.3.0** → bump |
| `categories` | **required by store guidelines** ("All extensions should be published with at least one category"), Title Case (prepare doc); fixed enum in schema | **MISSING** → add |
| `platforms` | optional in schema ("assumed available on all platforms"); prepare doc: set it to what the extension actually supports. macOS-only here (menu-bar, `homedir` paths) | **MISSING** → add `["macOS"]` |
| `keywords` | optional; max 12, each ≤25 chars, no commas/CR/LF/TAB, unique (schema `$defs.keywords`) | **MISSING** → optional, add if desired |

Valid `categories` (schema enum): `Applications`, `Communication`, `Data`, `Documentation`, `Design Tools`, `Developer Tools`, `Finance`, `Fun`, `Media`, `News`, `Productivity`, `Security`, `System`, `Web`, `Other`. Best fit here: `["Productivity"]` and/or `["Developer Tools"]`.

**Extension/command naming** — Apple Style Guide / Title Case; lowercase is fine for canonically-lowercase trademarks (`macOS`, `npm`); avoid generic titles. `Opencode Info` is acceptable; the only restricted word is "Assistant" (see §7). [prepare](https://developers.raycast.com/basics/prepare-an-extension-for-store.md), [Extensions Guidelines](https://manual.raycast.com/extensions-guidelines)

## 3. Required files

- **`CHANGELOG.md`** — required at extension root for store updates. `changelog_enforcer` fails the PR if any changed extension lacks a `CHANGELOG.md` change (case-mismatch also fails). Format: `## [<Title>] - {PR_MERGE_DATE}` (h2, title in square brackets, hyphen with spaces). [prepare](https://developers.raycast.com/basics/prepare-an-extension-for-store.md); [changelog_enforcer.yml](https://github.com/raycast/extensions/blob/main/.github/workflows/changelog_enforcer.yml) + [action](https://github.com/raycast/github-actions/blob/master/changelog-enforcer/index.js). **MISSING here** → create.
- **`README.md`** — required **if additional setup is needed** ("About This Extension" onboarding button). This extension reads a local credentials file and needs a Go key → README is required. Present ✓, but must document the setup (see §6). Linked media go in a top-level `media/` folder (not `assets/`). [prepare](https://developers.raycast.com/basics/prepare-an-extension-for-store.md)
- **`metadata/` screenshots** — max 6, **recommended ≥3**, exactly 2000×1250 (16:10) PNG, no dark-mode, **one consistent background** across the set, must not show sensitive data or other apps. Capture via Raycast Window Capture → "Save to Metadata" (eliminates the dev UI). Naming convention in the monorepo: `<extension>-N.png` → `opencode-raycast-plugin-1.png` … (e.g. [tailwindcss](https://github.com/raycast/extensions/tree/main/extensions/tailwindcss/metadata)). [prepare](https://developers.raycast.com/basics/prepare-an-extension-for-store.md); enforced by [metadata_image_enforcer.yml](https://github.com/raycast/extensions/blob/main/.github/workflows/metadata_image_enforcer.yml) via [check_metadata_images.py](https://github.com/raycast/extensions/blob/main/scripts/check_metadata_images.py) (PNG format, size 2000×1250, ≤6, background RMS ≤12.0, matching light/dark appearance, and **must not show the local extension icon in the bottom bar**). **MISSING here** → create.
- **Icons** — 512×512 PNG; extensions using the default Raycast icon are rejected; remove unused assets. `assets/icon.png` + `assets/menubar-icon.png` both 512×512 and both referenced ✓.
- **`package-lock.json` committed** — required (CI runs `npm ci`). Present ✓. **`node_modules` must NOT be committed** — gitignored ✓. npm only. [prepare](https://developers.raycast.com/basics/prepare-an-extension-for-store.md)

## 4. CI checks on the submission PR (`raycast/extensions`)

Workflows that run on `extensions/**` PRs:

| Workflow | What it does | Fails the PR when |
|---|---|---|
| `extensions_build_publish.yml` | Runs the Ray CLI (`ray build`) on macOS; problem-matcher annotates the diff | Schema/manifest invalid, build/type errors, missing/invalid assets, `author` not a Raycast user (owner allow-list for existing extensions) |
| `npm_check.yml` | `npm ci` + `npm-check` on macOS | Deps issues (reported as warnings; `continue-on-error`) |
| `changelog_enforcer.yml` | Requires a `CHANGELOG.md` change for each touched extension | **Missing or wrong-case CHANGELOG.md** (label `skip-changelog` opts out) |
| `metadata_image_enforcer.yml` | Validates `metadata/**` images (PNG, 2000×1250, ≤6, consistent background/appearance, no dev-icon) | Any of the above metadata violations |
| `pr-bot.yml` | Labels (new extension / AI Extension), platform labels, welcome comment, expectations | Informational; not a hard gate |
| `stale.yml` | PRs marked stale after **25 days** inactivity, closed after 7 more | — |

Stale lifecycle per the [Extensions Guidelines](https://manual.raycast.com/extensions-guidelines): stale after 14 days, closed after 21 (the workflow config currently says 25/7 — the workflow is the operative source). Keep responding to review comments or the PR is closed.

## 5. Build / lint / `@raycast/api` version policy

- **Latest API required**: "Ensure you are using the latest Raycast API version" — latest today is **2.3.0**; repo is on `^2.2.1` → bump (also `@raycast/utils`, latest 2.3.1, repo `^2.3.1` ✓). [prepare](https://developers.raycast.com/basics/prepare-an-extension-for-store.md)
- **`npm run build`** (`ray build -e dist`) validates for distribution and is what CI runs. Present ✓.
- **Lint**: `ray lint` runs ESLint on `src`; the docs say lint checks run via automated GitHub checks. The repo has **no `lint` script, no eslint config, no `eslint`/`@raycast/eslint-config` devDeps**. Standard template setup (see e.g. `extensions/tailwindcss`): scripts `"lint": "ray lint"`, `"fix-lint": "ray lint --fix"`, `"publish": "npx @raycast/api@latest publish"`, plus an `eslint.config.js` that spreads `@raycast/eslint-config`, with devDeps `eslint` + `@raycast/eslint-config`. [CLI](https://developers.raycast.com/information/developer-tools/cli.md), [prepare](https://developers.raycast.com/basics/prepare-an-extension-for-store.md)
- **`prepublishOnly`** guard (blocks accidental npm publish) is part of the standard template — recommended.

## 6. Local file reads / external CLIs / keychain

- **Local file reads are allowed.** The "Binary Dependencies" section of [prepare](https://developers.raycast.com/basics/prepare-an-extension-for-store.md) explicitly permits *"calling known system binaries"* and local integration; there is no sandbox that forbids reading a file at a hardcoded path. The preference types `file` and `directory` exist as the *preferred* way to let users point at such paths, but they are not mandatory.
- **`Keychain Access` → rejection** — the extension must not request keychain access. Reading `~/.local/share/opencode/auth.json` with `node:fs` is not keychain access. ✓
- This repo reads `~/.local/share/opencode/auth.json` (hardcoded in `src/lib/usage.ts`) with a `goKey` password preference as fallback. **No `sqlite3` shell-out exists in the current code** (the earlier fact-finding note to the contrary is outdated) — it reads the auth JSON via `node:fs/promises` and fetches `models.dev` and `opencode.ai/zen/v1` over HTTP.
- Because setup is non-trivial (auth file location + optional key), the **README must document it** (per §3). The map's settled decision — keep the hardcoded path and document it — is compliant.
- Network fetches to third-party services (`models.dev`, `opencode.ai/zen/v1`) are fine, but "check the terms of service of third-party services that your extension uses." [prepare](https://developers.raycast.com/basics/prepare-an-extension-for-store.md)

## 7. Surfacing OpenCode Go paid-usage data; product name / trademark / impersonation

- **No special rule about paid-subscription usage data.** The only "Before Acceptance" requirements are value/uniqueness, working software + README documentation, and *"check the terms of service of third-party services that your extension uses"* (the opencode ToS). [Extensions Guidelines](https://manual.raycast.com/extensions-guidelines)
- **Restricted words**: currently only **"Assistant"** is restricted. `Opencode Info` does not use it. ✓
- **Impersonation** is a rejection reason (ToS clause) — this extension surfaces the user's *own* opencode usage and names the product family; it does not impersonate opencode or Raycast. Branding the extension "Opencode Info" while slug is `opencode-raycast-plugin` is fine; extensions routinely use product names (e.g. "GitHub", "Brew"). The README should keep crediting the KDE widget idea (already does) and the product-family language from `CONTEXT.md` ("OpenCode Go is the subscription surface"). ✓
- **No trademark policy beyond impersonation**, and "official"/"by the vendor" is **not** required — third parties publish freely.

## 8. Accounts, login, visibility

- Publishing (opening the PR) authenticates with **GitHub**; **`ray login` is only required for private/org publishing** and CLI auth. [Publish an Extension](https://developers.raycast.com/basics/publish-an-extension.md), [Publish a Private Extension](https://developers.raycast.com/teams/publish-a-private-extension.md)
- The `author` field must be a **real Raycast Store username**; the Ray CLI enforces author validity on publish (owner allow-list). This is task #7 ("set up Raycast account + ray login for author 'maerzbow'").
- Public listing (no `owner` field) is **fully public** after approval. Private publishing requires `owner` (organization handle) + org membership. [manifest](https://developers.raycast.com/information/manifest.md), [Publish a Private Extension](https://developers.raycast.com/teams/publish-a-private-extension.md)
- The PR must be created from a fork **with maintainer edits allowed** (a `pull_request_ensure_maintainer_can_modify.yml` check exists) — `npm run publish` handles this.

---

## Concrete submission checklist for THIS repo

### Must fix before the PR (CI/gate)
- [ ] `package.json` — add `"categories": ["Productivity"]` (or `["Productivity", "Developer Tools"]`; Title Case, from the fixed enum).
- [ ] `package.json` — add `"platforms": ["macOS"]`.
- [ ] `package.json` — bump `"@raycast/api"` to `^2.3.0` (latest); run `npm install` and commit `package-lock.json`.
- [ ] Create `CHANGELOG.md` with `## [Initial Release] - {PR_MERGE_DATE}` as the top entry (changelog_enforcer fails without it).
- [ ] Add lint setup: `"lint": "ray lint"` and `"fix-lint": "ray lint --fix"` scripts, `eslint.config.js` extending `@raycast/eslint-config`, devDeps `eslint` + `@raycast/eslint-config`; fix any violations.
- [ ] Create `metadata/opencode-raycast-plugin-1.png` … at least 3, exactly 2000×1250 PNG, one consistent background, light theme, captured with Window Capture → "Save to Metadata" (no local icon in bottom bar, no other apps/sensitive data).

### Must fix before human review
- [ ] `package.json` — add `"publish": "npx @raycast/api@latest publish"` (+ optional `prepublishOnly` guard) so `npm run publish` works.
- [ ] README — document the hardcoded `~/.local/share/opencode/auth.json` read (and that the key lives under `opencode-go.key`), the `goKey` preference fallback, and that an active OpenCode Go subscription is required.
- [ ] `package.json` — add optional `"keywords"` (≤12, each ≤25 chars, no commas) e.g. `["opencode", "usage", "subscription", "models", "quota"]`.
- [ ] Run `npm run build` locally to confirm the distribution build passes before opening the PR.

### Already satisfied (do not touch)
- `name` `opencode-raycast-plugin` (min-3 slug), `title` `Opencode Info`, `description` (≥16 chars), `icon` 512×512 PNG, `license` exactly `"MIT"`, `author` `maerzbow` (verify it matches the Raycast username once created), 2 commands with all four required fields, `dependencies` includes `@raycast/api`/`@raycast/utils`.
- `package-lock.json` committed; `node_modules/` + `dist/` gitignored; npm only; no `version` field (correct — schema has none).
- No keychain access; local-file read + documented setup is compliant.
- Title uses no restricted word ("Assistant"); no impersonation concern.

### Sources
- [extension.json schema](https://www.raycast.com/schemas/extension.json)
- [Publish an Extension](https://developers.raycast.com/basics/publish-an-extension.md)
- [Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store.md)
- [Manifest](https://developers.raycast.com/information/manifest.md) / [CLI](https://developers.raycast.com/information/developer-tools/cli.md)
- [Extensions Guidelines](https://manual.raycast.com/extensions-guidelines)
- [Publish a Private Extension](https://developers.raycast.com/teams/publish-a-private-extension.md)
- `raycast/extensions` workflows: `changelog_enforcer.yml`, `npm_check.yml`, `metadata_image_enforcer.yml`, `extensions_build_publish.yml`, `pr-bot.yml`, `stale.yml`; `scripts/check_metadata_images.py`