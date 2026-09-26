# Raycast Store Submission Checklist

Reviewed against Raycast's preparation, publishing, extension-guideline, manifest, AI-tool, security, and best-practice documentation on 2026-09-14.

## Ready

- [x] Manifest declares macOS support, MIT licensing, Store categories, and password preferences for both EcoFlow credentials.
- [x] Raycast's online manifest validation accepts `Olli0103` as the author.
- [x] Commands use concise, title-case names and US English.
- [x] The extension uses EcoFlow's signed HTTPS Developer Platform API and does not scrape the website.
- [x] Credential values are never hardcoded, logged, or returned by AI tools.
- [x] Expected network, authentication, quota, validation, and offline failures have user-facing states.
- [x] Remote views provide loading and empty states.
- [x] Physical-device controls use explicit confirmation in both the command UI and the AI tool.
- [x] Unknown hardware remains read-only instead of receiving guessed commands.
- [x] The extension has no analytics or external tracking.
- [x] `assets/extension-icon-v2.png` is a non-default 512 x 512 PNG that works in light and dark appearances.
- [x] README documents installation, credentials, privacy, device coverage, control limits, and AI behavior.
- [x] MIT license and Store-format changelog are present.
- [x] Four Store screenshots cover AI, the device dashboard, device details, and control selection.
- [x] All screenshots are 2000 x 1250 PNGs with a consistent background. The three command UI captures use fictitious demo devices; the AI capture contains no credentials or serial numbers.
- [x] `npm run check` covers formatting, type checking, tests, Raycast linting, and a production build.
- [x] `npm run publish` uses Raycast's documented publishing command.

## Before Submission

- [ ] `needs_evidence`: Obtain EcoFlow's written permission for public use of the EcoFlow name and confirm that the Developer Platform terms permit distribution of this community extension. EcoFlow's public website terms state that its marks must not be used without prior written permission, while the public API introduction only establishes access to a developer's own devices.
- [x] A 2026-09-14 GitHub code and all-state pull-request search found no existing EcoFlow extension in `raycast/extensions`. Recheck immediately before submission.
- [ ] Update `@raycast/api` from 2.3.1 to the newest version once the local package-age safeguard permits the 2026-09-14 release.
- [ ] Replace `{PR_MERGE_DATE}` in `CHANGELOG.md` only if the Raycast publishing workflow does not fill it.
- [x] `npm ci && npm run check` passes from a clean temporary checkout with online Raycast manifest validation.
- [ ] Submit with `npm run publish`, inspect the generated public pull request, and then request Store review.

## Reviewer Notes

- Monitoring covers every family in the current EcoFlow public API navigation. Unknown or newly introduced hardware falls back to raw, read-only readings.
- Controls are enabled only for device and serial families with implemented public payloads.
- Smart Home Panel 2 is read-only because EcoFlow currently marks its HTTP control documentation as coming soon.
- TypeScript 6.0.3 is intentional because it is inside the current `<6.1.0` peer range of `@raycast/eslint-config`.

## Official References

- [Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store)
- [Publish an Extension](https://developers.raycast.com/basics/publish-an-extension)
- [Extension Guidelines](https://manual.raycast.com/extensions-guidelines)
- [Manifest](https://developers.raycast.com/information/manifest)
- [Best Practices](https://developers.raycast.com/information/best-practices)
- [Security](https://developers.raycast.com/information/security)
- [Create an AI Extension](https://developers.raycast.com/ai/create-an-ai-extension)
- [EcoFlow Developer API](https://developer-eu.ecoflow.com/us/document/introduction)
- [EcoFlow Website Terms of Use](https://account.ecoflow.com/agreement/en-us/TermsOfUse.html)
