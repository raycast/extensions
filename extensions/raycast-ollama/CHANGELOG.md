# raycast-ollama Changelog

## [Improvement] - 2023-08-15

- New command **Chat with Ollama**: an interactive chat (request / response) with possibility to save multiple conversation and resume them.
- New command **Create Custom Command**: an easy way for create custom commands with quicklinks.
- New command **Manage Models**: where you can view installed models, delete them and install new ones.

## [Improvement and BugFix] - 2023-08-12

- No longer needed custom MODFILEs.
- Model no longer restricted to orca and llama. Now can be selected all available Ollama model.
- Initial implementation of embeddings on code.
- Resolved bug causing Metadata not showing up.

## [Improvement] - 2023-08-11

- Added llama2:70b model. Thanks to [suhaildawood](https://github.com/suhaildawood).

## [Improvement and BugFix] - 2023-08-7

- Updated README.md with more information.
- Changed localhost with 127.0.0.1 it seems more reliable.

## [Improvement] - 2023-07-31

- New Command 'Ask Ollama with Custom Prompt' permits to use ask Ollama using a custom prompt. Use it with Quicklinks to create a custom Command.
- New Command 'Custom Command' permits the creation of a custom command for performing a task on selected text. Use it with Quicklinks to create a custom Command.
- Code improvement.

## [Improvement] - 2023-07-30

- Command 'Ask Ollama' no longer use fallback for text, replaced with query.
- Inference statistics are disabled by default and can be enabled from extension preferences.
- Text is displayed in real-time.

## [Code Improvement and BugFix] - 2023-07-29

- [BugFix] Fixed custom model file path and base model name for llama2.
- [Code Improvement] Better error handling.
- [Code Improvement] Added JSDoc documentation.
- [Code Improvement] Errors, Types, and Ollama functions moved out from main.tsx file.

## [Initial Version] - 2023-07-28
