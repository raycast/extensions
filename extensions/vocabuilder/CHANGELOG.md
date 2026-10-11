# VocaBuilder Changelog

## [More AI providers, clearer word details, and Anki export] - {PR_MERGE_DATE}

- Translation now works with Gemini, Anthropic, OpenAI, or any server that speaks the OpenAI Chat Completions API, such as OpenRouter, Ollama, or LM Studio. With the new `Provider` preference left on Auto-Detect, the provider is recognized from your API key.
- The `Gemini API Key` preference is now `API Key`, so Raycast asks for your key once after this update. Paste the same Gemini key to keep using Gemini.
- Pronunciation uses OpenAI speech with an OpenAI key, Gemini speech with a Gemini key, and the macOS system voice for Anthropic and OpenAI-compatible servers. OpenAI's legacy `tts-1` and `tts-1-hd` models also use the system voice to preserve the selected language. A new `Pronunciation` preference switches every provider to the macOS system voice.
- A word with more than five senses now shows the first five instead of failing the lookup.
- Word detail panes now lead with the translation itself, set as the largest text in the pane, above a single dictionary line carrying the word you looked up, its pronunciation transcription, part of speech, key inflected forms, and a usage label such as `formal` or `literary` where one applies. Each element appears only when it exists for that word, so multi-word expressions and languages without a transcription convention simply show less.
- Translations now request pronunciation transcriptions, inflected forms, and usage labels per sense, so a word that differs by part of speech — English `record` as a noun and as a verb — shows the transcription and forms belonging to the sense you picked.
- Example sentences in the translate, history, and flashcard detail panes now show the source-language sentence first, with the target-language rendering beneath it.
- The looked-up word is now shown in bold inside the source-language example sentence, including inflected forms and scripts without word boundaries.
- Detail panes now list the pronunciation actions and their shortcuts beside the entry, and leave the row out for a language that neither your provider nor the macOS system voice can speak.
- Pronunciation moved off `⌘O` and `⌘⇧O` onto `⌘⇧L` for the source word and `⌘⇧R` for the translation, in the translate, history, and flashcard views — the old chords are the ones Raycast reserves for Open and Open With.
- Anki export now writes a two-column `Front` / `Back` file tagged as Anki's `Basic` note type, with the translation, its part of speech, and both example sentences formatted on the back of the card. Earlier exports used five separate columns, so a note type built from one of those will not line up — import into a fresh deck or remap the fields once.
- Simplified translation and text-to-speech model preferences to accept any model ID your provider offers, without relying on hardcoded dropdown options. Leave the translation model empty to use Gemini 3.5 Flash-Lite, Claude Haiku 5.5, or GPT-6 Luna for your provider; leave the speech model empty for the provider's speech default.
- Removed the separate reasoning preference so reasoning behavior follows the configured model.
- Added an `API Server URL` preference so translation and pronunciation can be routed through a proxy or gateway, or to an OpenAI-compatible server, where it is required along with `Translation Model`. Enter a server root or a full API base such as `https://openrouter.ai/api/v1`. Your API key is sent to the host you configure, so plain `http` is accepted only for local addresses and credential-bearing URLs are rejected.
- API requests reject redirects so your API key stays with the server you configured.
- Reworked the translate screen while a translation is in progress: the word you are translating now appears as a row in the `Translation` section where its result will land, and your `Recent` translations stay on screen instead of the list clearing to an empty placeholder.
- Word input now auto-translates after 0.7s instead of 1.5s.
- Returning to a word already looked up in the same Translate session now restores its senses immediately, including after undoing a typo, without another API request.
- Failed exports and failed pronunciations now explain what went wrong instead of showing the raw system error and your file paths.

## [Configurable models and reasoning] - 2026-06-08

- Added a `Reasoning Level` preference for translations, defaulting to `Minimum` for the fastest Gemini responses.
- Replaced the free-form translation model default with a curated Gemini model dropdown plus an advanced custom model override.
- Replaced the free-form text-to-speech model default with a curated Gemini TTS dropdown plus an advanced custom model override.
- Refreshed the extension icon.
- Tightened the pronunciation prompt for more accurate text-to-speech output.

## [Switch language pairs, pronunciation, and configurable models] - 2026-06-01

- Added an in-command language pair selector: switch the source and target language straight from a dropdown in the `Translate`, `Translation History`, and `View Flashcards` commands, without opening preferences. The selection persists across commands.
- Renamed the `Source Language` / `Target Language` preferences to `Default Source Language` / `Default Target Language` — they now apply until you pick a pair from the dropdown.
- Added `Translation Model` and `Text-to-Speech Model` preferences so you can point to a newer Gemini model if a default is deprecated.
- Reworked error handling into clearer, more consistent toasts, including deprecation-aware messages that tell you when a model is no longer available and how to switch.
- Added a target-language purity rule so translations stay in the chosen language, reducing cases where words from another language leak into the output.
- Reject non-existing/gibberish words instead of hallucinating translations.
- Require example sentences to contain the original word, not a synonym.
- Add post-validation that filters out senses with missing words in examples.
- Handle phrasal verbs and idioms (e.g. "give up", "break the ice") as single vocabulary items.

- Added word pronunciation via Gemini TTS (⌘O for source word, ⌘⇧O for translation).

## [Initial Release] - 2026-04-08

- Added `Translate` command to translate words and short texts between languages using Gemini.
- Added `Translation History` command to browse saved translations.
- Added `Flashcards` command for spaced-repetition review of saved words (SM-2 algorithm).
- Added configurable source and target language support (17 languages).
- Added color-coded part-of-speech chips: nouns (blue), verbs (red), adjectives (green), adverbs (magenta), prepositions (yellow), pronouns (purple), conjunctions (orange).
- Added typo correction — misspelled words are auto-corrected before translation.
- Added short text and sentence translation support with detail panel.
- Added extension preferences for `Gemini API Key`, source/target language, and safe clipboard prefill behavior.
- Added auto-translate with 1.5s debounce for word input, manual submit for text.
- Added abort of in-flight requests on search text change.

<!-- Supported languages: English, Ukrainian, Russian, Belarusian, Polish, German, French, Spanish, Italian, Portuguese, Dutch, Czech, Swedish, Japanese, Korean, Chinese, Turkish -->
