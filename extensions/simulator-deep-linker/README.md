# SimulatorDeepLinker for Raycast

Search saved deep links, switch environments, copy resolved URLs, and open links on iOS or Android targets.

The extension automatically reads the active SimulatorDeepLinker storage and opens links directly with `xcrun` or `adb`. A separate CLI installation and manual JSON selection are not required.

## Setup

1. Open SimulatorDeepLinker once so it can publish its integration settings.
2. Run `npm install && npm run dev` in this extension directory.
3. Search for **Search Deep Links** in Raycast.

The default target is the booted iOS Simulator. Platform, target, bundle identifier, Android package, and an optional storage override remain available in Raycast preferences.

For Store validation, run `npm run build`. For publication, run `npm run publish` and authenticate with the Raycast account matching the `author` field in `package.json`.
