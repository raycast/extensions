# Changelog

## [Follow Up on Maintainability] - 2026-04-03

- Add hook-level tests for `useSkillContent` and expand `skills-cli` coverage around CLI error normalization and agent id mapping
- Standardize `search` and `manage` empty/error states with shared retry handling and clearer recovery copy
- Document the maintainer validation workflow in `README.md` and add a manual smoke checklist in `TESTING.md`

## [Improve Maintainability] - 2026-04-02

- Add `vitest`-based unit tests and an opt-in live API test for the `skills` extension
- Extract search and skill content loading logic into reusable helpers for easier testing and maintenance
- Improve empty states in the search and manage flows while keeping the current upstream behavior intact

## [Remove Trending Skills Command] - 2026-03-31

- Remove the "Trending Skills" command — the skills.sh API has no trending endpoint, so the command was using a search query hack (`?q=skill`) that only returned skills with "skill" in the name, missing the majority of popular skills

## [Agent-Specific Skill Installation] - 2026-03-31

- Support installing skills to specific agents instead of all agents at once
- Show all 43 supported agents with already-installed agents marked as read-only

## [Fix `fnm` macOS Path Resolution] - 2026-03-28

- Detect additional macOS `fnm` install locations, including `~/Library/Application Support/fnm`
- Match the official `fnm` directory resolution preference order when resolving `fnm` paths.

## [Agent-Specific Skill Removal] - 2026-03-27

- Support removing skills from specific agents instead of all agents at once
- Show an agent picker form with checkboxes when a skill is installed in multiple agents

## [Lock File Metadata] - 2026-03-23

- Show skill source, install date, and update date from the global lock file in the detail panel
- Add "Open on GitHub" action for installed skills
- Add "Copy Source URL" action for installed skills

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
