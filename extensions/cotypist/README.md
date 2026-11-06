# Cotypist for Raycast

Read and control Cotypist's **Enable completions by default** setting from Raycast. Each change reads the native boolean state back before reporting success.

## Commands

- **Completion Status:** View the native default-completion setting, selected model, and any download progress exposed by Cotypist.
- **Enable Default Completions:** Enable the default setting. Running it again leaves an already enabled setting unchanged.
- **Disable Default Completions:** Disable the default setting, including Cotypist's own confirmation dialog.
- **Toggle Default Completions:** Invert the verified native default setting.

Apps with individually enabled completion settings keep those overrides. These commands do not represent the separate global-pause shortcut, submit text, or accept suggestions for you. Cotypist's documented force-completion and temporary per-app shortcuts remain available in its native Shortcuts pane.

## Setup

1. Install [Cotypist](https://cotypist.app/) and complete its setup, including the local model download.
2. Allow **Raycast** in macOS **System Settings → Privacy & Security → Accessibility** if it is not already authorized. The extension does not grant permission or enable typing recording automatically.
3. Apple's Command Line Tools must be installed because the first command compiles a small native helper from the included source. It is cached in Raycast's extension support folder.
4. Run **Completion Status**, then try the enable/disable commands. You can check the result in Cotypist's **General** settings.

The helper reuses an identified settings window or opens the [documented Shortcuts settings route](https://cotypist.app/help/shortcuts) after checking that no settings window existed. It selects the observed General pane and uses public macOS Accessibility controls. It checks the installed app and controlled process, changes only the named default-completion switch, and verifies its result. Unreadable or inconsistent window state is an error. Existing dialogs are left untouched. Restoration targets the exact previous pane or newly opened window; newer user selections are preserved, and any restoration warning is reported separately from the completion setting.

For a closed-window baseline, the helper checks Accessibility evidence against public window metadata belonging only to Cotypist. It reads numeric window identifiers, layers and bounds; it does not capture images, inspect other apps' titles, or request Screen Recording access.

This implementation targets Cotypist's English interface. App updates that alter its native controls can require an extension update; missing or ambiguous state is an error, not assumed success. It does not use private preferences, browser cookies, an invented scripting dictionary, or hard-coded keyboard macros.

## Develop

```sh
npm ci
npm test
npm run lint
npm run typecheck
npm run build
npm run dev
```

The included Swift source can be compiled independently with Apple's Swift compiler. Do not run native control tests against personal documents; use disposable text and restore the original completion setting afterwards.

