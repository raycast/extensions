# Developer Decision Navigator

A Raycast extension that intelligently prioritizes your work across GitHub, Linear, and Slack, helping you focus on what matters most and reduce decision anxiety.

## 🎯 What It Does

**Always know what to work on. Never miss what matters.**

This extension analyzes your tasks from multiple sources and provides:
- **Intelligent prioritization** based on urgency, importance, effort, and context
- **Focus recommendations** to help you maintain deep work sessions
- **Time estimates** for tasks to help with planning
- **Smart notifications** that respect your focus time

## 🚀 Features

### Core Functionality
- **Multi-source task aggregation** from GitHub, Linear, and Slack
- **AI-powered prioritization** using weighted scoring algorithms
- **Focus mode integration** with distraction blocking
- **Daily standup reports** to track progress and blockers

### Smart Prioritization Factors
- **Urgency**: Due dates, SLA requirements, age of tasks
- **Importance**: Business impact, stakeholder priority, team context
- **Effort**: Estimated time, complexity, dependencies
- **Context**: Current focus areas, blocking relationships

## 🛠️ Setup

### Prerequisites
- Raycast installed
- API tokens for your tools (GitHub, Linear, Slack)

### Installation
1. Clone this repository
2. Install dependencies: `npm install`
3. Build the extension: `npm run build`
4. Install in Raycast from the built extension

### API Configuration
Set up the following tokens in Raycast preferences:

#### GitHub
- **Personal Access Token** with `repo`, `read:org`, `read:user` scopes
- Generate at: https://github.com/settings/tokens

#### Linear
- **API Key** from Linear settings
- Generate at: https://linear.app/settings/api

#### Slack
- **Bot Token** from Slack app settings
- Create app at: https://api.slack.com/apps
- Required scopes: `channels:read`, `groups:read`, `mpim:read`, `im:read`, `channels:history`, `groups:history`, `mpim:history`, `im:history`

## 📊 How It Works

### Task Collection
The extension gathers tasks from:
- **GitHub**: Issues and pull requests assigned to you
- **Linear**: Issues in active projects
- **Slack**: Mentions and direct messages

### Scoring Algorithm
Tasks are scored on a 1-10 scale using:
- **Urgency** (30%): How time-sensitive the task is
- **Importance** (25%): Business impact and stakeholder priority
- **Effort** (20%): Estimated time and complexity (inverse scoring)
- **Dependencies** (15%): Whether other work depends on this
- **Context** (10%): Alignment with current focus areas

### Priority Levels
- **🔴 Critical** (8.5+): Address immediately
- **🟠 High** (7.0+): Schedule for today
- **🟡 Medium** (5.5+): Consider if time allows
- **🟢 Low** (4.0+): Schedule for this week
- **⚪ Trivial** (<4.0): Defer or delegate

## 🎮 Usage

### Main Command: "Get Decision Guide"
- Press your Raycast hotkey
- Type "Get Decision Guide"
- Get an intelligent guide to your priorities

### Focus Sessions
- Start distraction-free work sessions
- Automatic notification buffering
- Progress tracking and check-ins

### Daily Standups
- Automated progress reports
- Blocker identification
- Health status tracking

## 🏗️ Architecture

### Core Components
- **Services**: API integrations (GitHub, Linear, Slack)
- **Models**: Business logic (PriorityModel, TaskAggregator, RecommendationEngine)
- **Types**: TypeScript definitions for data structures
- **UI**: React components for Raycast interface

### Data Flow
1. **Collection**: Gather tasks from all configured sources
2. **Scoring**: Apply priority algorithm to each task
3. **Aggregation**: Combine and sort by priority
4. **Recommendation**: Generate actionable guidance
5. **Display**: Present in clean, actionable format

## 🔧 Development

### Project Structure
```
src/
├── decision-guide.tsx      # Main command component
├── index.tsx              # Extension entry point
├── services/              # API service integrations
│   ├── github.service.ts
│   ├── linear.service.ts
│   └── slack.service.ts
├── models/                # Business logic
│   ├── priority.model.ts
│   ├── task-aggregator.ts
│   └── recommendation-engine.ts
├── types/                 # TypeScript definitions
│   ├── preferences.ts
│   └── priority.types.ts
└── utils/                 # Helper functions
```

### Building
```bash
npm run build    # Build for production
npm run dev      # Development mode
npm run lint     # Check code quality
```

### Testing
- Unit tests for scoring algorithms
- Integration tests for API services
- E2E tests for full workflows

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

Built with ❤️ for developers who want to focus on creating, not deciding what to create next.
