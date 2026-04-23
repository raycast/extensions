# Raycast Store Submission

## Current Publish State

- Product name: `Tryambakam Noesis`
- Backend positioning: powered by the `Selemene Engine`
- Raycast author: `mage_narayan`
- GitHub repo: `https://github.com/Sheshiyer/noesis`
- Local branch: `main`
- Runtime platform: `macOS`

## Screenshot Placement

Raycast Store screenshots belong in the top-level `metadata/` directory. The official capture flow can place them there automatically when Window Capture is configured and `Save to Metadata` is enabled.

Current generated metadata set:

- `metadata/dashboard-command-center.png` (`2000x1250`)
- `metadata/engine-console-biorhythm.png` (`2000x1250`)
- `metadata/profile-defaults.png` (`2000x1250`)

Use these filenames when the captures are ready:

- `metadata/dashboard-command-center.png`
- `metadata/engine-console-biorhythm.png`
- `metadata/reading-result-report.png`
- `metadata/pulse-menu-bar.png`
- `metadata/profile-defaults.png`
- `metadata/reading-archive.png`

## Draft Captures

The current manually saved screenshots were moved out of `assets/` and into `docs/screenshots-drafts/` so they do not get bundled as runtime assets:

- `docs/screenshots-drafts/dashboard-command-center.png` (`750x474`)
- `docs/screenshots-drafts/api-key-command.png` (`862x586`)
- `docs/screenshots-drafts/dashboard-profile-defaults.png` (`862x586`)
- `docs/screenshots-drafts/engine-console-biorhythm.png` (`862x586`)
- `docs/screenshots-drafts/workflow-studio-birth-blueprint.png` (`862x586`)
- `docs/screenshots-drafts/dashboard-selemene-engine-link.png` (`862x586`)
- `docs/screenshots-drafts/raycast-command-search.png` (`862x586`)

These are useful for visual review, but they should be regenerated with Raycast Window Capture before Store publish because they do not match the official `2000x1250` metadata size.

The drafts also show real profile context. Use safe demo profile values before committing final metadata screenshots.

The current `metadata/` files were generated from the safe drafts via `scripts/generate-metadata-screenshots.sh` so the repo now has a consistent `16:10` reviewable set while the remaining optional scenes can be captured later.

## Screenshot Requirements

- Use PNG.
- Use 2000 x 1250 pixels.
- Use a 16:10 landscape frame.
- Add at least 3 screenshots before public publish.
- Use one consistent background across captures.
- Keep screenshots focused on the Raycast extension, not other apps.
- Remove or mask sensitive data, API keys, private names, emails, and exact birth data before committing screenshots.

## Recommended Capture Set

- Dashboard command center: show the launchpad, status, active engines, and current pulse surfaces.
- API key rotation: show the `API Key` command with a safe dummy key ready to replace the stored key.
- Engine console run: show an engine execution form with safe demo profile values and position it as a Selemene Engine lens.
- Reading result report: show the interpreted result page instead of raw JSON.
- Pulse menu bar: show the concise current insight dropdown.
- Profile defaults: show reusable profile preferences with non-sensitive demo values.

## Dummy Profile Flow

Use the `API Key` command before screenshots:

1. Paste the dummy Selemene Engine API key.
2. Run `Validate and Replace Key`.
3. Confirm the dashboard shows the dummy profile before capturing.

Replacing a key clears the old local snapshot first. That prevents a stale real profile from appearing while the dummy account warms.

## Publish Gate

Do not run `npm run publish` until the screenshot metadata exists and has been reviewed for public-safe content.
