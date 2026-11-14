# TranslaTone Changelog

## [Manage Providers] - {PR_MERGE_DATE}

- Add, edit, test, enable, disable and remove connections through Manage Providers
- Choose a primary provider and explicitly opt into automatic fallback
- Store managed credentials in Raycast's encrypted local storage; empty required keys disable the provider
- Simplify general preferences to language, tone and Enter-key behavior
- Existing beta users must re-enter provider details once in Manage Providers

## [Selection Command Input] - {PR_MERGE_DATE}

- Read selected text directly in Translate Selection, including text that matches the clipboard
- Keep Translate's clipboard preview local until explicitly submitted

## [Private Clipboard Preview and Setup] - {PR_MERGE_DATE}

- Preview clipboard text locally and choose Translate Clipboard before sending it to a provider
- Validate Custom model IDs and provider URLs, with actionable settings errors
- Require HTTPS for remote endpoints and keep HTTP support for loopback addresses
- Add setup, privacy, and troubleshooting instructions to the extension package

## [Custom Provider Streaming] - {PR_MERGE_DATE}

- Accept a successful stream finish signal from compatible providers even when they omit the final DONE marker
- Report streams missing a completion signal as interrupted responses, including their HTTP status and request ID

## [Provider Toggles] - {PR_MERGE_DATE}

- Enable or disable Groq and Gemini in preferences without removing saved API keys or models

## [Translation Reliability] - {PR_MERGE_DATE}

- Prevent pasting an earlier translation while text, tone, language, or model changes are pending
- Refresh translations when the configured provider, model, endpoint, or API key changes
- Reject incomplete translations and provider stream errors
- Let providers use supported default sampling parameters
- Redact API keys and URL credentials from error reports and logs

## [Initial Version] - {PR_MERGE_DATE}

- Translate as you type in one view: pick a tone with ↑↓, see the original below the result, and press ↵ to paste or ⌘↵ to copy
- Translate text with Default, LinkedIn, Email, and Chat tones
- Keep the original meaning in every tone, with names, numbers, links, and mentions left unchanged
- Translate between a main and second language automatically, and show the detected direction
- Show the translation as it streams in
- Pre-fill Translate with the selected text and show where it came from; when nothing is selected, preview the clipboard translation until you start typing
- Translate Selection replaces the selected text in place, and opens Translate when nothing is selected
- Bring your own key: pick OpenAI, Anthropic, OpenRouter, or any OpenAI-compatible endpoint, set your API key and model, and it is tried first
- Choose Model lists the models your key can use and switches with ↵; open it from Raycast or with ⌘M in Translate
- Choose a preferred provider; when it is rate-limited, out of quota, down, or times out, TranslaTone falls back to your other providers automatically
- Local usage tracking per provider, API key, and model
- The start screen lists the order providers are tried in, with each one's model and usage
- Errors explain the fix: a setup screen with links to get a key for every provider when no provider is configured, and failure toasts with Retry or Open Preferences plus Copy Debug Info
