# aerospace Changelog

## [Open Window Switcher Directly] - 2026-08-28

- Open Switch Apps in Workspace immediately without showing a launcher argument form
- Keep optional scope and search overrides available to integrations through `launchContext`

## [Runtime, Configuration, and UX Upgrade] - 2026-08-27

- Trigger shortcuts with AeroSpace's native `trigger-binding` command instead of AppleScript keyboard events
- Show the complete TOML file and the binding configuration loaded by the running AeroSpace process as distinct views
- Add deduplicated open apps and search keywords to the workspace picker
- Read window application paths and focused workspace state directly from AeroSpace's structured output
- Add persistent, contextual recovery actions without assuming AeroSpace lives in `/Applications`
- Add validated CLI response models, focused runtime operations, and unit tests
- Update Raycast API, utilities, linting, formatting, TypeScript, TOML, and test dependencies
- Align command metadata, root navigation behavior, loading states, error handling, and scripts with current Raycast guidance
- Add a live Focused, Visible, or All scope picker, remember its latest selection, and make window titles easier to scan
- Add safe window and workspace move, monitor, layout, fullscreen, summon, and balance actions
- Group bindings by human-readable intent while keeping every configured mode visible by default
- Name custom command bindings from their executable or script filename and positional arguments
- Add configuration health, dry-run validation, safe reload, and disk-versus-loaded binding comparison
- Keep bindings immediately visible in the menu bar and add a default-on preference for its Quick Actions and Open sections
- Keep the menu-bar title icon-only by default, with an opt-in preference for the live workspace name
- Link the menu bar to Raycast's native Version History so users can discover release changes
- Add a copy-only `on-window-detected` rule assistant that never rewrites the user's config

## [Focused Workspace First] - 2026-08-26

- Show the focused workspace first when switching apps across all workspaces

## [Maintenance] - 2026-07-28

- Eliminate 1-2s startup delay by removing `shell-env` (no longer spawns a login shell)
- Convert all commands to async — UI shows loading states instead of blocking
- Use Raycast `getApplications()` instead of shelling out to `mdfind` for app icons
- Replace `@iarna/toml` with `smol-toml` for TOML 1.1 support (aerospace config uses 1.1)
- Add extension preference to set a custom aerospace binary path
- Fix empty bindings (`[]`) showing as blank list items
- Fix shortcut execution in non-main modes (now switches mode and restores after)
- Escape shortcut keys before interpolating them into AppleScript, so bindings containing `"` or `\` no longer produce a broken script
- Show a persistent error state in the shortcuts, workspace, and config views instead of an empty view once the failure toast dismisses
- Surface a clear “AeroSpace isn’t running” message (with an Open AeroSpace toast action) instead of a raw Node `execFile` error when the CLI can’t reach the server
- Only switch to binding modes the running AeroSpace server reports, so a config that is ahead of the loaded config can no longer strand you in a mode with no bindings
- Fix workspace shortcut lookup for bindings that pass flags (e.g. `workspace --auto-back-and-forth 1`) and stop treating `workspace next`/`prev` as workspace names

## [Fix] - 2026-04-24

- Fix window switcher search to match on both app name and window title, enabling fuzzy finding by title keywords (e.g. searching "huddle" now finds Slack Huddle windows)

## [Feature] - 2026-04-22

- Add "Set to Tiling" action to window switcher (Cmd+T) — converts a floating window to tiling layout via `aerospace layout tiling`

## [Feature] - 2026-04-12

- Add "Go to Workspace" command with searchable workspace list and shortcut display

## [Feature] - 2026-03-25

- Add "Pull to Current Workspace" action to window switcher (Shift+Enter)

## [Improvement] - 2026-01-22

- Add LaunchContext support for programmatic integration
- Enable external tools to trigger app switcher without UI prompts
- Add Integration documentation to README with deeplink format

## [Improvements] - 2025-08-11

- Render config using TOML, fixing display issues with malformed config
- Add action to open the config in your editor from the Config view
- Add "View Config" screenshot to README

## [Improvements] - 2025-07-09

- Added the new `Aerospace` Icon to the extension commands

## [Features] - 2025-06-19

- Add monitor name to app switcher

## [Bug Fixes] - 2025-01-10

- Fix issue with `aerospace` not found if installed in a non-standard location (e.g. managed by `nix-darwin`)

## [Bug Fixes] - 2024-11-14

- Update shortcut description to allow for fuzzy finding without dashes

## [New Feature] - 2024-10-13

- Adds functionality to switch between apps in current workspace
- Inspired by [Yuriteixeira's Alfred workflow](https://github.com/yuriteixeira/aerospace-workflow)

## [Bug Fixes] - 2024-09-18

- Update `@iarna/toml` to `v3.0.0` which includes support for TOML 1.0.0

## [Bug Fixes] - 2024-05-27

- Fix screenshots in README

## [Bug Fixes] - 2024-05-06

- Fixed issue with `aerospace` itself not being present
- Added screenshots

## [Initial Version] - 2024-05-01

- Initial release of aerospace extension
