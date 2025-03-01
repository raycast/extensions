# Motion for Raycast

A Raycast extension for interacting with Motion, the AI-powered productivity tool.

## Features

- **Add Tasks Quickly**: Add tasks to Motion directly from Raycast, including title, description, due date, priority, status, and tags.
- **Query Your Motion Data**: Ask questions about your tasks and schedule using AI, directly within Raycast.

## Setup

1. Install the extension from the Raycast store.
2. Set up your Motion API credentials:
   - Get your API key from Motion's developer settings
   - Find your User ID in your Motion account
   - Add these to the extension preferences in Raycast

## Commands

### Add Task

Quickly add a new task to Motion with all the metadata:
- Title
- Description
- Due Date
- Priority (Low, Medium, High, Urgent)
- Status (To Do, In Progress, Done)
- Tags

### Query Motion

Ask questions about your Motion tasks and schedule using AI:
- "When are my upcoming deadlines?"
- "What high priority tasks do I have this week?"
- "How many tasks are in progress?"
- "What tasks are tagged as 'important'?"

## Development

This extension is built using the Raycast Extension API and React.

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```