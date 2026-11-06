# Publication Plan

## Current Status

The extension is a **standalone Raycast → Obsidian raw-draft capture** tool. It has zero external CLI, Python, LLM, or API dependencies. Only a `vaultPath` preference is required.

- Source: TypeScript + React, `@raycast/api` ^2.11.0
- Tests: 16 behavioral tests (6 filesystem, 10 form) — all passing
- Build: `npm run build` passes; official `ray lint` passes (pending real author)
- License: MIT

## Store Publication Checklist

- [x] US English manifest, labels, placeholders, errors, and toasts
- [x] MIT LICENSE
- [x] CHANGELOG.md (Store version history)
- [x] README.md (public-facing, no personal paths)
- [x] help.md (preference setup guidance)
- [x] `.gitignore`
- [ ] Real Raycast username as `author` (currently placeholder `zhigeng-local`)
- [ ] `ray login` authentication
- [ ] Store screenshots (3–6 × 2000×1250 PNG)
- [ ] Git init + `npm run publish` (opens raycast/extensions PR)
- [ ] PR review and merge → automatic Store publication

## What Changed from Earlier Plans

The original PUBLICATION-PLAN.md described a version that depended on `zhigeng` CLI, `obsidian-wiki`, Python, and Feishu for task registration. That architecture has been **replaced** by the current standalone raw-capture design:

- The extension only saves raw Markdown drafts to `_raw/` inside the user's vault.
- Todo registration, knowledge extraction, and reminders are **not part of this extension**. They are handled by the user's own downstream automation.
- No CLI, Python, or external service dependencies are bundled or required.
- The `zhigeng-capture/v1` frontmatter protocol is self-documenting for consumers.

## Files Excluded from Publication

These internal development documents are kept locally but excluded from the published extension:

- `PI-BRIEF.md` — early development brief with now-replaced architecture
- `REVIEW-REQUIREMENTS.md` — internal code review notes
- `STORE-HANDOFF.md` — session handoff instructions
- `DEVELOPMENT-RESULT.md` — internal development summary
- `CAPTURE-CONTRACT.md` — captured in README/help.md

## Post-Publish

After Store publication:
- Users install from Raycast Store and configure their vault path.
- The extension appears as "Zhigeng Capture" with command "Quick Capture".
- Downstream consumers read `_raw/` files using the documented `zhigeng-capture/v1` schema.