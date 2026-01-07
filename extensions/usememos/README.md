# Usememos Raycast Extension

A powerful Raycast extension for managing your [usememos](https://usememos.com) notes with AI-powered features.

## Features

- 📝 **List Memos** - Browse, filter, pin, archive, and delete memos
- ✏️ **Create Memo** - Quick memo creation with Markdown support
- 🔍 **Search Memos** - Text and semantic search (requires sync service)
- 🤖 **AI Agent** - Conversational AI that can search, create, and organize memos
- ⚡ **Quick AI** - One-off AI queries about your memos
- 💬 **AI Conversations** - Browse and resume previous AI chats

## Setup

### 1. Extension Preferences

After installing, configure these preferences:

| Preference | Description | Required |
|------------|-------------|----------|
| **Usememos Instance URL** | URL of your usememos instance | ✅ |
| **Access Token** | Personal access token from usememos settings | ✅ |
| **OpenAI API URL** | OpenAI-compatible endpoint (default: api.openai.com) | For AI features |
| **OpenAI API Key** | API key for AI features | For AI features |
| **AI Model** | Model to use (default: gpt-4o) | For AI features |
| **Sync Service URL** | URL of semantic search service | For semantic search |

### 2. Getting an Access Token

1. Go to your usememos instance
2. Navigate to Settings → Access Tokens
3. Create a new token and copy it

### 3. AI Features Setup

For AI features to work, you need an OpenAI-compatible API. You can use:
- OpenAI API (api.openai.com)
- Your own OpenAI-compatible endpoint
- Local LLMs with compatible APIs

## Commands

### List Memos
Browse all your memos with filtering options:
- Filter by: All, Pinned, Archived
- Search within results
- Actions: View, Copy, Pin, Archive, Delete, Open in Browser

### Create Memo
Create new memos with:
- Markdown content support
- Visibility options (Private, Workspace, Public)
- Auto-extracted hashtags

### Search Memos
Search through your memos:
- Text-based search using usememos API
- Semantic search (requires sync service)
- Toggle between search modes

### AI Agent
Chat with an AI assistant that can:
- Search your memos
- Create new memos
- Update existing memos
- Organize and suggest improvements
- Summarize your notes

### Quick AI
### Quick AI
Fast, one-off queries with a beautiful UI:
- **Instant Search**: Type your question directly in the search bar
- **Streaming Responses**: Watch the AI think and respond in real-time
- **Full Markdown**: Rich text support for code, lists, and formatted content
- **Follow-ups**: Easily ask follow-up questions
- **Context-Aware**: Uses your memos as context for accurate answers

### AI Conversations
Manage your AI chat history:
- Browse previous conversations
- Resume any conversation
- Delete old chats

## Semantic Search (Optional)

For enhanced semantic search, deploy the sync service:

```bash
cd sync-service
npm install
npm run build

# Configure environment
export DATABASE_URL="postgresql://..."
export USEMEMOS_URL="https://your-memos-instance.com"
export USEMEMOS_TOKEN="your-token"
export OPENAI_API_KEY="your-key"

# Run sync service
npm start

# Trigger initial sync
curl -X POST http://localhost:3001/sync
```

See `/k8s` directory for Kubernetes deployment manifests.

## Development

```bash
cd usememos-raycast
npm install
npm run dev
```

## License

MIT
