# Simulator Deep Linker

> This extension requires the [free, open-source Simulator Deep Linker macOS app](https://github.com/StefanBoblic/SimulatorDeepLinker). Install it with Homebrew or download it from [GitHub Releases](https://github.com/StefanBoblic/SimulatorDeepLinker/releases/latest).

Search your saved deep-link library from Raycast, switch environments, copy resolved URLs, and open links on iOS or Android developer devices.

## Before You Start

1. Install Simulator Deep Linker:
   - Homebrew: `brew tap StefanBoblic/tap && brew install --cask simulator-deep-linker`
   - Or download the latest free release from [GitHub Releases](https://github.com/StefanBoblic/SimulatorDeepLinker/releases/latest).
2. Open the macOS app once. It creates the shared storage and publishes its location for the extension.
3. For Apple targets, install Xcode. For Android targets, install Android Platform Tools and make sure `adb` can see the device.

## Using the Extension

- **Add Deep Link** saves a title, URL or template, group, tags, and favorite status to the same local library as the macOS app.
- **Search Deep Links** searches that library by title, URL, group, or tag. Use the environment dropdown to resolve `{{KEY}}` and `${KEY}` variables.
- Open the action panel and choose **Select Target Device** to switch between booted iOS Simulators or connected Android devices without leaving the command.
- Use **Delete Deep Link** to remove a saved entry, or copy either its resolved URL or original template.

Development and Production environments start without variables. Configure every placeholder used by a template in the macOS app under **Settings → Environments**. The extension warns instead of opening a URL when the selected environment leaves placeholders unresolved.

The extension detects the app's active storage automatically. If you deliberately keep a compatible `deeplinks.json` elsewhere, select it with **Storage Override** in the extension preferences.

Unlike the Xcode extension's **Open URL in Simulator** and the Adb extension's **Open Url**, Simulator Deep Linker keeps a searchable, shared library with groups, tags, favorites, and reusable environments.
