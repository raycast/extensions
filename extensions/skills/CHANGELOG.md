# Changelog

## [Improve macOS `npx` Path Resolution] - 2026-03-20

- Run the Skills CLI without spawning a login shell by building an explicit PATH for Homebrew and common Node.js version-manager installs
- Add a custom `npx` path preference for non-standard setups
- Show clearer recovery guidance for `npx` and Skills CLI failures, including a shortcut to open Extension Preference

## [Fix Incomplete Agent List] - 2026-03-17

- Use `skills list --json` for structured output instead of parsing ANSI text
- Show all supported agents in the filter dropdown and detail panel

## [Highlight Outdated Skills] - 2026-03-16

- Highlight outdated skills with an orange hammer icon in the installed skills list
- Show "Updates Available" section with count when updates exist

## [Fix Duplicate Audit Error Toast] - 2026-03-11

- Fix error toast showing twice when re-selecting a skill with a failed audit fetch

## [Security Audits Data] - 2026-03-11

- Parse security audit data from skills.sh and show their status in the skill's details
- Warn before installing skills with failed security audits
- Added actions to open the security audit links

## [Fix allowed-tools TypeError] - 2026-03-09

- Fix crash when SKILL.md contains single-value allowed-tools (e.g., `allowed-tools: Bash`)
- Normalize allowed-tools to array before rendering

## [Rich Skill Metadata] - 2026-03-07

- Display description, license, compatibility, and allowed tools from SKILL.md frontmatter in the detail panel
- Show GitHub star count alongside install count
- Show skill description as list item subtitle when the detail panel is hidden

## [Update Skills] - 2026-03-01

- Check for available skill updates on launch
- Show "Update available" badge on skills with updates
- "Updates Available" summary section with update count
- "Update All Skills" action (Cmd+Shift+U)

## [Inline Detail Panel] - 2026-02-26

- Replace push-to-detail views with inline detail panels across all commands
- Toggle detail panel visibility with Cmd+D
- Lazy-load skill content only for the selected item

## [Install & Remove Skills] - 2026-02-17

- Install skills directly from search and trending commands
- New "Manage Skills" command to view and remove installed skills
- Agent filter dropdown to browse skills by agent

## [Fix Skill Details] - 2026-02-11

- Load SKILL.md files first, fallback to README.md
- Add automatic caching with useCachedPromise
- Improve loading performance with parallel fetch requests
- Fix screen flickering when loading skill details

## [Fix Screenshots] - 2026-02-11

- Move screenshots to assets folder and update README references

## [Initial Version] - 2026-02-11

- Search skills with real-time debounced search
- Trending skills ranked by total installs
- Filter skills by owner/organization
- View skill details
- Copy install commands to clipboard
- Open skill repository on GitHub
- Open skill page on skills.sh
