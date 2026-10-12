# Visual Studio Code

Control VS Code and compatible editors from Raycast. Choose the editor in the extension's **Build** preference.

## IDE and Agents windows

- **Open IDE** opens the editor instead of the Agents window in Cursor and VS Code.
- **Open Agents Window** opens Agents in Cursor, VS Code, and VS Code Insiders. Antigravity IDE opens its separate Agents app; other builds retain their regular app-launch behavior.
- On macOS, these commands focus and unminimize an existing target window, or create one if it is missing. If the application is quit, they request the correct view without waiting for startup.
- On Windows, these commands request the appropriate view through the editor executable; existing-window selection is handled by the editor.

On macOS, enable **Raycast** in **System Settings > Privacy & Security > Accessibility** to focus existing windows. If the editor is still starting or not responding, retry once it is ready. No extra window is requested when Accessibility inspection fails.

Window selection uses the editor's window titles. Customized or localized titles may need additional matching support. Other compatible builds use their normal editor launch arguments.

## Development

Install dependencies with `npm install`, then run `npx ray build` and `npx ray lint`.

The macOS focus helper is checked in as a universal arm64/x86_64 executable at `assets/open-editor-helper`, with its Swift source at `scripts/open-editor-helper.swift`. Normal builds use this binary and do not require Swift tooling. After changing the Swift source, run `npm run build:native` on macOS with Xcode Command Line Tools installed, and include both source and rebuilt binary in the change.

The helper queries AppKit and Accessibility directly, with bounded messaging timeouts, instead of relying on System Events or startup-menu polling.
