# raycast-ollama Changelog

## [Fix] - 2025-02-26

- Corrected typos

## [Improvement] - 2025-01-02

- New Command 'Loaded Models': lists currently models loaded on memory. Data are auto updated every 3 seconds.
- Command 'Manage Models': model currently loaded in memory flagged with tag 'In Memory'.
- Command 'Manage Models': added Action 'Update Model', pull selected model from registry updating it. 
- Command 'Manage Models': added Action 'Model Library', open Ollama Library Web page for listing available models.
- Command 'Chat with Ollama': modified copy keybinds to 'cmd+shift+c' from 'cmd+c'.

## [Improvement and BugFix] - 2024-08-05

- [Improvement] New action "Continue as Chat" on single shot commands allow continuing conversation on "Chat with Ollama".
- [BugFix] Custom commands created before "2024-06-03" update, or with incorrect parameters now display error message instead of crashing.
- [BugFix] Typo fixed on "Make Longer" command.

## [BugFix] - 2024-06-30

- Fixed typo on error code 'Raycast Browser Extensions Needed for This Feature'.

## [BugFix] - 2024-06-20

- Fixed Error `keep alive, error missing unit in duration` on **Command 'Create Custom Command'**.

## [BugFix] - 2024-06-19

- Fixed Error `keep alive, error missing unit in duration`: unit is now required for negative or zero duration time. Use -1s for persistent model on memory or 0s for free up memory immediately.

## [Improvement] - 2024-06-03

- **Command 'Manage Models'**: Support for multiple configured Ollama Server, manage and use models from different server.
- **Command 'Custom Command'**: changed prompt format to the [Raycast Prompt Explorer](https://prompts.ray.so/) one. More details on supported tag on the *README.md*. ***WARNING***: This change combined with allowing multiple Ollama server feature break all configured custom command so all custom commands need to be reconfigured.
- **Command 'Summarize Website'**: New command that summarize the content of the current web browser tab. For this feature [Raycast Browser Extentision](https://www.raycast.com/browser-extension) is required.
- **Command 'Chat with Ollama'**: Improved UI, combine models from different Ollama Server and use browser content on prompt with [Raycast Browser Extentision](https://www.raycast.com/browser-extension).
- Added support for *keep_alive*, you can now chose how many minutes the model must stay on memory.

## [BugFix] - 2024-03-12

- [@almoce] Fixed missing first word in answer on `Chat with Ollama`.

## [Improvement and BugFix] - 2024-03-02

- [Improvement] [@AlexMcDermott] Screenshot on Clipboard can now be used on `Chat with Ollama` and `Describe Content of Image`.
- [BugFix] Fixed error causing ModelView not showing if model was not configured.

## [BugFix] - 2024-01-24

- Fixed `Cannot read properties of undefined (reading 'split')` caused by API route '/api/show' responding with empty 'parameters' value for some models.

## [BugFix] - 2024-01-12

- **Command 'Improve Writing'**: fixed error 'Preferred model is not configured in LocalStorage'.
- Fixed typo on error code 'Prefered model is not configured in LocalStorage'.

## [Improvement] - 2024-01-11

- **Command 'Translate'**: now is required to specify the destination language.

## [BugFix] - 2024-01-02

- **Command 'Manage Models'**: fixed bug that cause error `ollama-models | TypeError: Cannot read properties of undefined (reading 'split')` when model show information was undefined.
- **Command 'Chat With Ollama'**: fixed bug that cause error `ollama-chat | SyntaxError: Expected ',' or '}' after property value in JSON at position 97` when Ollama chat api response with an unformatted JSON response.
- **Command 'Manage Models'**: fixed bug that cause error `ollama-models | SyntaxError: Unexpected non-whitespace character after JSON at position 30` when Ollama pull api response with an unformatted JSON response.

## [Improvement and BugFix] - 2023-12-20

- [Improvement] **Command 'Chat With Ollama'**: implemented the new Ollama chat feature, for use this command is now required at least Ollama v0.1.14.
- [Improvement] **Command 'Chat With Ollama'**: new tag `/image` permit to add an image from clipboard or more than one from Finder selection on the prompt. At least Ollama v0.1.15 and one multimodal model installed are required. Only PNG or JPG image are supported.
- [Improvement] **Command 'Chat With Ollama'**: new extention setting "Chat Memory Messages" permit to chose how many messages use as memory. By default it use the last 20 messages.
- [Improvement] **Command 'Chat With Ollama'**: used tags and documents are now showed on metadata section.
- [Improvement] **New Command 'Describe Content of Image'**: describe the content of the image on the clipboard or from Finder selection on the prompt. At least Ollama v0.1.15 and one multimodal model installed are required. Only PNG or JPG image are supported.
- [Improvement] **New Command 'Get Text From Image'**: extract the text from the image on the clipboard or more than one from Finder selection on the prompt. At least Ollama v0.1.15 and one multimodal model installed are required. Only PNG or JPG image are supported.
- [Improvement] **Command 'Custom Command'**: implemented system prompt override and image selection. For image at least Ollama v0.1.15 and one multimodal model installed are required.
- [Improvement] **Command 'Create Custom Command'**: implemented the new features of 'Custom Command'.
- [Improvement] **Command 'Manage Models'**: show more information about installed models.
- [Improvement] Extention setting 'Show Inference Statistics' moved to Actions, use `CMD+Y` to toggle on and off.
- [BugFix] At Command startup it now verify if preferred model is installed, if not it prompt you to chose a new one.

## [Fixed spelling error in extension description] - 2023-12-07

## [Improvement] - 2023-11-30

- [Improvement] Query you pdf or text based file with Ollama. More information on how to use is on README.md.
- [Improvement] On Command 'Manage Models' is now possible to view all Modelfile parameters. If a specific parameter isn't set on Modelfile it display the default value.

## [BugFix] - 2023-11-5

- [BugFix] Fixed error `ModelsOnRegistry.lengh undefined`.
- [BugFix] Fixed error `SyntaxError: Unexpected end of JSON input` caused by Ollama Generate API response no longer providing `sample_count` and `sample_duration` fields.

## [Improvement] - 2023-10-21

- [Improvement] New Preference 'Input Source' permit to chose input between 'Selected Text' or 'Clipboard'. Default to 'Selected Text'.
- [Improvement] New Preference 'Enable Input Source Fallback' if enabled fallback to the other input source if main input is empty. Disabled by default.

## [Improvement and BugFix] - 2023-09-18

- [Improvement] Moved Model preferences to LocalStorage.
- [Improvement] Is now possible to modify model on the go throw cmd + m shortcut.
- [Improvement] Ollama Host is now configurable throw Preferences.
- [Improvement] Metrics metadata now available on Chat Command. New metrics available: token/s, load_duration, sample_count, sample_duration.
- [BugFix] Reduced re-rendering on models downloading.
- Following command no longer available: ollama-ask, ollama-custom-ask, ollama-custom-chat.

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
