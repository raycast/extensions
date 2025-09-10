# Friday AI Assistant

An intelligent AI assistant that automatically executes tasks across multiple productivity tools using natural language commands. Just describe what you want to accomplish, and Friday will choose and execute the right tools automatically.

## Features

- **Natural Language Interface**: Describe tasks in plain English
- **Multi-Platform Integration**: Works with Gmail, Google Calendar, GitHub, Notion, Twitter, and web search
- **Smart Tool Selection**: AI automatically chooses the best tools for your task
- **Real-time Execution**: See results immediately with detailed feedback

## Supported Integrations

- 📧 **Gmail**: Send emails, read messages, manage inbox
- 📅 **Google Calendar**: Schedule meetings, manage events, check availability  
- 🐙 **GitHub**: Create issues, manage repositories, code management
- 📝 **Notion**: Create pages, manage notes, knowledge management
- 🐦 **Twitter**: Post tweets, social media management
- 🔍 **Tavily**: Web search, research, find current information

## Setup

### Required API Keys

1. **Composio API Key**: Get from [Composio Dashboard](https://app.composio.dev)
2. **OpenAI API Key**: Get from [OpenAI Platform](https://platform.openai.com)

### Optional API Keys

3. **Tavily API Key**: Get from [Tavily](https://tavily.com) for web search
4. **Tavily Auth Config ID**: From Composio dashboard (starts with `ac_`)

### Configuration

1. Install the extension from Raycast Store
2. Add your API keys in the extension preferences
3. Run the command and authorize integrations as needed

## Usage Examples

### Email Management
```
Send an email to john@company.com about the project update
```

### Meeting Scheduling  
```
Schedule a meeting with Sarah tomorrow at 2pm about the quarterly review
```

### GitHub Management
```
Create a GitHub issue for the login bug we discussed
```

### Research & Information
```
Search for the latest AI news and summarize the key points
```

### Social Media
```
Tweet about our product launch with excitement
```

### Note Taking
```
Create a Notion page to track the new feature development
```

## How It Works

1. **Input**: Describe your task in natural language
2. **Analysis**: AI analyzes your request and selects appropriate tools
3. **Authorization**: Authorize integrations when first used (OAuth or API keys)
4. **Execution**: Tasks are executed automatically across selected platforms
5. **Results**: View detailed results and confirmations

## Authorization

Friday uses secure OAuth flows and API key authentication:
- **Gmail & Calendar**: OAuth through Google
- **GitHub**: OAuth through GitHub  
- **Notion**: OAuth through Notion
- **Twitter**: OAuth through Twitter
- **Tavily**: API key authentication

All credentials are stored securely and only used for your authorized actions.

## Privacy & Security

- No data is stored or logged by the extension
- All API calls go directly to your authorized services
- API keys are stored securely in Raycast preferences
- Open source and transparent operation

## Support

For issues, feature requests, or questions:
- Check the [Composio Documentation](https://docs.composio.dev)
- Review [OpenAI API Docs](https://platform.openai.com/docs)
- Contact extension author: anshuman_mishra

## License

MIT License - feel free to contribute and modify!