# Changelog

## [1.0.0] - 2025-09-10

### Added

- **Summarize**: Generate concise summaries of selected text with input/output comparison
- **Translate**: Smart translation with primary/secondary language pair detection
  - Auto-detection: English ↔ Secondary language, others → Primary language
  - Manual target language override support
  - Configurable primary and secondary default languages
- **Rephrase**: Improve text clarity and naturalness with before/after comparison
- **Proofread**: Fix grammar, spelling, and punctuation errors with corrections shown
- **Ask AI**: Quick Q&A interface for instant answers with question/answer display
- **Custom API Request**: Advanced tool for custom CometAPI endpoint testing
  - Support for GET, POST, PUT, DELETE methods
  - Custom JSON request body editor
  - Response viewer with status and formatted output
- **List Models**: Browse all available CometAPI models
  - Filtered chat models (excludes image/audio/video generation models)
  - Recommended models section highlighting best options
  - Model details with usage examples
- **Per-command customization**:
  - Custom system prompts for each command
  - Model override options for specific use cases
  - Configurable language preferences for translation
- **Enhanced error handling**:
  - Detailed error messages with HTTP status codes
  - API key validation and fingerprinting
  - Fallback mechanisms for authentication issues
- **Input/Output comparison**: All text processing commands show original and processed text side by side

### Technical Details

- OpenAI-compatible API integration with CometAPI
- Support for latest models including GPT-5, Claude-4, Gemini-2.5, DeepSeek-v3
- Automatic text selection prefilling for quick workflows
- Comprehensive preference system for user customization
- JSON schema validation for custom API requests
- Model filtering using pattern matching for relevant chat models

### Supported Models

- GPT Series: `gpt-5-mini`, `gpt-5`, `chatgpt-4o-latest`, `o3-pro-2025-06-10`
- Claude Series: `claude-opus-4-1-20250805`, `claude-sonnet-4-20250514`
- Gemini Series: `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.0-flash`
- Grok Series: `grok-4-0709`, `grok-3`, `grok-3-mini`
- DeepSeek Series: `deepseek-v3.1`, `deepseek-r1-0528`, `deepseek-reasoner`
- Qwen Series: `qwen3-30b-a3b`, `qwen3-coder-plus-2025-07-22`
