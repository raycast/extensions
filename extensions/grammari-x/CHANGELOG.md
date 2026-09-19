# GrammariX Changelog

## [Quick Fix Command and OpenAI Provider Fallback] - {PR_MERGE_DATE}

- Rewrite the AI prompts so edits are context-aware: the whole text is read before editing, wording is corrected as well as grammar, and changes are kept to the minimum needed while the author's voice, meaning and formatting are preserved. Prompts now use a system message, a delimited input block so text is never mistaken for instructions, and a per-action creativity level.
- Add an "AI Provider" preference (Auto, Raycast AI, OpenAI). A configured OpenAI key is now used instead of being ignored whenever Raycast AI happens to be available, and a failing provider falls back to the other one. Failures are reported with the provider name and the underlying error.
- Change model from GPT-5 nano to GPT-5.6 Luna (`gpt-5.6-luna`), with reasoning disabled for fast, low-cost rewrites. Upgrade the OpenAI SDK to v7.
- Add "Quick Fix Selected Text" command: a no-view command that fixes the selected text and pastes it back in place, without opening Raycast. Configurable action (fix grammar, paraphrase, change tone, continue text) and tone.

## [Fix] - 2025-12-08

- Change the order of the copy/paste actions and the shortcut.

## [Fix] - 2025-08-18

- Fix minor issue related to temperature

## [Features] - 2025-08-08

- Change model from GPT-4o Mini to GPT-5 nano


## [Features] - 2025-03-17

- Change model from GPT-3 Turbo to GPT-4o Mini

## [Features] - 2025-01-22

- Add the `Improve Selected Text` command to enhance the selected text.

## [Improvements] - 2024-02-10

- Add arguments support

## [Improvements] - 2023-09-16

- Add raycastAI support, so for now you don't need to provide an openAI key if you have a raycast pro subscription.

## [Bug Fixes & Improvements] - 2023-09-11

- Fix an issue where history would display questions and answers incorrectly.
- Fix markdown rendering issues in history and saved pages due to extra spaces at the end of start tags.
- Correct a bug where grammar fixes in other languages would output results in English.

## [Initial Version] - 2023-09-06
