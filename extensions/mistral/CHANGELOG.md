# Mistral Changelog

## [Vision Support] - 2025-11-07

### Added
- Vision support with Pixtral 12B and Pixtral Large models for image analysis
- Smart clipboard integration (Cmd+Shift+I) to browse last 5 clipboard items
  - Image thumbnails displayed for image files
  - Text preview for clipboard text items
  - Automatic type discrimination and handling
- Quick Look feature (Cmd+Y) for full-screen image preview
- Mistral logo display in Ask Question detail panel
- Real-time image preview when images are selected
- HEIC/HEIF to JPEG conversion for iPhone screenshot compatibility
- Image support in conversation history with `images` field
- Support for JPEG, PNG, and WebP image formats
- Centralised image format handling with typed constants

### Changed
- Switched Ask Question UI from Form to List view to enable image previews
- Updated streaming to use character-based chunking (100 chars) for smoother rendering
- Enhanced model selection with vision-capable Pixtral models in preferences
- Refactored clipboard functionality into shared hook and component
- Added visual feedback for attached images in conversation view

### Technical
- Direct REST API integration for vision requests (bypassing SDK limitation)
- Custom SSE stream parser for Mistral vision API responses
- Smart model switching: automatically upgrades to vision model when images detected
- Base64 image encoding for vision API compatibility
- Dynamic MIME type detection based on file extension
- Shared image format constants in `utils/image-formats.ts`

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
