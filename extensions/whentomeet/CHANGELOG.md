# Changelog

## [2.0.0] - 2025-01-XX

### Added

- **New AI System**: Upgraded to Raycast's modern AI system with tools and `ai.yaml` configuration
- **AI Tools**: Added `get-current-time` and `create-whentomeet-event` tools for better AI interaction
- **Enhanced Instructions**: Comprehensive AI instructions for better event parsing and creation
- **Evaluation Examples**: Added test cases to ensure AI behavior consistency

### Changed

- **Architecture**: Replaced old `useAI` hook with new AI tools system
- **User Experience**: Simplified interface - just describe your event and AI handles the rest
- **Error Handling**: Improved error messages and validation
- **Documentation**: Updated README with new AI features and usage examples

### Removed

- **Complex Form Interface**: Removed manual form editing in favor of AI-driven creation
- **Debounced Processing**: Simplified to immediate AI processing
- **Manual URL Building**: AI now handles all URL generation automatically

## [1.0.0] - 2024-XX-XX

### Added

- Initial release
- Natural language event creation using Raycast AI
- WhenToMeet URL generation with pre-filled parameters
- Support for relative date/time expressions
- Multiple time slot generation
