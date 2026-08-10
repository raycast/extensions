# Changelog

## [AI SDK, Multi-Provider & Model Updates] - 2026-04-12

- Internal: Migrated model integration from `openai` SDK to `ai` SDK with provider routing.
- Improvement: Restored live streaming responses and improved final usage/token extraction compatibility in Raycast runtime.
- Feat: Added Google Gemini provider support with a dedicated `Gemini API Key` setting.
- Feat: Added Gemini models: `gemini-3-flash-preview`, `gemini-3-pro-preview`, `gemini-2.5-flash`, `gemini-2.5-flash-lite`.
- Feat: Added OpenAI GPT-5.4 models: `gpt-5.4`, `gpt-5.4-mini`, `gpt-5.4-nano`.
- Improvement: `OpenAI API Key` and `Gemini API Key` are now optional in settings and validated at model usage time with explicit errors.
- Improvement: Removed deprecated models `gpt-3.5-turbo` and `gpt-4-turbo`; defaults now use `gpt-4o-mini`.
- Internal: Added data migration to automatically map legacy model selections to supported defaults.

## [New Models] - 2024-08-27

- Feat: Added `gpt-4o` and `gpt-4o-mini` models.
- Improvement: Default actions now use the `gpt-4o-mini` model, and the prompts have been updated to be consistent with the new model.
- Internal: Removed the gpt-tokens package and replaced it with tokenization from the OpenAI API, calculating costs based on OpenAI's pricing.

## [New Additions] - 2024-05-03

- Feat: You can now trigger actions from the menu bar.
- Feat: Added 'Custom Action' command where you can define your instructions on the fly.
- Improvement: Change the model from `gpt-4-turbo-preview` to `gpt-4-turbo`.

## [Fixes and New Additions] - 2024-04-17

- Fix: Handling errors during server communication.
- Feat: Add Favorites section.
- Feat: Add Action colors.
- Internal: Refactor store structure and backup mechanism. Add store versioning.

## [Fixes and New Additions] - 2024-04-11

- Feat: Add an additional check to verify if the selected text is empty, even if it contains only white spaces.
- Feat: Add action duplication feature.
- Fix: Fix export / import timeout.
- Fix: Correct token counting in the history view.
- Internal: Refactor internal code structure.

## [New Additions] - 2024-04-10

- Moved create action to the separate command.
- Added export and import actions.
- Added "Paste Result" action to the action result view.

## [Initial Version] - 2024-04-08

Introducing the initial version of the Alice AI. This version includes the following features:

1. Browse your actions
2. Execute your actions
3. Always go back to your action history
4. Easily customize your actions
5. Quicklink to your actions
6. Supported OpenAI models:
   - GPT3.5 Turbo
   - GPT4 Turbo
