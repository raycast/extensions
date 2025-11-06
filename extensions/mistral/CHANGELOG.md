# Mistral Changelog

## [Enhancement] - 2025-11-04

### Added
- Model selection dropdown in preferences for default model choice (Small, Medium, Large, Codestral)
- Keyboard shortcuts (Cmd+Shift+1-4) for quick model switching during conversations
- Copy Code action (Cmd+Shift+K) to extract and copy all code blocks from responses
- Copy Response action (Cmd+Shift+C) to copy full response text
- SVG icon assets for improved visual quality
- Comprehensive unit tests for model validation logic
- Model validation with automatic fallback for legacy model IDs

### Changed
- Upgraded to latest Mistral model lineup with `-latest` aliases
- Default model changed to Mistral Small for better API availability
- Redesigned conversation UI with proper markdown rendering using List views
- Improved empty state with Mistral logo and instructions
- Enhanced error messages for rate limit (429) errors with helpful guidance
- Optimized streaming performance with 50ms throttle to reduce jitter during text rendering

### Fixed
- Conversation context now properly maintained across follow-up questions
- Model selection consistency when using prop overrides
- Toast notifications properly dismiss after completion

## [Initial Version] - 2025-04-07
