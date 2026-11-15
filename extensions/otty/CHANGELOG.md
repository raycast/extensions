# Otty Changelog

## [Otty 1.6.5: Saved Recipes, Settings, and Theme Previews] - {PR_MERGE_DATE}

- The extension now needs Otty 1.6.5 or later. With an older Otty, Otty Settings and Open Otty Recipe say "Update Otty" instead of failing.
- Open Otty Recipe lists the recipes you've saved in Otty (⌘S), with no folder to set up. Open Saved Recipes directly in Otty to restore windows, tabs, and run commands. With no recipes yet, Open Starter Recipe opens one tab split in two, ready to save as your own.
- Otty Settings uses the names, groups, order and icons from Otty's own Settings window. Pick a pane to see all its settings, or Customized for the ones you've changed. Fixed-choice settings get a picker, numbers are range-checked, and text settings keep their spaces.
- Change Otty Theme shows a preview for every built-in theme. Colors set in your Otty config take priority over every theme, so when you pick a theme, it asks before resetting any it finds. Otty Settings' Theme and Dark Theme rows ask too.
- SSH opens in a new Otty tab.

## [Clearer Loading State and Fixes] - 2026-11-10

- Search Otty Tabs now says it is loading on first open, and when Otty doesn't answer it shows "Waiting for Otty" and keeps checking every few seconds instead of reading as a dead end.
- Untitled tabs and windows in Search Otty Tabs and the Otty Agents menu bar are now named by their folder, as in Otty's own sidebar, instead of showing blank.
- Jump to Directory's Most Visited list now favors folders you've visited lately, so a folder that was busy months ago no longer stays on top.
- New Tab, New Window, Open in Otty, and the other commands that open something in Otty now bring Otty to the front.
- Otty Settings shows a swatch beside color values.

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
