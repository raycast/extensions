# Raycast Store Readiness Implementation Plan

> **For agentic workers:** Use subagent-driven implementation with separate UI copy, browser messages, and release metadata responsibilities. Parent verifies integration and captures native screenshots.

**Goal:** Submit Blazwitcher to the official Raycast Store review under julian0197 with English controls, real Store screenshots, and refreshed bilingual demos. The user has authorized the official submission; current delivery status is pending submission. Store publication remains dependent on the official review and merge.

**Architecture:** Keep current search, data access, preferences keys, keyboard bindings, and privacy boundaries. Translate user-facing text directly; keep Chinese page titles and Pinyin search fixtures unchanged. Use the official Raycast CLI and Window Capture rather than adding a localization layer or screenshot compositor.

**Tech Stack:** TypeScript, React, Raycast API 2.8.0, npm, existing Node test runner.

---

## Task 1: English interface

Files: src/components/_.tsx, src/components/preview-markdown.ts, src/actions.ts, src/types.ts, src/shortcuts.ts, src/search/result-sections.ts, src/hooks/_.ts; existing corresponding tests.

- [x] Translate controls, sections, actions, tooltips and errors to US English; retain identifiers and browser metadata.
- [x] Use `sourceNames = { tab: "Tab", bookmark: "Bookmark", history: "History" }`; use `All Sources`, `Open Tabs`, `Top Suggestions` consistently.
- [x] Remove the root List navigationTitle prop; keep native command navigation.
- [x] Update existing copy assertions without adding mirror tests for string-only changes.

## Task 2: Browser errors

Files: src/browser/*.ts; tests/browser.test.ts, tests/page-content.test.ts and existing affected service/loading tests.

- [x] Translate surfaced browser, preview, SQLite and service errors; keep Chrome/JXA machine error tokens and logic unchanged.
- [x] Preserve stale-result protection and captured Chrome targets.
- [x] Use en-US for extension-generated dates, leaving page text unchanged.

## Task 3: Release metadata and documentation

Files: package.json, package-lock.json, CHANGELOG.md, AGENTS.md, README.md, README.zh-CN.md, CONTRIBUTING.md, THIRD_PARTY_NOTICES.md; docs/store-submission.md.

- [x] Set author to `julian0197`; preserve original source and asset attribution.
- [x] Use `Blazwitcher`, `Search Browser`, and categories `["Productivity", "Web"]`.
- [x] Update @raycast/api from 2.5.2 to verified current 2.8.0 using the public npm registry; synchronize lockfile.
- [x] Add `"publish": "npx @raycast/api@latest publish"`, npm-publication guard, and official Raycast lint without discarding existing checks.
- [x] Add `## [Initial Version] - {PR_MERGE_DATE}` in CHANGELOG.md.
- [x] Update bilingual user instructions for English controls; fix text-search-engine notice to 1.6.0 and history default to 1000.
- [x] Describe Store images in metadata/, author account, submission commands and future contribution synchronization. Do not invent a live Store URL.
- [x] Update AGENTS.md so UI copy uses US English while contributor discussion/docs can remain Chinese.

## Task 4: Native Store screenshots

Files: metadata/blazwitcher-raycast-1.png, metadata/blazwitcher-raycast-2.png, metadata/blazwitcher-raycast-3.png.

- [x] Launch the new developer command and verify it is the English julian0197 extension.
- [x] Prepare raycast-blaz with 15 public tabs in 6 groups, including Chinese AI documents, English Agent / Skills projects, bookmarks and history.
- [x] Record six demos in the English interface: Pinyin search, English project-keyword search, domain search, source filters, page-body preview and search preferences. Verify `/t skills` has 3 results and `/t skills openai` has 2, with openai/skills first.
- [x] Capture `/t sxw` with 4 results using native Capture Window and Save to Metadata; verify the first PNG is 2000x1250.
- [x] Finish the English Skills and expanded page-preview Store screenshots with the same lake background.
- [x] Export and inspect all six GIF/MP4 demos, then update the recording manifest with current evidence; all 12 files decode successfully and match the reviewed exports.
- [x] Use native Window Capture, Save to Metadata, consistent background and theme. Verify all three real PNGs are 2000x1250 and contain no other applications or private data.

## Task 5: Verification and delivery

- [x] Run Node 22.22.2 typecheck and 127 tests; pass official Raycast lint, ESLint, Prettier and build after formatting the plan.
- [x] Verify real Pinyin/English search, source changes and page preview in Raycast.
- [x] Record History Result Count changing from 10 to 5 and back to 10; confirm the restored setting. This recording does not recheck the result count after reopening the command.
- [x] Remove the older open-actions clip from the current README and gallery. Existing-tab and new-tab actions have earlier-version verification only; no fresh Enter/Command-Enter acceptance is claimed for this round, and rerecording this optional demo is not a submission blocker.
- [ ] Check English UI literals, links, manifests, public registry lock URLs, screenshots and staged scope.
- [x] Commit and push the English interface and release configuration; create and attach preparation PR #18 to cjinhuo/blazwitcher-raycast.
- [ ] Commit the refreshed media and docs, push codex/store-ready, and update PR #18 with final verification.
- [ ] Sync a clean publishing checkout to the final commit and verify that no local diagnostics or credentials will be copied.
- [ ] Run interactive `npm run publish`, complete the official GitHub authorization flow, inspect the generated raycast/extensions draft PR, and mark it Ready for review.
- [ ] Attach and verify the official PR URL, head commit, changed files and review state. Report submitted for review; only the official merge establishes Store publication.
