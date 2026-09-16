# Stealth AI Changelog

## [Local Models: LM Studio & Ollama] - {PR_MERGE_DATE}

- Add LM Studio and Ollama as providers, so prompts can run entirely on your own machine
- Add an editable Server URL per local provider (defaults: `http://localhost:1234`, `http://localhost:11434`)
- Accept pasted URLs in any common shape (`localhost:1234`, `http://127.0.0.1:1234/v1/`)
- LM Studio model list uses the native `/api/v0/models` endpoint, hiding embedding models and marking the loaded one
- Ollama model list shows parameter size and quantization
- HTTP endpoints are now supported (previously every request was forced through HTTPS)
- All requests now time out instead of hanging: 60s for cloud providers, 180s for local ones
- Clearer failures: unreachable server, missing key and missing model each explain the fix and link to "Configure AI Model"
- Anthropic responses are no longer truncated at 1024 tokens
- Gemini API key moved out of the request URL into a header
- Fix model dropdown breaking when a saved model is missing from the fetched list
- Debounce is now per action, so one action no longer blocks a different one for 3 seconds

## [In-App AI Configuration] - 2026-02-09

- Add in-app AI provider and model configuration (no more Raycast Settings)
- Support for RaycastAI (default), OpenAI, Anthropic, Gemini, and OpenRouter model fetching via API
- API keys stored locally per provider
- Model error toast now links directly to Configure AI Model command
- Remove hardcoded model lists, fetch live from provider APIs

## [Windows Support & Finder Focus Fix] - 2026-02-04

- Add Windows platform support using Raycast's cross-platform APIs
- Fix Finder appearing and gaining focus during paste operations
- Fix beep sound issue when copying text
- Replace macOS-specific clipboard commands with Raycast Clipboard API
- Improve app re-activation logic to prevent focus loss
- Add platform detection for macOS and Windows specific operations
- Initial release with 9 customizable AI actions
- Fix Grammar action for typos and spelling errors
- Make Concise action to shorten text
- Create List action to convert text to bullet points
- Make Professional action for business communication
- Simplify action for complex text
- Custom actions 6-9 for user-defined prompts
- Multiline prompt editor
- Hotkey and alias support
