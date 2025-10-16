# JIRA Ticket to Rich Text Converter

This Raycast extension fetches JIRA ticket details and converts them into formatted rich text links for pasting into Microsoft Teams.

## Setup

### Configure JIRA Credentials

Before using the JIRA ticket converter, you need to configure your JIRA credentials in Raycast preferences:

1. Open Raycast preferences
2. Navigate to Extensions → JIRA Ticket to Rich Text Converter
3. Fill in the following fields:
   - **JIRA Base URL**: Your JIRA instance URL (e.g., `https://yourcompany.atlassian.net`)
   - **JIRA Username**: Your JIRA email address
   - **JIRA API Token**: Your JIRA API token ([create one here](https://id.atlassian.com/manage/api-tokens))
   - **JIRA Project Key**: Your project prefix (e.g., `SO` for tickets like SO-123)

## Usage

1. **Run the Command**: Search for "Convert JIRA Ticket to Rich Text" in Raycast
2. **Enter Ticket Number**: Type just the number (e.g., `123` for ticket SO-123)
3. **Submit**: Press Enter
4. **Automatic Paste**: The formatted rich text link will be copied and pasted into your current application
