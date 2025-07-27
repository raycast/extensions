# Prompt Explorer Extension Changelog

## [AI Extensions updates] - 2025-03-04

- Add AI Extensions to presets
- Render inline AI Extensions in prompts

## [Update] - 2025-02-27

- Updated dependencies
- Fixed linting issues

## [Fixes] - 2025-02-26

- Use composite keys like (`author_${username}_${name}`) to handle authors with same username but different display names
- Added proper handling for undefined creativity values in presets and prompts components
- Implemented fallback values (`preset.creativity || "unspecified"`) and null checks for creativity properties

## [Add Explore Quicklinks] - 2024-09-20

- Add command for exploring Quicklinks

## [Update endpoints] - 2024-05-06

- Update endpoints for fetching data.

## [Refactor data fetching] - 2024-05-06

- Fetch prompts & snippets from their respective APIs.
- Fetch Preset AI Model names from Raycast backend.

## [Adding prompts] - 2024-05-04

- Add task list prompt.

## [Fixes] - 2024-04-25

- Fix icon for the `None` creativity level in the `Explore Prompts` command.

## [Add Explore Presets] - 2024-04-16

- Add command for exploring Presets
- Update icons for creativity

## [Improvements] - 2024-04-16

- Add browser prompts and new models

## [Fixes] - 2023-02-28

- Fix custom prompt example.
- Fix `npm audit` reported vulnerabilities.

## [Fixes] - 2023-12-05

- Fix importing prompts in Raycast.

## [Adding prompts] - 2023-08-31

- Add default Raycast prompts.

## [Random Theme Button] - 2023-08-01

**Introducing the Random Theme button.**

🎲 Shake the dice, and enjoy a random theme. Pick Light, Dark, or All, and let Raycast Explorer do the rest.

## [Initial Version] - 2023-04-12

**Introducing Raycast Explorer: an extension to make the most of snippets, AI commands, and custom themes.**

This extension has three different commands:

- 📋 Explore Snippets: browse, select, add and share snippets
- ✨ Explore Prompts: browse, select, upvote, add and share prompts
- 🎨 Explore Themes: browse, select, and add themes
