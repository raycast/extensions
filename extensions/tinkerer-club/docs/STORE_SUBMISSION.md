# Raycast Store Submission Checklist

Reviewed against the current Raycast preparation, publishing, extension-guideline, manifest, AI-tool, and best-practice documentation on 2026-09-11.

## Ready

- [x] Manifest uses the current compatible Raycast API and declares macOS support.
- [x] Extension and commands use concise, title-case names and US English.
- [x] API credentials use a password preference and are never hardcoded. The key may be omitted only for local screenshot demo mode; live requests fail clearly without it.
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

- [x] The extension author confirms Kitze granted permission for a public third-party extension to use the Tinkerer Club name, icon, and authenticated API. The “unofficial” disclaimer remains because endorsement was not stated.
- [x] The extension author confirms that Kitze's permission covers public Raycast Store distribution of the extension's read/write workflows.
- [x] Three Store screenshots cover Feed, Articles, and Prompts with fictional local demo content.
- [x] All metadata screenshots are 2000 x 1250 PNGs with a consistent background and pass `ray lint` metadata validation.
- [x] Store screenshots use fictional names, handles, posts, and prompt content with generated demo avatars. No real member content or API keys are visible.
- [ ] Replace `{PR_MERGE_DATE}` in `CHANGELOG.md` only if the Raycast publishing workflow does not fill it.
- [x] Run `npm ci && npm run check` from an isolated PR-branch checkout (2026-09-28).
- [x] The public Store submission is [PR #31009](https://github.com/raycast/extensions/pull/31009).

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
