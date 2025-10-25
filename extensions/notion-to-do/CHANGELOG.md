# Notion Task Manager Changelog

## [1.0.0] - 2025-01-25

### Added
- **Create Task**: Quick task capture with smart project selection and Markdown description support
- **Update Task**: Update status and properties of existing tasks
- **Daily Overview**: Comprehensive daily summary with focus areas, in-progress tasks, and blockers
- **Search Tasks**: Full-text search with natural language AI search (Raycast Pro or OpenAI)
- **Menu Bar Summary**: Pin daily task stats to Raycast menu bar with auto-refresh

### AI Features (Optional - Works with Raycast Pro or OpenAI)
- **Smart Task Creation**: Natural language task parsing with intelligent property suggestions
- **Task Breakdown**: AI-powered complex task breakdown into actionable subtasks
- **Smart Prioritization**: Daily priority suggestions based on due dates, urgency, and context
- **AI Task Summary**: Generate standup updates and work reports from completed tasks
- **Natural Language Search**: Search tasks using conversational queries

### Features
- Markdown/MDX support in task descriptions
- Dynamic project dropdown with ability to add new projects
- Smart defaults based on context (priority, due dates)
- Visual priority indicators (🔴 Critical, 🟠 High, 🟡 Medium, ⚪ Low)
- Keyboard shortcuts for all common actions
- Auto-refresh for menu bar (every 5 minutes)
- Offline detection and error handling
- Secure credential storage via Raycast

### Technical
- Built with Raycast API v1.103.4
- Notion SDK v2.2.14 integration
- Supports both Raycast Pro AI and OpenAI fallback
- TypeScript for type safety
- Real-time Notion API queries