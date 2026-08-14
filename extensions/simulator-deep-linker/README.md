# SimulatorDeepLinker for Raycast

Add and search saved deep links, switch environments, copy resolved URLs, and open links on iOS or Android targets.

The extension automatically reads the active SimulatorDeepLinker storage and opens links directly with `xcrun` or `adb`. A separate CLI installation and manual JSON selection are not required.

## Setup

1. Open SimulatorDeepLinker once so it can publish its integration settings.
2. Run `npm install && npm run dev` in this extension directory.
3. Run **Add Deep Link** to save a link, or **Search Deep Links** to find and open one.

The add form writes directly to the same shared JSON storage as the macOS app. It accepts a title, URL or template, group, comma-separated tags, and a favorite flag. Environment selection remains part of opening a link, so it is not stored on individual links.

To remove one saved link, open its action menu in **Search Deep Links**, choose **Delete Deep Link**, and confirm the destructive action.

The default target is the booted iOS Simulator. Platform, target, bundle identifier, Android package, and an optional storage override remain available in Raycast preferences.

For Store validation, run `npm run build`. For publication, run `npm run publish` and authenticate with the Raycast account matching the `author` field in `package.json`.
