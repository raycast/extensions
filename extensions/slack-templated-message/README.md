# Slack Templated Message

A Raycast Extension for sending messages to Slack channels using customizable templates.

## Features

- 📝 Create and manage message templates
- 💬 Send messages to Slack channels
- 🧵 Thread reply support
- 📤 Import/Export templates

## Setup

1. Install this extension from Raycast
2. The extension uses OAuth for Slack authentication - click "Connect Slack" when prompted on first run

## Usage

### Creating Templates

1. Open Raycast and run `Create Slack Template`
2. Enter template name (e.g., `Daily Report`)
3. Enter message content with available variables:
   - `{date}` - Current date (YYYY-MM-DD)
   - `{time}` - Current time (HH:MM)
   - `{user}` - Your Slack username
4. Select destination channel
5. Optionally set thread_ts to reply in a specific thread
6. Save the template

### Sending Messages

1. Open Raycast and run `Send Slack Message`
2. Select a template to use
3. The message will be sent to the pre-configured channel with the variables automatically replaced
4. Press `⌘ + E` to edit or `⌃ + X` to delete the selected template

### Template Management

#### Export

1. Run `Export Templates`
2. Templates will be exported to `~/Downloads/slack-templates.json`

#### Import

1. Run `Import Templates`
2. Select previously exported JSON file
3. Templates will be merged with existing ones
