# Raycast Jira Search (Self-Hosted Edition)

This [Raycast](https://raycast.com) extension lets you quickly find Jira issues, projects, and boards. This version is forked from the JIRA
search extension built by sven to work with JIRA server instances.

![screencast](media/screencast.gif)

## Features

- Find issues by text and project and type, where the text search is much more tolerant than the one built in to Raycast.
  - Filter issues by project using `@project` syntax.
  - Filter issue by type using `#issueType` syntax.
  - Filter issue by status using `!status` or `!"my fancy status"` (use double quotes if status contains spaces) syntax.
  - Filter issue by assignee using `%email` or `%"full name"` (use double quotes if assignee contains spaces) syntax.
  - Configure default include and exclude filters for projects, statuses, issue types, and assignees in extension preferences.
    - If both include and exclude defaults are set for the same field, include defaults take precedence.
    - If you type a filter in the search box, it overrides the configured defaults for that field.
  - For example enter `pdf export @dev @it #bug #story` to find all issues which contain words starting with "pdf" and "export" and which are in the "DEV" or "IT" project and which are of type "Bug" or "Story."
  - Find issue directly by issue key (for example `DEV-1234`).
- Find projects by title.
- Find boards by title.
- Use the following actions on found entities:
  - Open in browser
  - Copy URL
  - Copy markdown link
  - Copy HTML link

**Note:** This extension does not provide an issue preview or issue editing like the built-in extension – it is totally focused on quickly opening Jira entities in your browser.

## Setup

To connect the extension to your Jira instance you need to fill the following preferences:

- **Jira Domain:** The domain of your Jira instance like `mycompany.atlassian.net` or with a base URL like `mycompany.atlassian.net/baseUrl/jira`.
- **Personal Access Token:** A personal access token created as described in [Using Personal Access Tokens](https://confluence.atlassian.com/enterprise/using-personal-access-tokens-1026032365.html).
- **Default Filters:** Optional comma-separated include and exclude defaults for projects, statuses, issue types, and assignees.

### Unsafe HTTPS

If you JIRA instance uses a self-signed certificate, you can enable Unsafe HTTPS in the extension settings to stop network errors from occurring.

### Default Filters

- Defaults are applied to `Search Issues` and `Open Issues`.
- `Open Issues` always uses the current user as assignee and ignores assignee defaults.
- Include defaults override exclude defaults when both are configured for the same field.
- Typed filters such as `@project`, `#issueType`, `!status`, and `%assignee` override defaults for that field.
