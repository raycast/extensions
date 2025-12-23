# Grok AI Changelog

## [Enhanced Reliability & Dynamic Models] - 2025-08-04
- Added dynamic model fetching from xAI's `/v1/models` API endpoint
- Implemented automatic discovery of new models without extension updates
- Added 1-hour cache for fetched models to reduce API calls
- Added automatic fallback to hardcoded models if API is unavailable

## [Streaming Reliability & Testing] - 2025-07-31
- Implemented robust error recovery for streaming with automatic retry logic
- Added comprehensive test suite with Vitest
- Fixed history persistence issue with singleton pattern
- Removed duplicate conversation.tsx file
- Added CI/CD pipeline with GitHub Actions

## [Initial Release] - 2025-05-30
- Query xAI's Grok API directly from Raycast
- Real-time streaming responses for faster replies
- Conversation history with search functionality
- Custom model management and configuration
- Text-to-speech support for responses
- Auto-save conversation feature
- Robust error handling with automatic retry logic
- Comprehensive testing suite with 91%+ coverage
