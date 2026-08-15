# Aside Raycast Extension — Submission Readiness

This document is the working checklist for taking the Aside extension from a functional MVP to a Raycast Store submission. Update checkboxes as work is completed and validated.

## Current status

- Core browser commands: implemented
- Raycast AI tools: implemented
- Automated lint, typecheck, 34 tests, and production build: passing on 2026-08-12
- Real Aside 1.0.813.1 capability smoke test: passing on 2026-08-12
- Store presentation, compatibility hardening, and final owner validation: in progress

## Required before submission

### Code, safety, and privacy

- [x] Update the README privacy disclosure to distinguish local commands from information supplied to Raycast AI.
- [x] Minimize AI tool output and document result limits.
- [x] Re-fetch tabs before destructive AI actions.
- [x] Resolve tab IDs against current Aside state before showing confirmation.
- [x] Show real current tab titles and URLs in destructive confirmations.
- [x] Reject stale or unknown tab IDs safely.
- [x] Add tests for destructive-action planning, stale IDs, and partial failures.
- [x] Add non-blocking Aside version or capability compatibility guidance.
- [x] Test the AI tool wrappers directly.

### Raycast metadata and documentation

- [x] Use `{PR_MERGE_DATE}` for the initial changelog entry.
- [x] Review and update `@raycast/api` to the current version.
- [x] Confirm command titles, subtitles, descriptions, categories, and author metadata.
- [x] Confirm the README's official Aside website link.
- [x] Document the locally tested Aside version range.
- [ ] Confirm the minimum supported Aside version with Aside's maintainers.
- [x] Owner approved use of the Aside app icon for this free Store extension.
- [x] Inspect the 512×512 icon for legibility on light and dark backgrounds.

### Store media

- [x] Create a top-level `metadata/` directory.
- [ ] Capture at least three 2000×1250, 16:10 PNG screenshots.
- [ ] Screenshot: Search Tabs with useful actions visible.
- [ ] Screenshot: Search Bookmarks with a polished result list.
- [ ] Screenshot: a successful `@aside` Raycast AI workflow.
- [ ] Use consistent backgrounds and remove private titles, URLs, bookmarks, and account information.

### Validation

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test`
- [x] `npm run build`
- [x] Run Raycast AI evaluations without a build error.
- [ ] Test AI tools inside Raycast, including confirmation and cancellation.
- [ ] Test Aside closed, open with no windows, and open with multiple windows.
- [x] Test normal and incognito windows through the disposable capability smoke test.
- [ ] Test duplicate tabs, stale IDs, Unicode, long titles, and long URLs.
- [ ] Test hundreds of tabs and bookmarks.
- [ ] Test Automation permission denial and recovery.
- [ ] Test a clean extension installation.
- [x] Run the disposable real-Aside AppleScript smoke test.
- [x] Verify no private Aside database dependency was introduced.

### Publishing

- [ ] Put the extension in a clean Git-backed publishing workflow.
- [ ] Review the final diff and exclude local/private artifacts.
- [ ] Run `npm run publish` from the intended GitHub/Raycast account.
- [ ] Review the generated pull request.
- [ ] Complete Raycast Store reviewer feedback.

## Official Raycast publishing instructions

Raycast's current official workflow is:

1. Read [Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store).
2. Run `npm run build` from the extension directory and resolve every error.
3. Run `npm run lint` and resolve lint or metadata issues.
4. Follow [Publish an Extension](https://developers.raycast.com/basics/publish-an-extension).
5. Run `npm run publish`. Raycast will ask for GitHub authentication and automatically open a pull request in [`raycast/extensions`](https://github.com/raycast/extensions).
6. Continue addressing review feedback on that pull request. Running `npm run publish` again pushes additional changes to the open pull request.
7. When Raycast accepts and merges the pull request, the extension is automatically published to the Store.

Raycast also documents a manual alternative: fork [`raycast/extensions`](https://github.com/raycast/extensions), add the extension to the fork, and open a pull request into its `main` branch. The Git setup decision for this project is intentionally deferred.

Relevant official references:

- [Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store)
- [Publish an Extension](https://developers.raycast.com/basics/publish-an-extension)
- [Extension Guidelines](https://manual.raycast.com/extensions-guidelines)
- [`raycast/extensions` repository](https://github.com/raycast/extensions)
- [Raycast Community](https://raycast.com/community)

## Long-term maintenance

- [x] Probe required AppleScript capabilities after Aside updates instead of relying only on a version number.
- [x] Keep the real-app smoke test current with Aside's scripting dictionary.
- [ ] Maintain coverage for stale tabs, multiple windows, partial failures, and large result sets.
- [x] Keep AI results narrow so tab titles, URLs, and bookmarks are disclosed only when needed.
- [ ] Re-run clean-install and permission testing for major Aside or Raycast updates.
- [x] Document the newest verified Aside version after compatibility testing.
- [x] Keep history and downloads out of scope until Aside exposes a stable supported API.

## Known external and dependency notes

- `npm audit --omit=dev` reports two low-severity `esbuild` advisories concerning the Windows development server. The dependency is supplied by the current `@raycast/api`; this extension is macOS-only and does not expose an esbuild development server. `npm audit fix --force` would downgrade Raycast's API, so it should not be used.
- The Raycast eval runner's extension build succeeds. All eight evaluation cases passed at 100% when run in smaller batches. The hosted evaluator can intermittently return empty AI responses while still exiting successfully; treat that as evaluator-service flakiness and re-run before submission.

## Reference-extension comparison

Chrome, Dia, and Arc currently have several maturity advantages that this project should emulate where Aside's supported API permits it:

- Complete Store screenshot metadata
- Broader multi-step AI evaluation coverage
- Version/update compatibility guidance
- Longer release histories and real-world maintenance experience
- More extensive profile, space, and history features where their browser APIs support those features

The Aside extension already has the important architectural pieces: a typed shared browser adapter, native IDs, stale-state validation, loading and empty states, deterministic AI tools, destructive confirmation, tests, and no private database reads. Unsupported profile, space, history, download, and page-content features should not be simulated or implemented through private data.

## Owner validation needed

These items cannot be truthfully completed from source code alone:

- The official Aside website URL
- The minimum Aside version the maintainers intend to support
- Approval of screenshots and all visible sample browser data
- Final Raycast/GitHub authentication and Store submission

Screenshot capture is currently waiting for macOS Screen & System Audio Recording permission for the terminal/Codex session. A disposable Aside window using public Raycast, GitHub, and Aside pages has been staged; no private browser data should be used in Store media.
