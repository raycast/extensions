# Cai: Clipboard Action Intelligence Changelog

## [Initial Release] - {PR_MERGE_DATE}

### Features

- Smart content detection for words, meetings, addresses, URLs, and JSON
- AI-powered actions using local LLMs: define words, explain concepts, translate text, and summarize articles
- Custom Action feature (⌘1) - configure your own AI instruction accessible via keyboard shortcut
- Calendar event creation with intelligent title and location extraction from natural language
- Translation support for 10+ languages with two configurable quick-access languages
- Search integration with multiple engines: Brave Search, DuckDuckGo, Google, Bing, and Ecosia
- Maps integration supporting both Apple Maps and Google Maps
- Two commands: Smart Select (⌥C) and Smart Paste (⌥V)
- Privacy-first design: all AI processing happens locally on your machine, no cloud required

### Supported LLM Providers (11 total)

- LM Studio
- Ollama
- Jan AI
- LocalAI
- vLLM
- Text Generation Web UI
- Anything LLM
- Msty AI
- Open WebUI
- GPT4All
- Custom OpenAI-compatible servers

### Technical Improvements

- Race condition fix for content type detection to prevent stale state updates
- Async cancellation pattern to prevent memory leaks
- European time format support (14h → 14:00) for natural language date parsing
- Smart date/time merging (e.g., "tomorrow at 14h" correctly combines date and time)
- False positive filtering for date detection (filters out currency amounts like "$1", version numbers like "v1.2", durations like "for 20 seconds")
- Context-aware date detection (requires meeting keywords for time-only detections in longer text)
- Improved address pattern with word boundaries to prevent false matches (e.g., "$2 on the stock exchange")
- Improved calendar event title extraction with pattern matching and generic phrase detection
- Enhanced location extraction to capture full venue names with prioritized place name detection
- JSON detection with trailing comma support (common when copying from code)
- Pretty Print JSON with preview window (similar to AI actions)
- Translation defaults: English and Spanish
