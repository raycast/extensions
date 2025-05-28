![](/media/diff-view-demo.gif)

# Diff View

Diff View command compares the last two entries of your clipboard in **VS Code** or **Cursor**. This is especially useful when you you want to compare something without being in a code editor, but still want to leverage the powerful diff capabilities of these editors.

# Requirements

- This extension requires either [Visual Studio Code](https://code.visualstudio.com/) or [Cursor](https://cursor.so/) to be installed on your system.
- Additionally, make sure that `code`/`cursor` is available in your system's PATH (test this by entering `code` or `cursor` in your terminal and this should open the respective application).

# Details

This extension makes use of VS Code’s CLI to open the diff view. The command used is `code --diff` or `cursor --diff`, which compares two given files. Details: https://code.visualstudio.com/docs/configure/command-line#_core-cli-options

![](/media/diff-view-command.png) ![](/media/diff-view-preferences.png)
