# Letta Agents for Raycast

Chat with your stateful AI agents that remember and learn over time — directly from Raycast.

## Features

- **🧠 Chat with Memory**: Talk to Letta agents that remember context across conversations
- **👥 Manage Agents**: List, switch, and create agents with different personalities
- **📝 View Memory**: Inspect what your agent knows and remembers about you
- **⚡ Templates**: Quick-start with Ion (enhanced memory), Coder, or Default templates

## Commands

| Command | Description |
|---------|-------------|
| **Chat with Agent** | Send messages to your active Letta agent |
| **Manage Agents** | List, select, and manage your agents |
| **View Agent Memory** | Inspect memory blocks of the active agent |
| **Create Letta Agent** | Create a new agent from a template |

## Setup

1. Install the extension from Raycast Store
2. Get your Letta API key from [app.letta.com](https://app.letta.com)
3. Open Raycast Preferences → Extensions → Letta
4. Enter your API key
5. (Optional) Set a custom base URL for self-hosted Letta

## Configuration

| Preference | Description | Required |
|------------|-------------|----------|
| **API Key** | Your Letta API key | Yes |
| **Base URL** | Custom Letta API URL for self-hosted | No |
| **Show Reasoning** | Display agent's internal thoughts | No |

## Agent Templates

### Ion (Enhanced Memory)
Personal assistant with enhanced memory and learning capabilities. Maintains working context and evolving understanding.

### Default Assistant
A basic conversational agent with standard memory blocks (persona + human).

### Coding Assistant
Specialized for software development with tech context tracking.

## Development

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Build for production
npm run build

# Lint
npm run lint
```

## Architecture

```
src/
├── hooks/
│   ├── useLettaClient.ts   # Letta client initialization
│   ├── useAgents.ts        # Agent list + active selection
│   ├── useChat.ts          # Chat message handling
│   └── index.ts            # Barrel exports
├── chat.tsx                # Chat command
├── agents.tsx              # Agent management command
├── memory.tsx              # Memory inspection command
└── create-agent.tsx        # Agent creation form
```

## Links

- [Letta Documentation](https://docs.letta.com)
- [Letta ADE](https://app.letta.com)
- [Raycast Extensions](https://developers.raycast.com)

## License

MIT
