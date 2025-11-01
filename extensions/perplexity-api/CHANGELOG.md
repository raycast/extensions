# Perplexity API Changelog

## [Updated Models] - 2025-02-06

- Added `Sonar Reasoning 128k` and `Sonar Reasoning Pro 128k`.

## [Updated Models] - 2025-01-28

- Added citations for the generated answer.
- Added `Sonar 128k` and `Sonar Pro 200k`.
- Removed deprecated models `Llama 3.3 70B`, `Sonar Small`, `Sonar Large`, and `Sonar Huge`.

## [Updated Models] - 2025-01-21

- Added `Llama 3.3 70B`.
- Added Llama 3.1 405B based `Sonar Huge`.
- Removed deprecated models `Llama 3.1 8B`, `Llama 3.1 70B`.

## [New Command] - 2024-08-01

- Added new `AI Chat` command.

## [New Models] - 2024-07-31

- Added `Llama 3.1 8B` and `Llama 3.1 70B`.
- Added Llama 3.1 based `Sonar Small` and `Sonar Large`.
- Added addtional temperaturs values.
- Changed tokenizer to `cl100k_base`.

## [Fixes] - 2024-05-14

- Removed deprecated model `mixtral-8x22b-instruct`.
- Updated name of `llama-3-sonar-large-32k` to `Sonar Large 70B 32k` and updated pricing.

## [New Models] - 2024-05-05

- Added new Llama3 based Sonar models `llama-3-sonar-small-32k`, `llama-3-sonar-large-32k`.
- Removed deprecated models `codellama-70b-instruct`, `mistral-7b-instruct`, `sonar-small`, `sonar-medium`.
- Question of command `Ask AI` is now displayed at the top of the response.
- Updated default sytem prompt of `Fix Grammar and Spelling` command.
- Current time added to system prompt.

## [New Models] - 2024-04-22

- Added new Llama3 models and `Mixtral 8x22B` model.

## [Fixes] - 2024-03-17

- Fixed names of Mistral AI instruct models.

## [Fixes] - 2024-03-13

- Removed deprecated models.
- Adjusted pricing.
- Changed system prompt behavior. Now, the system prompt always includes the current date.

## [Fixes] - 2024-03-02

- Renamed commands to match Raycast's built-in AI commands for easier discovery.
- Added `Change Tone to Friendly` command.
- Improved tooltips for configuration of command prompts.

## [New Models] - 2024-02-22

- Added Perplexity's new Sonar models `sonar-small-chat`, `sonar-medium-chat` and `sonar-small-online`, `sonar-medium-online`.
- Updated pricing for MoE (8x7B) models.

## [Update] - 2024-02-13

- The extension now uses the OpenAI client.
- Streaming capability has been added for receiving responses, ensuring real-time interaction.
- Prompts can now be edited directly in the extension's settings to allow for customization.
- Retrying with different models and temperature values is now supported, allowing for flexibility in generating outputs.
- Individual models can be selected in the extension settings for each command, enabling tailored usage according to your needs.
- Perplexity Online LLMs have been integrated into the `Ask AI` command.
- Removed `Compose Response` command as it can be achieved by using the `Ask AI` command.
- The `Add comments to code` command has been expanded and improved, now titled `Coding Assistant`.
- Added `Custom Action` command for creating custom actions.

## [Corrected Spelling] - 2024-02-12

## [Initial Version] - 2024-02-07
