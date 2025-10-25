# Notion Task Manager - Raycast Extension

Manage your Notion tasks with quick capture, status updates, and daily overviews directly from Raycast.

## Features

### 🎯 Nine Powerful Commands

**Core Commands:**
1. **Create Task (ct)** - Quickly capture new tasks with smart defaults
2. **Update Task (ut)** - Update status and properties of existing tasks
3. **Daily Overview (do)** - View your daily task summary with focus areas
4. **Search Tasks (st)** - Full-text search across all tasks
5. **Task Summary (Menu Bar)** - Pin your task summary to Raycast menu bar

**🤖 AI-Powered Commands:**
6. **Smart Task Creation** - Natural language task creation with AI suggestions
7. **Task Breakdown** - Break complex tasks into subtasks with AI
8. **Smart Prioritization** - Get AI-powered daily priority suggestions
9. **AI Task Summary** - Generate professional work summaries

### ✨ Key Features

**Productivity:**
- **Menu Bar Summary** - Pin your task summary to Raycast menu bar for instant access
- **Quick Task Capture** - Create tasks in seconds without leaving your workflow
- **Markdown/MDX Support** - Write descriptions in Markdown, automatically formatted in Notion
- **Rich Task Details** - Headings, lists, code blocks, todos, quotes - full Notion blocks
- **Smart Project Selection** - Dropdown lists all existing projects + add new ones easily
- **Custom Projects** - Create new projects on the fly without pre-configuration
- **Smart Defaults** - Auto-suggests priority based on due dates
- **Daily Overview** - See Today's Focus, In Progress, Blocked, Overdue, and Completed sections
- **Keyboard Shortcuts** - Navigate and manage tasks efficiently
- **Visual Indicators** - Priority icons, status colors, and progress indicators
- **Real-time Sync** - Direct integration with Notion API
- **Auto-refresh** - Menu bar updates every 5 minutes automatically

**🤖 AI Features (Optional):**
- **Natural Language Task Creation** - Describe tasks naturally, AI extracts details
- **Smart Task Breakdown** - Complex tasks → actionable subtasks automatically
- **AI Prioritization** - Get daily priority suggestions based on context
- **Natural Language Search** - "Find all blocked design tasks" → proper filters
- **Professional Summaries** - Generate standup reports and work summaries
- **Time Estimation** - AI suggests time based on task description

## Setup

### 1. Create a Notion Integration

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click **"+ New integration"**
3. Give it a name (e.g., "Raycast Task Manager")
4. Select the workspace where your tasks database lives
5. Click **Submit**
6. Copy the **Internal Integration Token** (starts with `secret_`)

### 2. Get Your Database ID

1. Open your Notion task database in a browser
2. The URL will look like: `https://www.notion.so/workspace/DATABASE_ID?v=...`
3. Copy the `DATABASE_ID` part (32 characters, no dashes)

### 3. Share Database with Integration

1. Open your Notion task database
2. Click **"..."** (three dots) in the top right
3. Select **"Add connections"**
4. Find and select your integration
5. Click **"Confirm"**

### 4. Configure Extension

1. Open Raycast
2. Search for "Create Task" or any Notion Task Manager command
3. You'll be prompted to enter:
   - **Notion API Key**: Paste your Internal Integration Token
   - **Notion Database ID**: Paste your database ID

### 5. (Optional) Enable AI Features

AI features work in two ways:

**Option 1: Raycast Pro (Recommended) ✨**
- If you have **Raycast Pro**, AI features work automatically!
- No API key needed
- Uses Raycast's built-in AI (GPT-4o-mini)
- Simple and secure

**Option 2: Bring Your Own OpenAI Key**
- Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- Open Raycast extension settings
- Add your **OpenAI API Key**
- AI commands will now work

**Note:** AI features are completely optional. The extension works great without them!

## Database Schema

Your Notion database should have these properties:

| Property | Type | Options |
|----------|------|---------|
| Name | Title | - |
| Status | Status | Backlog, To-do, Blocked, In progress, Done |
| Priority | Select | Critical, High, Medium, Low |
| Due Date | Date | - |
| Planned | Date | - |
| Project | Select | Any custom name (automatically creates new options) |
| Tags | Multi-select | Design, Development, Research, etc. |
| Estimated Time | Select | 15 min, 30 min, 1 hour, 2 hours, etc. |
| Energy Level | Select | High Energy, Medium Energy, Low Energy |
| Progress | Select | 0%, 25%, 50%, 75%, 100% |
| Urgency | Select | Urgent, Not Urgent |
| Importance | Select | Important, Not Important |
| Link | URL | - |
| Blocked by | Relation | - |

**Note:** When you create a task, the description field is parsed as Markdown and converted to proper Notion blocks (headings, lists, code, etc.) in the page content. You can open the task in Notion to see the beautifully formatted content.

## Usage

### Create Task

1. Open Raycast and type `ct` or "Create Task"
2. Enter task details:
   - **Task Name** (required)
   - **Description** (optional) - Write in **Markdown/MDX** and it becomes beautifully formatted in Notion
   - **Project** (dropdown) - Select from existing projects or choose "➕ Add New Project"
   - **New Project Name** (shown when adding new) - Type the name for your new project
   - Status (defaults to "To-do")
   - Priority, Due Date, Tags
   - Estimated Time, Energy Level
3. Press `Enter` to create

**✨ Markdown Support in Description:**
The description field supports full Markdown formatting:
- **Headings**: `# H1`, `## H2`, `### H3`
- **Bold**: `**bold text**`
- **Italic**: `*italic text*`
- **Strikethrough**: `~~strikethrough~~`
- **Code**: `` `inline code` ``
- **Code Blocks**: ` ```language ... ``` `
- **Lists**: `- bullet` or `1. numbered`
- **Todos**: `- [ ] unchecked` or `- [x] checked`
- **Quotes**: `> quote text`
- **Links**: `[text](url)`
- **Dividers**: `---` or `***`

All markdown is automatically converted to proper Notion blocks!

**💡 Project Selection:**
- The dropdown shows all existing projects from your Notion database
- Select "➕ Add New Project" to create a custom project
- The "New Project Name" field appears only when you select "➕ Add New Project"
- Type your new project name and it will be automatically created in Notion
- New projects become available for all future tasks

### Update Task

1. Open Raycast and type `ut` or "Update Task"
2. Search for the task you want to update
3. Select it and modify:
   - Status, Priority, Progress
   - Due Date, Planned Date
4. Press `Enter` to save

### Daily Overview

1. Open Raycast and type `do` or "Daily Overview"
2. View sections:
   - **📊 Daily Summary** - Overall stats
   - **🎯 Today's Focus** - Tasks due or planned today
   - **⏳ In Progress** - Currently active tasks
   - **🚫 Blocked** - Tasks with dependencies
   - **⚠️ Overdue** - Past due tasks
   - **✅ Completed Today** - Finished tasks

### Search Tasks

1. Open Raycast and type `st` or "Search Tasks"
2. Type to search by:
   - Task name
   - Project
   - Status
   - Tags
3. Tasks are grouped by status

### Task Summary (Menu Bar)

1. Open Raycast and search for "Task Summary"
2. Enable the menu bar extra
3. You'll see a summary in your menu bar showing:
   - **Completion count** (e.g., "3/8 ✓")
   - **Progress percentage**
   - **Today's Focus** count
   - **In Progress** count
   - **Blocked** count (if any)
   - **Overdue** count (if any)
   - **Completed Today** count

4. Click the menu bar icon to:
   - View detailed stats
   - Quick access to all commands
   - Create new tasks
   - Open daily overview
   - Refresh the summary

**Auto-updates:** The summary refreshes every 5 minutes automatically

## 🤖 AI Features (Optional)

AI-powered features work with **Raycast Pro** (recommended) or your own **OpenAI API key**.

### Smart Task Creation

1. Open Raycast and search for "Smart Task Creation"
2. Type your task in natural language:
   ```
   "Review design system by Friday for the website redesign project"
   ```
3. Press `⌘ + P` to parse with AI
4. AI suggests:
   - Task name: "Review design system"
   - Project: "Website redesign"
   - Priority: High
   - Due date: Friday
   - Tags: Design, Review
   - Estimated time: 2 hours
5. Review and adjust suggestions
6. Press `Enter` to create

**Example queries:**
- "Fix critical bug in payment flow ASAP" → Critical priority, Bug tag
- "Meeting with design team tomorrow at 2pm" → Meeting tag, due date set
- "Research competitor features for 4 hours" → Research tag, 4 hours estimate

### Task Breakdown

1. Open Raycast and search for "Task Breakdown"
2. Enter a complex task: "Build landing page for product launch"
3. (Optional) Add context in the description
4. AI generates subtasks like:
   - Design wireframes and mockups
   - Develop HTML/CSS structure  
   - Add responsive behavior
   - Integrate CTA forms
   - Test across devices
   - Deploy to production
5. Select which subtasks to create
6. Press `⌘ + Enter` to create them in Notion

### Smart Prioritization

1. Open Raycast and search for "Smart Prioritization"
2. AI analyzes your tasks and suggests top 5 priorities
3. See AI reasoning for each suggestion
4. Quick actions:
   - `⌘ + S` - Start working (mark as In Progress)
   - `⌘ + D` - Mark as Done
   - Open in Notion for details

**AI considers:**
- Due dates (urgent = due today or overdue)
- Priority levels
- Energy requirements
- Time estimates
- Task dependencies

### Natural Language Search (Enhanced Search)

1. Open "Search Tasks" command
2. Type natural language queries:
   - "Find all blocked design tasks"
   - "Show high priority bugs"
   - "Development tasks in progress"
3. Press `⌘ + K` for AI search
4. AI interprets and applies proper filters automatically

### AI Task Summary

1. Open Raycast and search for "AI Task Summary"
2. Select options:
   - **Period**: Today, This Week, This Month
   - **Format**: Standup, Detailed Report, or Bullet Points
3. AI generates professional summary
4. Copy to clipboard for:
   - Daily standups
   - Weekly reports
   - Performance reviews
   - Client updates

**Example Standup Output:**
```
Yesterday:
- Completed design system review for website redesign
- Fixed critical payment bug affecting checkout flow
- Met with design team to align on Q1 roadmap

Today:
- Implement responsive landing page
- Review pull requests for authentication feature
- Plan sprint retrospective

Blockers:
- None currently
```

## Keyboard Shortcuts

### General
- `Enter` - Select/Confirm
- `⌘ + D` - Mark as Done
- `⌘ + O` - Open in Notion
- `⌘ + R` - Refresh
- `⌘ + C` - Copy task URL (in Search)
- `Esc` - Cancel/Go back

### Menu Bar Shortcuts
- `⌘ + N` - Create New Task
- `⌘ + O` - View Daily Overview
- `⌘ + S` - Search Tasks
- `⌘ + ,` - Open Settings

### AI Features Shortcuts
- `⌘ + P` - Parse with AI (Smart Task Creation)
- `⌘ + K` - AI Search (Search Tasks)
- `⌘ + S` - Start Working (Smart Prioritization)
- `⌘ + Enter` - Create Selected Subtasks (Task Breakdown)

## Visual Indicators

### Priority
- 🔴 Critical
- 🟠 High
- 🟡 Medium
- ⚪ Low

### Status
- 📋 Backlog
- 📝 To-do
- 🚫 Blocked
- ⏳ In progress
- ✅ Done

### Other
- ⏱ Time estimate
- 🔋 Energy level
- 📅 Due date

## Troubleshooting

### "Unauthorized" Error
- Check your API key is correct
- Ensure the integration has access to your database
- Verify you've shared the database with your integration

### "Database not found"
- Verify your database ID is correct
- Make sure there are no extra spaces in the ID
- Check the database hasn't been deleted

### Tasks Not Showing
- Refresh the command (⌘ + R)
- Check your database has the correct properties
- Verify the property names match exactly (case-sensitive)

### AI Features Not Working
- **With Raycast Pro:** AI should work automatically. If not, try restarting Raycast.
- **With OpenAI API key:**
  - Verify your OpenAI API key is configured in extension settings
  - Check your OpenAI account has available credits
  - Ensure you're using a valid API key (starts with `sk-`)
- AI features are optional - all core features work without AI

### AI Responses Seem Off
- Try rephrasing your query more specifically
- Add more context in the description field
- AI works best with clear, descriptive language
- Remember: You can always manually adjust AI suggestions

## Development

```bash
# Install dependencies
npm install

# Start development mode
npm run dev

# Build extension
npm run build

# Lint code
npm run lint

# Fix linting issues
npm run fix-lint
```

## Support

If you encounter any issues or have suggestions:
1. Check the Troubleshooting section
2. Review your Notion integration settings
3. Verify database schema matches requirements

## License

MIT
