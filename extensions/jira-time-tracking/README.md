# Jira Time Tracking

This extension helps you to quickly add time logs to specific issues. It supports both Jira Server and Jira Cloud users.

## Setup

To use this extension, you need to configure the following preferences:

- **Jira Instance Type**: Select whether you are using Jira Cloud or Jira Server.
- **Jira Domain**: The domain/site URL of your Jira instance, e.g., `company.atlassian.net`.
- **Jira Username**: Your Jira username.
- **API Token**: An API token created as described in [Manage API tokens for your Atlassian account](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/).
- **Custom JQL Query**: Enter a JQL query to filter issues dynamically (optional). Example: `assignee = currentUser() AND status = "In Progress"`.
- **Default Project Key**: The key of the project to be selected by default (optional). Example: `MYPROJECT`.
