# Moonbeam - Lunatask Quick Add

A Raycast extension for quickly adding tasks, notes, and relationships to Lunatask.

## Setup

1. Get your Lunatask API token:
   - Go to [Lunatask Settings](https://app.lunatask.app/settings)
   - Navigate to the "API" section
   - Generate a new API token

2. Get your Area ID:
   - Open Lunatask
   - Go to the area where you want tasks to be created
   - Copy the ID from the URL (it's the last part of the URL)

3. Get your Notebook ID:
   - Open Lunatask
   - Go to the notebook where you want notes to be created
   - Copy the ID from the URL (it's the last part of the URL)

4. Configure the extension:
   - Open Raycast Preferences
   - Go to Extensions → Moonbeam
   - Enter your API token, Area ID, and Notebook ID

## Commands

### Add Task
Quickly add a task to Lunatask with natural language date parsing.

Examples:
- "Clear inbox tomorrow"
- "Call mom on Friday"
- "Pay bills on 15th of April"

### Add Note
Create a new note in your configured notebook.

Features:
- Markdown support
- Automatic date setting
- Title and content fields

### Add Relationship
Add a new person to your relationships.

Features:
- Set relationship strength
- Add contact information
- Set birthday

### Manage Habits
Track and manage your habits.

Features:
- View all configured habits
- Mark habits as completed
- Add new habits
- Remove habits

## Support

If you encounter any issues or have suggestions, please [open an issue](https://github.com/afroviking/moonbeam/issues) on GitHub.