# Grammaring Changelog

## [2.0.0] - 2025-10-13

### 🚀 Major Changes

- **Migrated to Vercel AI SDK**: Replaced direct OpenAI SDK with Vercel AI SDK for better extensibility and future multi-provider support.
- **Multiple Model Support**: Users can now choose from 5 different OpenAI models including GPT-4o, GPT-4.1 Mini, GPT-4.1 Nano, GPT-5 Mini, GPT-5 Nano.

### ✨ New

- Added "AI Model" preference dropdown with comprehensive OpenAI model selection.
- Each model option displays token limit information to help users make informed choices.
- Models available: GPT-4o, GPT-4.1 Mini, GPT-4.1 Nano, GPT-5 Mini, GPT-5 Nano.

### 💎 Improvements

- Better API architecture ready for future multi-provider support (Anthropic Claude, Google Gemini, etc.).
- Unified interface for AI model interactions through Vercel AI SDK.
- Enhanced error messages to reflect AI model usage instead of OpenAI-specific terminology.

### 🔧 Technical

- Dependencies: Added `ai` and `@ai-sdk/openai`, removed `openai`.
- Refactored `processText()` function to accept dynamic model selection.
- Updated both command implementations to pass model preference to core processing function.

## [1.0.2] - 2025-07-16

### ✨ New

- Added a banner to the README file.

### 💎 Improvements

- Enhanced system prompt with markdown formatting and comprehensive examples.
- Expanded bracket functionality to handle petitions alongside questions.

## [1.0.1] - 2025-06-11

### ✨ New

- Added cool new colors for the logo.

### 💎 Improvements

- Enhanced system prompt with current date information.
- Added new examples to the README file to provide users with easy-to-understand use cases.

## [Initial Version] - 2025-05-21