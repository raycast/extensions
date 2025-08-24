# ChatGPT Quick Actions Changelog

## [API Pricing] - 2025-06-26

- Updated [API pricing information](https://platform.openai.com/docs/pricing) and conversion fix

## [Models Update and Consolidation] - 2025-06-11

- Add latest OpenAI models: GPT-4.1, GPT-4.1 mini, GPT-4.1 nano, o1, o1-mini, o1-pro, o3, o3-mini, o4-mini
- Remove obsolete models: GPT-3.5 Turbo, GPT-4, GPT-4 Turbo
- Add consolidation system for model maintenance
- Define models in single location instead of 9 places
- Add npm run build-package script
- Update pricing structure to per 1M tokens
- Update parameter naming to input_token/output_token

## [Add Transform and Transform Preview commands] - 2024-09-18

- Add a Transform command which replaces the selected text with transformed text based on a prompt that is entered when the command is run.
- Add a Transform Preview command which does the same as the Transform command but displays the result in a preview window instead of replacing the selected text.

## [Upgrade Open AI API from v3 to v4] - 2024-08-02

In Aug 2023, Open AI updated its SDK to v4 that natively supports streaming completion.
See details [here](https://github.com/openai/openai-node/discussions/217).

- Bump `openai` to `^4.53.2`
- Bump dependencies and `npm audit` suggestions
- Migrate API configuration in `api.ts`
- Simplify and migrate `getResult()` in `common.tsx`
- Migrate `Command()` in `execute.ts`

## [Update models] - 2024-07-31

- Add support for new model: `gpt-4o-mini`
- Remove support of legacy (naming of) models: `gpt-3.5-turbo-16k`, `gpt-4-32k-0613`, `gpt-4o-2024-05-13`
- Reorder models in a more logical order
- Change fallback from now costly `gpt-4` to affordable & more capable `gpt-4o`
- Update price estimates

## [New models] - 2024-05-24

- Fix the new model `GPT-4o` to be applied for all commands

## [New models] - 2024-05-21

- Add support for the following models: `GPT-4o`, `gpt-4o-2024-05-13`.

## [Fix] - 2024-02-01

- Fix "Preview" action description typo.

## [New models] - 2023-06-13

- Add support for the following models: `gpt-3.5-turbo-16k`, `gpt-4-32k-0613`.

## [Enhancements] - 2023-06-03

- Allow custom model for each command
- Improve preferences

## [Initial Version] - 2023-03-02
