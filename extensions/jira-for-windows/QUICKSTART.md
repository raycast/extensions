# Quick Start Guide

Get started with the Jira Raycast Extension in 5 minutes!

## Step 1: Generate Your Jira API Token

1. Visit [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **"Create API token"**
3. Name it "Raycast Extension"
4. Click **"Create"** and copy the token immediately (you won't see it again!)

## Step 2: Find Your Jira Domain

Your Jira domain is the part before `.atlassian.net` in your Jira URL.

Example:
- If your Jira URL is `https://acme-corp.atlassian.net/`
- Your domain is: `acme-corp.atlassian.net`

## Step 3: Configure the Extension

1. Open Raycast
2. Go to Extensions (⌘ + ,)
3. Find "Jira" extension
4. Click on preferences/settings
5. Enter:
   - **Jira Domain**: `your-company.atlassian.net`
   - **Email**: Your Atlassian email address
   - **API Token**: Paste the token from Step 1

## Step 4: Test the Extension

### Create Your First Task

1. Open Raycast (Alt + Space or your configured hotkey)
2. Type "Create Task"
3. Fill in:
   - **Title**: "Test task from Raycast"
   - **Description**: "Testing the new Raycast extension"
   - **Project**: Select one of your projects
   - **Issue Type**: Usually "Task" or "Bug"
   - **Deadline**: "In 1 week"
   - **Priority**: Optional
   - **Labels**: Optional
4. Press Ctrl + Enter to create
5. Click "Open in Jira" in the success notification

### Review Your Tasks

1. Open Raycast (Alt + Space or your configured hotkey)
2. Type "Review Tasks"
3. See all your assigned tasks sorted by deadline
4. Try these actions:
   - Press Enter to open a task in Jira
   - Press Ctrl+D to mark a task as done
   - Press Ctrl+T to change the task status
   - Press Ctrl+R to refresh the list

## Troubleshooting

### Can't see any projects?
- Make sure your API token has the right permissions
- Verify your email is correct
- Check that you have access to at least one Jira project

### "Authentication failed" error?
- Double-check your API token (no extra spaces!)
- Verify your email address is correct
- Make sure the token hasn't been revoked

### Domain issues?
- Don't include `https://` in the domain
- Include `.atlassian.net` at the end
- Example: `acme.atlassian.net` (not `https://acme.atlassian.net`)

## Tips & Tricks

### Keyboard Shortcuts (Windows)
- **Ctrl + Enter**: Submit form / Create task
- **Enter**: Open task in Jira
- **Ctrl + D**: Mark task as done
- **Ctrl + T**: Change task status
- **Ctrl + R**: Refresh task list
- **Ctrl + C**: Copy issue key
- **Ctrl + Shift + C**: Copy issue URL

### Deadline Options
- **Today**: Creates task due today
- **Tomorrow**: Due tomorrow
- **In 1 week**: Due in 7 days (most common)
- **Custom**: Pick any date with the date picker

### Task Colors
- 🔴 **Red**: Overdue tasks
- 🟠 **Orange**: Due today
- 🟢 **Green**: Future tasks

## Next Steps

Now that you're set up:
1. Create tasks as ideas come up
2. Check your tasks daily with "Review Tasks"
3. Customize priorities and labels in Jira
4. Enjoy faster task management! 🚀

## Need Help?

- Check the [README.md](./README.md) for detailed documentation
- Review Jira API permissions in your Atlassian account
- Verify your API token hasn't expired
- Make sure you're using Jira Cloud (not Server/Data Center)

## Security Note

Your API token is stored securely in Raycast's preferences and is never shared. You can revoke it anytime from your Atlassian account settings.

