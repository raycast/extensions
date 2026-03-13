# Changelog

## [1.1.0] - {PR_MERGE_DATE}


### Added
- **Complete Thought**: A new core command to naturally finish incomplete messages while matching your tone.
- **Paraphrase**: Added as a permanent core command for clear, simple English rewrites.
- **Improved Workflow**: You can now simply select text and hit your hotkey. Tweak will grab the selection and paste the result back directly, removing the need to manually copy text first.

### Changed
- Re-indexed generic custom actions (1-4) for a cleaner extension settings UI.
- Simplified "Paraphrase" command by removing unnecessary "Action Title" preference.
- Updated Anthropic model to `claude-3-5-sonnet-latest`.
- Refined internal prompts for better preservation of original meaning and intent.

### Fixed
- Improved fallback handling to clipboard if no text is currently selected.
- Cleaned up HUD feedback for generic custom slots.
- Passed all Raycast Store validation checks (Linting, Build, Metadata).

## [1.0.0] - 2026-03-09
- Initial release with Fix Grammar, Enhance Prompt, and Format Digestible.
- Support for Groq, OpenAI, and Anthropic providers.
- Custom AI action slots for personalized prompts.
