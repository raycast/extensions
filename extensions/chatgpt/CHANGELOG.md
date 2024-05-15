# Changelog

## [Feature] - 2024-05-14

- Feature: support GPT vision input

## [Feature] - 2024-04-30

- Feature: add `Summarize` command to summarize website and YouTube video
- Refactor: model dropdown save model switch `localstorage` to `cache`

## [Feature] - 2024-04-09

- Feature: Support custom model name in `Models` (Enable in preferences)

## [Fix] - 2024-03-22

- Fix: `Auto-load Text` and `Use Full Text Input` not working properly
- Fix: `Ask` `onSelectionChange` race condition

## [Chore] - 2024-03-09

- Chore: Retrieve `Preferences` dynamically directly from the generated type definition

## [Feature] - 2024-02-21

- Feature: Integrate awesome-chatgpt-prompts project

## [Fix] - 2024-02-20

- Fix: Inability to answer according to prompt rules or even refusal to answer

## [Added keywords] - 2024-12-02

- Added a few keywords to make the extension easier to find in the store.

## [Feat] - 2024-01-31

- Feature: Make responses display above the question

## [Fix] - 2024-01-28

- Fix: Proxy not working
- Fix: Fetching model data lag entered the form view
- Fix: Switching from "Ask Question" to "Full Text Input", the model change didn't work
- Chore: Add react hook lint

## [Fix] - 2024-01-19

- Fix: Azure API 401 error

## [Chore] - 2024-01-11

- Migrate openai v3 to v4

## [Fix] - 2024-01-01

- Fix: Markdown output being truncated when streaming enabled with json parse error
- Fix: Display question improperly in markdown with trailing whitespace
- Fix: Showing error message when throwing Can't stream message error

## [Fix] - 2023-08-23

- Fixed an authentication error when listing models which caused a crash

## [Fix & Feature] - May, 18 2023

- Feature: Custom API Endpoint
- Fix: 404 error code while Use Azure is enabled

## [Fix & Feature] - May, 2023

- Feature: Azure OpenAI ([@sykuang](https://github.com/abielzulio/chatgpt-raycast/pull/36))
- Fix: More verbose on handling the `429` error code
- Fix: `API` -> `APIKey` ([@k8scat](https://github.com/abielzulio/chatgpt-raycast/pull/32))
- Fix: Refine docs
- Fix: JavaScript heap out of memory ([@thanhlongb](https://github.com/abielzulio/extensions/pull/1))

## [Fix & Feature] - April, 9 2023

- Feature: Pause history
- Fix: Handle the `429` error code

## [Fix] - April, 4 2023

- Fixed an edge case bug causing the conversation to only remember the response to #1.

## [Fix] - March, 29 2023

- Fetch models from the API. This allows to use GPT-4 if enabled on the user's account ([@CruelMoney](https://github.com/abielzulio/chatgpt-raycast/pull/29))
- Show the error message coming from OpenAI instead of the generic error message ([@CruelMoney](https://github.com/abielzulio/chatgpt-raycast/pull/29))
- Handle overlimit token usage ([@CruelMoney](https://github.com/abielzulio/chatgpt-raycast/pull/29))

## [Initial release] - March, 26 2023

Introducing ChatGPT for Raycast. Interact with OpenAI's ChatGPT straight from your command bar, with 5 commands available:

1. `Ask` Start a new conversation with ChatGPT by asking a question
2. `Conversations` → Continue recent conversations without losing context
3. `Models` → Collection of the user's default and custom models
4. `Saved Answer` → Collection of the user's saved question and its answer
5. `History`→ Collection of all the user's questions plus the answers
