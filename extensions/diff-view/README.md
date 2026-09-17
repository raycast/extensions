# Diff View

![](/extensions/diff-view/media/diff-view-demo.gif)

Diff View compares the last two entries of your clipboard in **VS Code**, **Cursor**, or **VSCodium**. This is especially useful when you want to compare something without being in a code editor, but still want to leverage the powerful diff capabilities of these apps.

The extension provides two commands:

- **Show Diff View** — compares the last two entries of your clipboard in your preferred editor (set in the command's preferences).
- **Open with Editor** — compares the two files currently selected in Finder in your preferred editor.

## Requirements

- This extension requires [Visual Studio Code](https://code.visualstudio.com/), [Cursor](https://cursor.so/), or [VSCodium](https://vscodium.com/) to be installed on your system.
- No extra setup is needed: the extension automatically locates the editor's CLI inside the app bundle (`Visual Studio Code.app`/`Cursor.app`/`VSCodium.app` in `/Applications` or `~/Applications`), so you do **not** have to run "Install 'code' command in PATH" or install via Homebrew. If your editor is installed in a non-standard location, the extension falls back to the `code`/`cursor`/`codium` command on your `PATH` (test this by entering `code`, `cursor`, or `codium` in your terminal — it should open the respective application).

![](/extensions/diff-view/media/diff-view-command.png) ![](/extensions/diff-view/media/diff-view-preferences.png)

**Credits**

As a former Alfred user, the inspiration for this extension comes from Aung Moe: https://alfred.app/workflows/logicxd/vscodediff/
