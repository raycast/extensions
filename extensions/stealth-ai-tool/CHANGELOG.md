# Stealth AI Changelog

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
