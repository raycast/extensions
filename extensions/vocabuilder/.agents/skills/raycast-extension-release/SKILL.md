---
name: raycast-extension-release
description: Prepare a Raycast extension for a Store release — reconcile the changelog against the published copy, run the full quality gate, audit store metadata, and open the PR. Use whenever the user mentions releasing, publishing, shipping, cutting a version, preparing a release, updating the changelog, `npm run publish`, `pull-contributions`, or wants to be sure the extension passes store CI before pushing.
---

# Raycast Extension Release

Raycast extensions have **no version number** — no semver, no `version` field in the manifest, no git tags. A release is one merged PR into `raycast/extensions`, and the `## [Title]` line in `CHANGELOG.md` is the only release identity. Read `reference.md` in this directory for the requirement tables, CI constants, and the source URLs behind every rule here.

Work through the steps in order. Step 1 is the one that catches the damage nothing else will.

## Step 1: Reconcile the changelog with what is actually published

**Do this before touching `CHANGELOG.md`, every single time.**

`{PR_MERGE_DATE}` is replaced by a `sed` in the *monorepo's* merge workflow — never in your repo. So after every merge, your local file still shows `{PR_MERGE_DATE}` on a section that **already shipped**. The next release then edits that section in place, silently deleting a dated entry from users' Version History.

Diff against the published copy:

```bash
EXT=<extension-name>   # package.json "name"
curl -sS "https://raw.githubusercontent.com/raycast/extensions/main/extensions/$EXT/CHANGELOG.md" \
  > /tmp/store-CHANGELOG.md
diff -u /tmp/store-CHANGELOG.md CHANGELOG.md
```

Every `## [...] - YYYY-MM-DD` section in the store copy is immutable history. If one is missing or altered locally, restore it verbatim, then put the new work in a fresh section above it.

Then check for bullets that already shipped. A bullet carried over from the section that was live at the last publish will re-announce work users already have:

```bash
python3 - <<'PY'
store = [l.rstrip("\n") for l in open("/tmp/store-CHANGELOG.md") if l.startswith("- ")]
local = set(l.rstrip("\n") for l in open("CHANGELOG.md") if l.startswith("- "))
print("LOST (shipped, now absent):")
[print(" ", b) for b in store if b not in local]
PY
```

Nothing should be listed. Anything that is, you deleted from the published history.

## Step 2: Decide what belongs in the new section

The store's own copy is the release boundary, not a git tag. `npm run publish` also leaves a marker tag, useful as a cross-check:

```bash
git log "$(git tag -l '__raycast_latest_publish_ext/*' | head -1)"..HEAD --oneline
```

Read the **diff** of each unpublished commit, not its subject line. Subjects lie: a commit called "prototype" can ship real UI, and a later commit can revert an earlier one inside the same unpublished range — in which case neither gets a bullet.

- One bullet per user-visible change: UI, behavior, preferences, shortcuts, exported file formats, error copy.
- Skip internal-only work — dependency bumps, CI, tests, refactors.
- Call out anything that breaks a format or a habit users rely on (an export's columns, a keyboard shortcut) and say what they must do about it.
- Cross-check every bullet against the code. A bullet describing a mechanism a later commit removed is worse than no bullet.

Heading format, exactly:

```markdown
## [Short descriptive title] - {PR_MERGE_DATE}
```

Square brackets around the title, ` - ` with a space each side, the placeholder spelled exactly. **One section per PR** — the merge `sed` uses `/g`, so two occurrences of the placeholder both become the same date. Newest first; Raycast renders file order verbatim and never sorts.

`ray lint` does **not** validate any of this. Nothing local does. Check it by eye.

## Step 3: Quality gate

Run all four; don't stop at the first failure, so you see the whole picture.

```bash
mise exec -- npm run typecheck && mise exec -- npm run lint && mise exec -- npm run test && mise exec -- npm run build
```

Confirm `build` is a **distribution** build. `ray build` defaults to `-e dev`; the store expects `dist`, which does additional type checking and produces the optimized output:

```bash
grep '"build"' package.json   # want: "ray build -e dist"
```

Fix failures at the source, re-run the step, then re-run everything after it. `ray lint --fix` handles formatting and some shortcut conventions; read what it changed before keeping it.

Warnings are not blockers but are review-visible — `@raycast/prefer-common-shortcut` in particular tells you a chord collides with a `Keyboard.Shortcut.Common` convention.

## Step 4: Store metadata

Screenshot validation is **automated and pixel-forensic**, not a human glance. Run the store's own validator locally before pushing:

```bash
mkdir -p /tmp/raycheck/scripts /tmp/raycheck/extensions/$EXT
curl -sS -o /tmp/raycheck/scripts/check_metadata_images.py \
  https://raw.githubusercontent.com/raycast/extensions/main/scripts/check_metadata_images.py
curl -sS -o /tmp/raycheck/scripts/check_raycast_images.py \
  https://raw.githubusercontent.com/raycast/extensions/main/scripts/check_raycast_images.py
cp -R metadata /tmp/raycheck/extensions/$EXT/ && cp package.json /tmp/raycheck/extensions/$EXT/
rm -f /tmp/raycheck/extensions/$EXT/metadata/.DS_Store
python3 -m venv /tmp/raycheck/.venv && /tmp/raycheck/.venv/bin/pip install -q numpy pillow
cd /tmp/raycheck && ./.venv/bin/python scripts/check_metadata_images.py extensions/$EXT
```

It checks exact 2000×1250 size, PNG format, max 6 screenshots, ~12.5% padding per side (±4.5%, sides symmetric within 4%), a consistent background across all shots, and a consistent light/dark appearance. None of those numbers are on the docs site.

Then confirm the screenshots still show the **current** UI. Open them and compare against what the new changelog section says changed. A redesigned detail pane means the screenshot of that pane is stale — recapture with Raycast's Window Capture, which produces the right geometry automatically.

Also verify: icon is a 512×512 PNG that reads on both light and dark backgrounds and is not Raycast's default; `README.md` exists (required when the extension needs an API key or other setup) and its shortcut table, feature list, and supported-language list match the code.

## Step 5: Publish

`publish` does **not** consult git when deciding what to ship. It runs a plain recursive copy of your whole working directory (`@raycast/api/dist/utils/publish/copy-dir.js`), skipping only a hardcoded list: `.git`, `.github`, `node_modules`, `raycast-env.d.ts`, `.raycast-swift-build`, `.swiftpm`, `compiled_raycast_swift`, `compiled_raycast_rust`. Editor folders, agent tooling, caches, and `.env` are all copied.

Two consequences:

- **`.gitignore` is load-bearing for secrets.** Ignored files are still *copied* into the monorepo checkout; they are merely not *staged*, because your own `.gitignore` is copied alongside them. An untracked directory that is not in `.gitignore` gets committed into the public PR. Check before publishing:

  ```bash
  mise exec -- node -e 'require("./node_modules/@raycast/api/dist/utils/publish/copy-dir.js").copyDir(".","/tmp/pubcheck")' \
    && (cd /tmp/pubcheck && git init -q . && git add -A && git status --short | head -50)
  ```

  Anything listed that is not source, assets, metadata, or config should go in `.gitignore` first.

- **A symlink to a directory breaks the publish.** `copyDir` branches on `lstat().isDirectory()`, which is false for any symlink, so a symlink-to-directory falls through to `copyFileSync` and throws `ENOTSUP`/`EISDIR`. A symlink to a *file* is fine — it is followed and copied as a regular file.

`ray publish` also refuses to start while the working tree is dirty in any way — modified, renamed, unmerged, **or untracked**. Commit or ignore everything first. Watch for `raycast-env.d.ts`: it is tracked but regenerated by `ray build` and `ray develop`, so a local build that changes a preference dirties the tree.

Then:

```bash
mise exec -- npm run publish
```

This forks, pushes to `ext/<name>`, and opens a PR **as a draft**. The CLI never un-drafts it — **go to GitHub and click "Ready for review"**, or it sits unreviewed.

Confirm **"Allow edits from maintainers"** is on. It is a hard CI gate with its own workflow: the merge job pushes commits to your branch (the changelog date substitution, a `platforms` field, losslessly recompressed images), and fails outright if it cannot.

Those pushed commits are why the next publish will refuse until you run:

```bash
mise exec -- npx @raycast/api@latest pull-contributions
```

Re-running `mise exec -- npm run publish` afterwards updates the same PR.

## Guardrails

- Never run `mise exec -- npm run publish` or push without explicit approval — it opens a public PR in `raycast/extensions`.
- Never edit a `## [...] - YYYY-MM-DD` section that exists in the published copy.
- Never leave two `{PR_MERGE_DATE}` placeholders in the file.
- Never change `author` once published — the publish flow uses a GitHub code search on `name` + `author` to find your extension, and a change makes it look like a new one.
- Don't invent a version bump, a `version` field, or a release tag. They do not exist for Raycast extensions.
- Commit the Step 3 fixes separately from the changelog, so each is reviewable on its own.
- Public extensions cannot be published from CI — `ray publish --non-interactive` is rejected for the public store.

## Researching Raycast docs

Append `.md` to any `developers.raycast.com` URL for clean Markdown, and `?ask=<question>` for a cited answer:

```
https://developers.raycast.com/basics/prepare-an-extension-for-store.md
https://developers.raycast.com/information/manifest.md?ask=is%20platforms%20required
```

When the docs and the CI scripts disagree, **the scripts win**. `reference.md` lists the ones worth reading.

## This repo (VocaBuilder)

- Run every command through `mise exec --` (`mise exec -- npm run build`). The shell default Node is not the `.nvmrc` one, and git hooks inherit the Node of the `git commit` process.
- Store CI provisions Node 22.22.2 / npm 10.9.7. Regenerate `package-lock.json` only on npm 10.x — npm 11 drops an optional-peer node that `npm ci` then reports as `Missing: <pkg> from lock file`.
- `AGENTS.md` holds the project conventions; `CLAUDE.md` is a symlink to it and publishes as a regular file.
