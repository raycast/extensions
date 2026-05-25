# Raycast Official Docs Notes

- Fetched at: 2026-05-25T16:35Z.
- Main URLs:
  - https://developers.raycast.com/information/manifest
  - https://developers.raycast.com/api-reference/menu-bar-commands
  - https://developers.raycast.com/information/lifecycle
  - https://developers.raycast.com/basics/prepare-an-extension-for-store
  - https://developers.raycast.com/api-reference
- Additional official snapshot saved locally: `audit/docs/raycast-llms-full.txt`.

## Manifest

- Required extension fields include `name`, `title`, `description`, `icon`, `author`, `platforms`, `categories`, `license`, and `commands`.
- Command `mode` supports `view`, `no-view`, and `menu-bar`.
- `interval` is allowed on `no-view` and `menu-bar` commands and accepts seconds, minutes, hours, or days. The minimum is `1m`, so this extension's three `interval: "1m"` menu-bar commands are legal.
- Preference types include `textfield`, `password`, `checkbox`, `dropdown`, `appPicker`, `file`, and `directory`.
- `required: true` causes Raycast to ask users to set the preference before continuing; this project deliberately marks provider keys `required: false`, so each command must handle missing keys itself.

## Lifecycle And API

- A `no-view` command can export an async function and use async/await directly. Raycast unloads the command after the script finishes.
- `MenuBarExtra` commands are not persistent daemon processes; Raycast loads them on demand, for background refresh, or while the menu is open.
- Menu-bar docs recommend using `Cache` or related utilities to provide quick feedback, setting `isLoading` to false when work is done, and avoiding long menu titles.
- `LocalStorage` is the Raycast storage API for data payloads. The docs describe password preferences and local storage as stored in Raycast's local encrypted database for the extension.
- `getSelectedText`, `Clipboard.readText`, `showToast`, `showHUD`, `closeMainWindow`, `launchCommand`, and `environment` are all official `@raycast/api` APIs. `showToast` can fall back to HUD if the window is closed; `showHUD` closes the main window.
- The extension does not use Raycast `AI` or `OAuth` APIs, so those namespaces were checked as non-applicable.

## Store Readiness

- Store checklist asks developers to use the Raycast account username as `author`, use `MIT`, use the latest Raycast API version, restrict `platforms` when platform-specific APIs are used, include `package-lock.json`, check third-party service terms, and run build/lint locally.
- Store icon guidance requires a 512x512 PNG and light/dark compatibility; the project has 512x512 light/dark icons.
- README is expected when setup is non-trivial. This project has a README and metadata screenshots at 2000x1250.
