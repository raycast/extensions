# Changelog

All notable changes to this extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-08-14

### Added
- Initial release of GPT Rewriter extension
- 19 text processing commands with AI-powered functionality
- Voice-to-text transcription capability
- Per-command model selection with 13 AI models
- Automatic clipboard fallback when no text is selected
- Silent mode operation for unattended use
- Comprehensive settings interface

### Features
- **Text Processing**: Rewrite, summarize, translate, add humor, generate questions, improve, expand, generate titles, extract key points, positive/negative responses
- **Translation**: Support for English, Turkish, Persian, and Spanish
- **AI Models**: GPT-5, GPT-4o, Claude Sonnet 4, Gemini 2.5 Flash, and 9 other models
- **Smart Input**: Works with selected text or automatically falls back to clipboard content
- **Voice Transcription**: Audio-to-text conversion using OpenAI Whisper API
- **Custom Prompts**: User-defined prompts for personalized text processing

### Technical
- Robust error handling for text selection and API calls
- Automatic API detection (OpenAI vs OpenRouter)
- TypeScript implementation with React components
- Raycast API integration for seamless macOS experience
