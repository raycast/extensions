# Raycast Jira Search

This [Raycast](https://raycast.com) extension lets you quickly find Jira issues, projects, boards and filters.

![screencast](assets/screencast.gif)

## Features

- Find issues by text and project and type, where the text search is much more tolerant than the one built in to Raycast.
  - Filter issues by project using `@project` syntax.
  - Filter issue by type using `#issueType` syntax.
  - For example enter `pdf export @dev @it #bug #story` to find all issues which contain words starting with "pdf" and "export" and which are in the "DEV" or "IT" project and which are of type "Bug" or "Story."
  - Find issue directly by issue key (for example `DEV-1234`).
- Find projects by title.
- Find boards by title.
- Find filters by title.
- Use the following actions on found entities:
  - Open in browser
  - Copy URL
  - Copy markdown link
  - Copy HTML link

**Note:** This extension does not provide an issue preview or issue editing like the built-in extension – it is totally focused on quickly opening Jira entities in your browser.

## Setup

To connect the extension to your Jira instance you need to fill the following prefernces:

- **Jira Domain:** The domain of your Jira cloud instance like `mycompany.atlassian.net`.
- **User Name:** Your Jira user name – mostly your e-mail address.
- **API Token:** An API token created as described in [Manage API tokens for your Atlassian account](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/).
