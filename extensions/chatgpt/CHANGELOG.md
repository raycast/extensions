# Changelog

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
