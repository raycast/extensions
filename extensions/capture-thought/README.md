# Capture Thought - Raycast Extension

A powerful Raycast extension that captures thoughts from anywhere on macOS, classifies them using AI, and stores them in a structured Notion database for easy prioritization and retrieval.

## Features

- **🧠 AI Classification**: Automatically categorizes thoughts by type, priority, and category
- **📋 Multiple Input Methods**: Capture from clipboard, selection, or dictation
- **📊 Notion Integration**: Stores thoughts in a structured database with health scoring
- **⚡ Priority Views**: Quick access to top priorities by category
- **🎯 Smart Categorization**: Distinguishes between work and personal thoughts

## Architecture

- **Raycast Extension**: Frontend UI and commands
- **Express Server**: Backend API for AI classification and Notion integration
- **OpenAI GPT-4**: Intelligent thought classification
- **Notion Database**: Structured storage with health formula

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- Raycast app installed
- OpenAI API key
- Notion workspace with integration access

### 2. Notion Database Setup

1. Create a new Notion database with these properties:
   - **Name** (Title)
   - **Type** (Select: Task, Idea, Concern, Decision, Question, Note)
   - **Priority** (Select: Urgent, High, Medium, Low)
   - **Category** (Select: Work, Personal)
   - **Due Date** (Date)
   - **Status** (Select: To Do, In Progress, Completed)
   - **Created** (Created time)
   - **Description** (Text)
   - **Health** (Formula) - Add your custom health formula

2. Create a Notion integration:
   - Go to https://www.notion.so/my-integrations
   - Create new integration
   - Copy the integration token
   - Share your database with the integration

3. Get your database ID from the database URL

### 3. Server Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp ../config.example .env
   ```

4. Update `.env` with your credentials:
   ```env
   PORT=3000
   OPENAI_API_KEY=your_openai_api_key_here
   NOTION_TOKEN=your_notion_integration_token_here
   NOTION_DATABASE_ID=your_notion_database_id_here
   ```

5. Start the server:
   ```bash
   npm run dev
   ```

### 4. Raycast Extension Setup

1. Install extension dependencies:
   ```bash
   npm install
   ```

2. Configure the extension:
   - Open Raycast
   - Go to Extensions → Capture Thought → Configure
   - Set Server URL to `http://localhost:3000`

3. Build and install:
   ```bash
   npm run dev
   ```

## Usage

### Commands Available

1. **Capture Thought (Clipboard/Selection)**
   - Automatically captures from clipboard or selected text
   - AI analyzes and pre-fills classification form
   - Edit and save to Notion

2. **Capture Thought (Dictate)**
   - Manual text input with dictation support
   - Two-step process: input → AI analysis → save

3. **Top Work Priorities**
   - Shows top 3 work priorities by health score
   - Quick access to high-impact work items

4. **Top Life Priorities**
   - Shows top 3 personal priorities by health score
   - Focus on personal goals and tasks

5. **Top Priorities (All)**
   - Combined view of all priorities
   - Cross-category overview

### AI Classification

The AI automatically determines:

- **Type**: Task (actionable) vs Idea vs Concern vs Decision vs Question vs Note
- **Priority**: Urgent → High → Medium → Low based on time sensitivity
- **Category**: Work vs Personal (detects personal keywords like "doctor", "grocery")
- **Title**: Proper formatting (imperative for tasks, descriptive for ideas)

### Health Formula

The Notion database uses a "Health" formula to prioritize thoughts. This should be configured in your Notion database based on:
- Priority level
- Days since creation
- Status
- Due date proximity

Example formula:
```
if(prop("Status") == "Completed", 0, 
  if(prop("Priority") == "Urgent", 100,
    if(prop("Priority") == "High", 75,
      if(prop("Priority") == "Medium", 50, 25)
    )
  ) - dateBetween(now(), prop("Created"), "days") * 2
)
```

## API Endpoints

### POST /draft
Classifies a thought using AI
```json
{
  "text": "Need to follow up with client about proposal",
  "context": "clipboard"
}
```

### POST /create
Creates a thought in Notion
```json
{
  "title": "Follow up with client about proposal",
  "description": "Need to follow up with client about proposal",
  "type": "Task",
  "priority": "High",
  "category": "Work",
  "dueDate": "2024-01-15"
}
```

### GET /priorities
Retrieves prioritized thoughts
- `?category=work` - Work priorities only
- `?category=personal` - Personal priorities only
- No param - All priorities

## Deployment

### Local Development
Both the server and Raycast extension run locally for development.

### Production Server
Deploy the Express server to:
- Railway
- Vercel
- Heroku
- AWS/GCP/Azure

Update the Raycast extension preferences with your production server URL.

## Troubleshooting

### Common Issues

1. **"Failed to classify thought"**
   - Check OpenAI API key
   - Verify server is running
   - Check network connectivity

2. **"Failed to save to Notion"**
   - Verify Notion integration token
   - Check database ID
   - Ensure database has correct properties
   - Verify integration has access to database

3. **"No priorities found"**
   - Create some thoughts first
   - Check Notion database health formula
   - Verify database properties match expected names

### Server Logs
Monitor server logs for detailed error information:
```bash
cd server && npm run dev
```

### Extension Logs
View Raycast extension logs in Raycast Developer Tools.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details. 