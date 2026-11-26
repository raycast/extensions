# App Link Check

Fetch a domain's `apple-app-site-association` (iOS Universal Links) and `assetlinks.json` (Android App Links) files and check what they list.

No account or token is needed. The extension sends public HTTPS GET requests to the domain you enter, and to nothing else. There is no analytics and no third-party service. Results are kept in Raycast's local cache for the command, and the optional defaults are saved as Raycast preferences.

## Use

Run **Check App Links** and pass a domain, or set a default domain in preferences. Optionally set:

- **iOS App ID** (`TEAMID.bundle.id`): the check then requires it in the AASA file.
- **Android Package**: the check then requires it, with a SHA-256 signing fingerprint, in `assetlinks.json`.

## What each check means

- **apple-app-site-association**: fetched from `https://<domain>/.well-known/apple-app-site-association` with no redirects (Apple's documented requirement: https://developer.apple.com/documentation/xcode/supporting-associated-domains). Must be valid JSON and list app IDs under `applinks.details`.
- **assetlinks.json**: fetched from `https://<domain>/.well-known/assetlinks.json` with no redirects and expected as `application/json` (https://developer.android.com/training/app-links/configure-assetlinks). Looks for `android_app` statements with `delegate_permission/common.handle_all_urls` and SHA-256 colon-hex fingerprints.

A passing result means the file lists what you set. It does not prove that links open the app on a device.
