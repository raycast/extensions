# Dify Changelog

## [1.0.2] - {PR_MERGE_DATE}

- Enhanced type safety by replacing string literals with enum types for response modes
- Improved error handling in streaming mode to prevent silent failures
- Fixed premature termination issues in streaming responses
- Added meaningful error messages instead of empty responses
- Improved code formatting and linting across the codebase
- Enhanced error propagation to ensure users receive proper error notifications

## [1.0.1] - {PR_MERGE_DATE}

- Improved input field validation to filter out invalid input names (empty or whitespace-only)
- Enhanced AI extraction logic to work with validated input fields
- Fixed syntax errors and improved code structure
- Better error handling for network issues
- Maintained original query integrity when processing inputs

## [1.0.0] - {PR_MERGE_DATE}

- Seamless integration with Dify AI applications
- AI Tools integration with Raycast command system (@dify)
- Add Dify App command for configuring new Dify applications 
- Send to Dify command for interactive conversations with Dify AI
- List Dify command for managing your Dify applications
- View Conversations command for accessing conversation history
- Support for various application types: Chatflow/Agent, Workflow, Text Generator
- Conversation continuity with Continuous and Single Call modes
- Response streaming support for real-time interactions
- Flexible Wait for Response options
- Support for customizable input parameters in various formats