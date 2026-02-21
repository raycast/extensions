# Release Checklist

Use this checklist before publishing a new version of the Velja Raycast extension.

## 1. Code Quality

- [ ] `npm ci`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm run test`
- [ ] Confirm AI tool schemas compile in build output

## 2. Runtime Validation (macOS + Velja installed)

- [ ] Validate browser management commands (get/set default + alternative)
- [ ] Validate rules CRUD flows in command UI
- [ ] Validate AI Extension read queries (`@velja-raycast` domain/rule questions)
- [ ] Validate AI Extension write flow confirmation (`create-velja-rule`)
- [ ] Validate URL actions (open URL, open in browser, remove tracking params)

## 3. Security & Repository Hygiene

- [ ] `SECURITY.md` is present and up to date
- [ ] Dependabot config exists (`.github/dependabot.yml`)
- [ ] Branch protection on `main` is enabled:
  - [ ] PR required
  - [ ] ≥1 approving review
  - [ ] stale approvals dismissed on new commits
  - [ ] required status checks enabled (`quality-gates`)
  - [ ] force pushes disabled
  - [ ] branch deletion disabled

## 4. Documentation

- [ ] README reflects current feature set
- [ ] `docs/ai-extension-usage.md` examples are current
- [ ] `docs/architecture.md` and `docs/velja-integration.md` still match implementation

## 5. Publish

- [ ] Merge changes to `main` (after CI green)
- [ ] Pull latest `main`
- [ ] Run final sanity checks locally
- [ ] Publish manually:

```bash
npm run publish
```

- [ ] Verify Store metadata/screenshots and post-publish command behavior

## 6. Rollback Plan

- [ ] Keep previous release tag/commit SHA noted
- [ ] If a regression is found, revert on `main` and republish
