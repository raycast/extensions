# Dify Changelog

## [1.0.0] - {PR_MERGE_DATE}

- Seamless integration with Dify AI applications
- AI Tools integration with Raycast command system (@dify)
- Add Dify App command for configuring new Dify applications
- Send to Dify command for interactive conversations with Dify AI
- List Dify command for managing your Dify applications
- View Conversations command for accessing conversation history (renamed to "View History" for more intuitive navigation)
- Support for various application types: Chatflow/Agent, Workflow, Text Generator
- Conversation continuity with Continuous and Single Call modes
- Response streaming support for real-time interactions
- Flexible Wait for Response options
- Support for customizable input parameters in various formats
- Improved input field validation to filter out invalid input names (empty or whitespace-only)
- Enhanced AI extraction logic to work with validated input fields
- Fixed syntax errors and improved code structure
- Better error handling for network issues
- Maintained original query integrity when processing inputs
- Enhanced type safety by replacing string literals with enum types for response modes
- Improved error handling in streaming mode to prevent silent failures
- Fixed premature termination issues in streaming responses
- Added meaningful error messages instead of empty responses
- Improved code formatting and linting across the codebase
- Enhanced error propagation to ensure users receive proper error notifications
- Improved UI interface for text generator and workflow modes
- Enhanced detail view display for non-conversational app types
- Fixed bug causing text generator to make duplicate API requests
- Added debounce protection to prevent multiple submissions
- Made inputs parameter optional for all app types
- Resolved interface compatibility issues with text generator
- Improved validation logic to properly handle optional inputs
- Added ability to parse Inputs field and generate dynamic input forms
- Fixed Workflow response handling to properly parse and display outputs from both response formats
- Enhanced type safety by implementing proper TypeScript interfaces for Workflow responses
- Improved error handling for different API response structures