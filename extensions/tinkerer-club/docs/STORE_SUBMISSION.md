# Raycast Store Submission Checklist

Reviewed against the current Raycast preparation, publishing, extension-guideline, manifest, AI-tool, and best-practice documentation on 2026-09-11.

## Ready

- [x] Manifest uses the current compatible Raycast API and declares macOS support.
- [x] Extension and commands use concise, title-case names and US English.
- [x] API credentials use a required password preference and are never hardcoded.
- [x] Remote API origins require HTTPS; localhost HTTP is limited to development.
- [x] Expected network and validation failures use toasts, with loading states in remote views.
- [x] Comments, replies, reactions, posts, and generic mutations require confirmation.
- [x] Root views let Raycast provide the navigation title.
- [x] Empty views appear only after loading completes.
- [x] The extension has no analytics or tracking.
- [x] `assets/tinkerer-club-icon.png` is a non-default 512 x 512 PNG.
- [x] README documents installation, credentials, privacy, AI behavior, and verification.
- [x] MIT license and Store-format changelog are present.
- [x] `npm run check` covers type checking, tests, Raycast linting, and production build.
- [x] `npm run publish` uses Raycast's documented publishing command.

## Before Submission

- [ ] `needs_evidence`: Confirm that the platform owner permits a public third-party extension to use the Tinkerer Club name, icon, and authenticated API. Keep the “unofficial” disclaimer unless endorsement is documented.
- [ ] `needs_evidence`: Confirm the platform's API terms permit public distribution and these read/write workflows.
- [x] Five Store screenshots cover Feed, Articles, Prompts, AI search, and the menu-bar view.
- [x] All metadata screenshots are 2000 x 1250 PNGs with a consistent background and pass `ray lint` metadata validation.
- [x] Member names, handles, and avatars are redacted in the Store screenshots. No API keys or unrelated application windows are visible.
- [ ] Replace `{PR_MERGE_DATE}` in `CHANGELOG.md` only if the Raycast publishing workflow does not fill it.
- [ ] Run `npm ci && npm run check` from a clean checkout.
- [ ] Submit with `npm run publish`; review the generated public PR before requesting Store review.

## Reviewer Notes

- The extension uses the platform's documented API, not browser scraping.
- The API browser is disabled by default and confirms every mutation.
- Tool confirmations run before the two AI mutation tools.
- TypeScript 6.0.3 is intentional: TypeScript 7.0.2 is newer, but it is outside the `<6.1.0` peer range of the current `@raycast/eslint-config` toolchain and fails Raycast linting.

## Official References

- [Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store)
- [Publish an Extension](https://developers.raycast.com/basics/publish-an-extension)
- [Extension Guidelines](https://manual.raycast.com/extensions-guidelines)
- [Manifest](https://developers.raycast.com/information/manifest)
- [Best Practices](https://developers.raycast.com/information/best-practices)
- [Create an AI Extension](https://developers.raycast.com/ai/create-an-ai-extension)
- [AI Tool Confirmations](https://developers.raycast.com/api-reference/tool)
