# Changelog

## [Fix] - 2025-04-14

- Fix: Actions such as copy, save, and speak were unavailable in chat messages of previous conversations.

## [Feature] - 2025-02-23

- Fix: Fixed the error display issue: errors are now always fully readable and rendered correctly in their respective places.
- Fix: Fixed the issue when some errors may not be displayed in the UI.
- Feature: Added a tip to help users understand how to discuss the results of the AI command in chat.
- Feature: Refactored error messages. Now, they are more informative and user-friendly.

## [Feature] - 2025-01-22

- Feature: Introduced a method to dynamically create new commands for processing user text input from various sources, including selected text, clipboard text, and open web pages.
- Feature: Added new commands: "Fix Spelling and Grammar" and "Improve Writing".

## [Feature] - 2025-01-01

- Feature: Added import/export functionality to Conversations.

## [Fix] - 2025-01-01

- Fix: Fixed o1 models not working, and added a prompt warning for o1 models.

## [Fix] - 2024-11-24

- Fix: Fixed Images not rendering if their paths have spaces in them.

## [Feature] - 2024-10-09

- Feature: Added import/export functionality to Models to prevent potential data loss and alleviate data anxiety.
- Feature: Introduced a new reusable import/export module, so that it can be used in other parts of the extension in the future.

## [Fix] - 2024-10-09

- Fix: Modified the `useModel` initialization process to update `localStorage` only after initialization is complete, preventing data overwrite. Addresses issues #8977, #14356, and #14125.
- Chore: Removed `List.EmptyView` when the model list is empty, as the Action panel would remain empty and default models ensure the model list is not empty.

## [Feature] - 2024-10-06

- Feature: Change all occurence of `gpt-3.5` and the like to `gpt-4o-mini`, as the latter is cheaper and more efficient.
- Feature: Update `setOption` to include all model IDs, removing the filter for 'gpt' prefix. (To support `o1` models).
- Chore: Remove unnecessary union type literals in `src/type.ts:Model.option`, since 'option' was already effectively a 'string'.

## [Feature] - 2024-09-02

- Feature: Support for certain platforms that only accept simple string formats, such as DeepSeek.

## [Feature] - 2024-08-26

- Feature: Support custom vision model name

## [Fix] - 2024-08-13

- Fix: the image width calculation in AnswerDetailView, which previously returned undefined.
- Update package-lock.json to fix the security vulnerability (npm audit fix)

## [Fix] - 2024-08-09

- Fix: An unhandled error was encountered while parsing the CSV file.
- Chore: Update prompts.csv URL to the latest version

## [Fix] - 2024-07-29

- Restarting a conversation will retain the currently selected model

## [Fix] - 2024-07-16

- Add placeholder to improve accessibility

## [Feature] - 2024-06-13

- Feature: Add Vision Command Capability on Clipboard Image
- Feature: Add Vision Command Capability on Finder Image

## [Chore] - 2024-06-02

- Chore: Improve README about models and vision capabilities

## [Fix] - 2024-05-16

- Fix: add `isAutoFullInput` state machine check
- Fix: `isAutoTTS` not available in stream mode
- Feat: support detail show img
- Feat: support clipboard upload file
- Fix: question onchange not clear error

## [Fix] - 2024-05-15

- Fix: `List.Item.Detail.Markdown` display big image caused Heap out of memory

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
