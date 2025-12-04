# Atlassian Data Center

A Raycast extension for Atlassian Data Center products to search and manage Confluence and Jira, with CQL/JQL syntax support.

## ⚙️ Setup Required

This extension integrates with your Atlassian applications using Personal Access Token (PAT), which are a secure way to authenticate external applications. [Learn more](https://confluence.atlassian.com/enterprise/using-personal-access-tokens-1026032365.html)

> [!IMPORTANT]
> Keep your Personal Access Token secure. If compromised, revoke it immediately.

On first use, you'll need to provide:

- **Confluence Base URL**: Base URL of your Confluence Data Center instance, e.g. `https://confluence.example.com`
- **Confluence PAT**: Create it from Confluence → Profile → Personal Access Tokens → Create token
- **Jira Base URL**: Base URL of your Jira Data Center instance, e.g. `https://jira.example.com`
- **Jira PAT**: Create it from Jira → Profile → Personal Access Tokens → Create token

## ✨ Features

### 📚 Confluence

- **Search Contents** - Search Confluence contents, including pages, blog posts, comments, and attachments
- **Search Spaces** - Search Confluence spaces
- **Search Users** - Search Confluence users
- **CQL Support** - Use [Confluence Query Language](https://developer.atlassian.com/server/confluence/rest/v1020/intro/#advanced-searching-using-cql) for advanced searches
- **Common Filters** - Viewed Recently, Created by Me, Contributed by Me, Mentions Me, My Favourites, Watched by Me

### 🐛 Jira

- **Search Issues** - Search Jira issues
- **Board View** - View Jira board
- **Worklog View** - View Jira worklog
- **Notification View** - View Jira notifications (requires [Notifications for Jira](https://marketplace.atlassian.com/apps/1217434/notifications-in-jira-desktop-and-icon-alerts) plugin on your Jira instance)
- **Manage Fields** - Manage custom fields for Jira issue search. Use "Add to Search" to include user-type custom fields in search results, which will display their values in the tooltip when searching issues
- **JQL Support** - Use [Jira Query Language](https://confluence.atlassian.com/jiracoreserver/advanced-searching-939937709.html) for complex searches
- **Common Filters** - My Open Issues, Open Issues, Assigned to Me, Reported by Me, Created Recently, Updated Recently, Resolved Recently, Viewed Recently, Watched by Me

## 🔧 Troubleshooting

- If pagination doesn't work properly, try increasing the pagination size to ensure results exceed the Raycast window height.

## 📄 License

MIT
