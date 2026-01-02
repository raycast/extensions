# Rewiser Changelog

## [Version 1.0.0] - 2025-07-04

### Added

- AI-powered transaction processing with natural language support
- Multi-language support for global users
- Automatic folder selection for single-folder users
- Manual folder selection for multi-folder users
- Real-time transaction validation and processing
- Support for both expense and income transactions
- Automatic payment status detection (paid vs planned)
- Multi-currency support based on folder settings
- Beautiful transaction success display with all details
- Keyboard shortcut (Cmd+F) for changing folders
- "Add Another Transaction" functionality
- Comprehensive error handling and user feedback

### Features

- **Natural Language Processing**: Enter transactions like "Spent $50 at Starbucks" or "Received $2000 salary"
- **Smart Folder Management**: Automatically selects folder if user has only one, otherwise presents selection interface
- **AI Integration**: Uses OpenAI GPT-4o for intelligent transaction parsing
- **Multi-Currency**: Supports different currencies based on folder configuration
- **Transaction Types**: Automatically detects expenses vs income
- **Payment Status**: Determines if transaction is paid or planned based on language cues

### Technical Implementation

- Integrated with Supabase edge functions for backend processing
- Secure token-based authentication
- Real-time API communication
- Proper error handling and user feedback
- TypeScript implementation with full type safety
