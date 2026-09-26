# Releasing to the Raycast Store

Source: https://developers.raycast.com/basics/prepare-an-extension-for-store and https://developers.raycast.com/basics/publish-an-extension

## One-time prerequisites

- [x] Raycast username = `author` in package.json: `matt_herwig` (confirmed by owner). Deeplinks in CLAUDE.md and scripts/bench.swift use it too. Note: a second profile `raycast.com/mattherwig` also exists; make sure Raycast is signed in as `matt_herwig` before publishing.
- [ ] GitHub account (the publish command forks `raycast/extensions` and opens a PR from it).
- [ ] Node ≥ 22.22 (`nvm use`).
- [ ] Xcode 16.3+ installed and selected (`xcode-select -p`), needed to build the Swift helper.

## Pre-submit checklist

- [ ] `npm run check` passes (tests + `ray lint` + `ray build`).
- [ ] Manually test built extension: bind hotkeys (suggest ⌃⌥[ / ⌃⌥]), walk back 3 apps, forward 3, switch manually mid-walk, quit an app mid-walk, test with apps on other Spaces and hidden apps.
- [ ] `metadata/` folder: 3–6 PNG screenshots, 2000×1250 — **required** because `history` is a `view` command. Capture with Raycast "Window Capture" (hotkey in Raycast settings) → "Save to Metadata" while running `npm run dev`. Ideas: history list; command search showing both hotkey commands; HUD "No earlier app in history".
- [ ] Icon looks good in light + dark Raycast themes (`assets/extension-icon.png`, 512×512 PNG; optional `extension-icon@dark.png`).
- [ ] README.md explains hotkey setup (Store shows it).
- [ ] CHANGELOG.md top entry `## [Title] - {PR_MERGE_DATE}` (literal placeholder; Raycast fills it).
- [ ] `package-lock.json` committed.

## Publish

```bash
npm run publish
```

Authenticates with GitHub, forks raycast/extensions, squashes, opens PR. Fill the PR template (description + screencast of Back/Forward in action + checklist). Review: first contact ~1 week (can be up to 15 business days). PRs auto-close after 21 days inactive — respond to review comments promptly. Merge = auto-published.

## Updates

1. Add CHANGELOG entry on top (`## [What Changed] - {PR_MERGE_DATE}`).
2. If others contributed to the Store copy: `npx @raycast/api@latest pull-contributions` first.
3. `npm run check && npm run publish` → new PR.

Never rename command `name`s (breaks users' hotkeys).

## Marketing after approval

- Store page: https://www.raycast.com/matt_herwig/jumper (verify after merge).
- Post pitch (see `docs/RESEARCH.md` → Pitch) to: r/raycastapp, r/macapps, Raycast Slack #extensions, Show HN (optional), X with a short screen recording.
- Answer existing "switch to previous app mac" threads (links in RESEARCH.md) where on-topic.
