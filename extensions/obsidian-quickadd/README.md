# Obsidian QuickAdd

Run your [QuickAdd](https://github.com/chhoumann/quickadd) choices from Raycast and answer everything they ask without leaving what you're doing. An unofficial companion to QuickAdd, the Obsidian plugin by Christian B. B. Houmann.

- **Everything QuickAdd asks, answered in Raycast:** text, one-page forms, dropdowns, file and tag pickers, multi-selects, checkboxes, dates and times, confirmations. The extension drives QuickAdd's own interactive mode, so choices behave exactly as they do in Obsidian.
- **`[[` links and `#` tags** in any text field, from Obsidian's own index.
- **A hotkey for any choice:** select it, press `⌘⇧Q` to create a quicklink, then give the quicklink an alias or hotkey.
- Captures run with Obsidian in the background; choices set to open their note bring Obsidian forward.

## Setup

1. Install the [QuickAdd](https://github.com/chhoumann/quickadd) plugin (2.27 or later) in your vault.
2. For full support, use Obsidian 1.12 or later and turn on **Settings → General → Advanced → Command line interface**, then restart Obsidian.

The vault is found automatically when only one vault has QuickAdd. Otherwise pick it from the list, or set **Vault Folder** in the extension preferences.

Without the command-line interface the extension runs in **basic mode**. It asks for `{{VALUE}}` fields in Raycast and sends them through QuickAdd's `obsidian://quickadd` link, and anything else is asked in Obsidian. The choice list says when basic mode is on and why.

## Limitations

- Templater's own prompts and dialogs opened by scripts appear in Obsidian. Raycast shows that it's waiting and offers **Open Obsidian**.
- `{{selected}}` and `{{linkcurrent}}` come from Obsidian's active editor.
- QuickAdd sends file-picker and field-suggest inputs without their options, so they are plain text fields.
- In basic mode, `[[` suggests notes only and `#` has no suggestions.
