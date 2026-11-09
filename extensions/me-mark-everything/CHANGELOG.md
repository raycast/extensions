# Changelog

## [Color Collection Icons] - {PR_MERGE_DATE}

- Add 32 offline Twemoji collection icons, preserve their colors, and include CC BY 4.0 attribution.

## [Bundled Collection Icons] - {PR_MERGE_DATE}

- Show ME collection icons from bundled, licensed SVG assets in search and bookmark forms.
- Keep monochrome collection icons readable in light and dark appearances.

## [Public ME Setup and Command Icons] - {PR_MERGE_DATE}

- Link the public ME installation guide and releases from setup and error actions.
- Use the supplied light and dark ME icons for both commands.

## [Mark Everything Branding] - {PR_MERGE_DATE}

- Use the Mark Everything name and dedicated light and dark icons.
- Describe saving bookmark details and clarify the per-submission batch limit in the usage guide.
- Publish the companion source with explicit upstream reuse boundaries, license notices and an issue tracker.

## [Store Review Preparation] - {PR_MERGE_DATE}

- Keep the root command title stable and display library status in the result list.
- Use consistent action icons, submenu labels, field hints and English instructions.
- Clarify favicon providers and the supported Node.js build version.
- Exclude local maintenance and acceptance files from Store source.

## [0.8.2] - 2026-11-07

- Clear native URL/title values when an empty new row reuses a removed row’s numbered field IDs. Preserve the remaining URL/title pairs.
- Verify batch saves, unavailable options, delayed prefill and command reentry in native Raycast using an isolated ME library.

## [0.8.1] - 2026-11-07

- Keep the existing-bookmark action available when a duplicate first appears during submission.
- Preserve selected collection and tags when their controls become unavailable; reject unavailable selections before preparing a write.
- Keep deliberately cleared URL/title fields empty when browser capture finishes later.

## [0.8.0] - 2026-11-07

- Save up to ten separate URLs per submission with independent titles and shared note, collection and tags. Keep duplicate errors and inputs in the form.
- Preserve URL punctuation, reject duplicates within a batch and fix encoded query comparisons and raw URL lookup coverage.
- Reject invalid explicit ME configurations; remove the independent helper executable override.
- Retain and mark previous results only for failed refreshes of the same query. Scope collection selection to the library and cancel outdated option reads.
- Recover the exact pending command without a stale-edit dead end, with confirmation before a not-found retry. Preserve committed-state and readback protections.
- Remove obsolete submission/prefill paths and the bookmark/editor/duplicate-view import cycle.
- Include the ME protocol snapshot and upstream MIT notice; enable ESLint and Prettier and document privacy and installation requirements.

