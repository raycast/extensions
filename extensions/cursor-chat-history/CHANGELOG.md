# Cursor Chat History Search Changelog

## [Initial Version] - 2025-07-25

🎉 **First release of Cursor Chat History Search extension for Raycast!**

### Features

- **AI Chat History Search**: Instantly search through all your Cursor AI conversations across multiple workspaces
- **Full-text Search Engine**: Find conversations by searching chat titles, message content, and AI responses
- **Multi-workspace Support**: Access chat history from all your Cursor projects in one unified interface
- **Smart Session Detection**: Automatically distinguishes between regular AI chats and Composer sessions
- **Rich Content Preview**: View chat content with proper markdown formatting and syntax highlighting
- **Quick Copy Actions**: Copy entire conversations or individual messages to clipboard with one click
- **Workspace Organization**: See which workspace each conversation belongs to with clear visual indicators
- **Timestamp Display**: View when each conversation took place for better context
- **Instant Results**: Real-time search with fast SQLite database queries
- **Keyboard Navigation**: Full keyboard support for efficient browsing and selection
- **Native macOS Integration**: Designed specifically for macOS users with Raycast

### Use Cases

- **Code Reference**: Quickly find AI-generated code snippets and explanations from past sessions
- **Solution Lookup**: Search for specific programming problems you've discussed with Cursor's AI
- **Learning Review**: Revisit AI explanations and educational content from previous conversations
- **Project Context**: Access AI assistance history for specific projects and workspaces
- **Documentation**: Use past AI conversations as a personal knowledge base

### Technical Implementation

- **Database Integration**: Direct access to Cursor's SQLite databases (`state.vscdb`) stored locally
- **Data Sources**:
  - `workbench.panel.aichat.view.aichat.chatdata` for regular chat history
  - `composer.composerData` for Composer session data
- **Storage Location**: Reads from `~/Library/Application Support/Cursor/User/workspaceStorage`
- **Search Technology**: Efficient full-text search with SQLite FTS (Full-Text Search)
- **Performance Optimized**: Fast indexing across multiple workspace databases
- **React UI Components**: Built with Raycast's native components for consistent user experience
- **TypeScript Codebase**: Type-safe implementation with proper error handling
