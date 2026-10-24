# Otty Changelog

## [Search Otty Tabs, Agents, Settings, Themes, and Recipes] - 2026-10-24

- Add Search Otty Tabs: browse Otty by tab, pane, or window, see which coding agents are working or need input, and press Enter to jump straight there; tabs you visit from Raycast come first.
- Preview any pane in the sidebar (⌘⇧D; ⌘⇧Y toggles the preview, ⌘⇧I the details) and send it a message through Otty's Prompt Queue.
- Add an Otty Agents menu bar command that counts agents needing input and jumps to each one.
- Add Jump to Directory: open one of Otty's most-visited folders, or a git repository found under a folder you choose, up to three levels deep (newest commits first, with owner avatar, uncommitted changes, branch, and ahead/behind), in a new tab. Pin the ones you use most (⌘.).
- Add Otty Settings: browse Otty's settings by section, with descriptions and defaults from Otty's reference where it documents them, toggle on/off options in one keypress, and pick from listed values; changes apply live.
- Add Change Otty Theme: pick light-mode and dark-mode themes from a grid of previews.
- Add Open Otty Recipe: rebuild a saved workspace from your exported `.ottyrecipe` files.
- Open in Otty now opens the folders selected in Finder as tabs and the files in Otty's viewer, and with nothing selected and Finder in front opens the front window's folder (or the Desktop).
- SSH now uses Otty's native `connect`, so ssh options like `-p 2222` and quoted or escaped paths work. Failure toasts offer Copy Error.
- Update to Raycast API 2.9 and Vitest 5, clearing all npm audit advisories.

## [Changed] - 2026-07-30

- Update the extension icon.

## [Initial Version] - 2026-07-27

- Add Open in Otty, New Window, New Tab, Open Directory, Run Command, and SSH commands.
