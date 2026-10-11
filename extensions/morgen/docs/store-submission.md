# Raycast Store submission

Source repository: https://github.com/chaosslabs/morgen-raycast (public, MIT).

## Publisher identity

Publish publicly under the verified personal Raycast account `biancarosa`. The manifest sets `author: biancarosa` and omits organization `owner` and `access` fields. The source repository and project attribution remain under chaOSSlabs on GitHub. Store acceptance remains subject to Raycast review.

## Current evidence

See [live testing](live-testing.md) for successful create/read-back and AI checks, the rate-limit failure found during screenshot capture, and remaining checks. Three reviewed 2000×1250 Store screenshots are in `metadata/`: Today (`morgen-1.png`), Search (`morgen-2.png`), and Create Event (`morgen-3.png`). Manual AI creation confirmation was verified by the maintainer; focused automated cross-timezone/DST checks passed and the confirmed timezone display bug was fixed (see the validation record).

## Before submission

- Confirm publisher identity and resolve full `npm run lint` validation.
- Check the installed Raycast API against the current release and update/test if needed.
- Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.
- Exercise all commands and AI tools against a live Morgen account, including timezone handling and creation confirmation. Verify created events in Morgen.
- Capture real screenshots using synthetic calendar data; place Store screenshots in `metadata/` and README media in `media/`. Do not publish private event details.
- Verify the icon in light and dark mode and review Morgen's service/branding terms.
- Review and commit intended changes, preserving unrelated local work.
- Run `npm run publish` interactively to submit a PR to `raycast/extensions`. Store listing follows Raycast review and acceptance.

The existing release workflow is not proof of public Store publication. Public submission requires the Raycast GitHub review process; do not rely on a release tag or API token alone.

References:

- https://developers.raycast.com/basics/prepare-an-extension-for-store
- https://developers.raycast.com/basics/publish-an-extension
- https://developers.raycast.com/information/manifest
