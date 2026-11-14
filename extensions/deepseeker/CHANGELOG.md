# DeepSeeker - Quick Actions Changelog

## [Current DeepSeek Models] - {PR_MERGE_DATE}

- Use the current DeepSeek model IDs, `deepseek-flash` and `deepseek-v4-pro`. DeepSeek rejects `deepseek-chat` and `deepseek-reasoner`, and saved preferences that still hold them are mapped to the new models
- Upgrade the OpenAI SDK to v7, which fixes the crash on launch from the v4 SDK
- Show the cost as unavailable for models without a known price instead of `-1 cents`, and keep it out of the cumulative cost and history

## [New Features] - 2025-03-31

- 🤖 Now Ask LLM command supports **search bar fallback**
- 🔧 Refactor preference getting logic

## [March Update - Code Refactor] - 2025-03-11

- 📏 **Obey** case naming convention
- ✂️ Remove redundant code
- 📄 Update **docs** and metadata
- 🛠️ Prompt optimizing for convenience: `fix` and `rephrase` commands now return the same format as inputs. You can paste them directly into the editor without removing `*` or `**`. ✂️

## [New Features] - 2025-03-05

- 📜 Add history command: browse and search all your interaction histories

## [New Features] - 2025-02-25

- 💸 Fix `deepseek-reasoner` prices
- 🧮 allow to use `input_price` & `output_price` with `deepseek-reasoner`

## [New Features] - 2025-02-10

- 🖱️ New Command: `Ask on Selected`: ask questions or instruct on the selected text.
- 🧑‍💻 Minor refactor code
- 💤 Minor improvements
- 🐳 Minor title adjustment of DeepSeek series and add a new name `deepseek-r1` for Alicloud.
- 🌍 Minor fix on `Translate` command
- 🙋 Add custom model support, now you can manually input customized model names if it's not listed

## [New Features] - 2025-01-30

- 🐳 Add DeepSeek-R1 reasoning model
- 🔄 Rename the deepseek-chat model to DeepSeek-V3 (official name)
- 💸 Add token count and cost estimation for DeepSeek-R1

## [New Features] - 2025-01-19

- 🙋 Add `Ask LLM` command using pure user query input.
- ✨ Add `Google Gemini` model support.

## [New Features] - 2025-01-14

- 🌐 Add Translate Action - Auto translate selected text into target language as setting

## [Initial Version] - 2025-01-10

- 🆕 Initial version of `DeepSeeker - Quick Actions`
- 💁‍♂️ Based on `ChatGPT Quick Actions` extension
- 🐟 Support newly introduced powerful yet cheap model `DeepSeek`
