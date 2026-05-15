# Gitea

Check your notifications, explore repositories, and manage issues and pull requests.

## Configuration

You need to configure your personal access token and server URL to use this extension.

### Configuring a Personal Access Token and Server URL

1. Go to your Gitea Server (e.g. https://gitea.com).
2. Open your user settings.
3. Click "Applications".
4. Add a token name and select the scopes you want (recommended scopes below).
5. Click "Generate token".
6. Copy the token and paste it into the "Access Token" field.
7. Add your server url to the "Gitea URL" field.

### Forgejo Support

This extension is designed for Gitea but may be used with [Forgejo](https://forgejo.org/), a fork of Gitea. However, note that:

- This extension is not officially tested or supported with Forgejo
- Some features may not work as expected
- Bug fixes and compatibility updates are not guaranteed

### Recommended Scopes

To use this extension to its fullest potential, you need to set following scopes while creating your access token:

| Scope        | Permissions    |
| ------------ | -------------- |
| issue        | read and write |
| organization | read           |
| notification | read and write |
| repository   | read and write |
| user         | read and write |

## Commands

### My Issues

View issues across all your repositories. Shows issues created by you, assigned to you, or mentioning you.

**Features:**

- **Category Filter**: Use the dropdown to filter by All, Created, Assigned, or Mentioned issues
- **Search**: Type in the search bar to filter issues by text
- **Actions on Issues**:
  - Open issue in browser (↵)
  - Copy issue URL (⌘C)
  - Copy issue number
  - Create new issue in the same repository (⌘N)

**Command Preferences:**

- Choose which categories to display by default (Created, Assigned, Mentioned)
- Option to include recently closed issues

### My Pull Requests

View pull requests across all your repositories. Shows PRs created by you, assigned to you, mentioning you, or requesting your review.

**Features:**

- **Category Filter**: Use the dropdown to filter by All, Created, Assigned, Mentioned, Review Requested, or Reviewed
- **Search**: Type in the search bar to filter PRs by text
- **Smart Sorting**: Automatically sorts by state (open first) and then by update time
- **Actions on PRs**:
  - Open PR in browser (↵)
  - Copy PR URL (⌘C)
  - Copy PR number
  - Create new issue in the same repository (⌘N)

**Command Preferences:**

- Choose which categories to display by default
- Option to include recently closed PRs

### Search Issues

Search issues across all repositories you have access to (not just your own).

**Features:**

- **State Filter**: Use the dropdown to filter by Open, Closed, or All issues
- **Search Syntax**: Use special keywords in your search query:
  - `repo:owner/name` - Filter to a specific repository (e.g., `repo:gitea/gitea`)
  - `owner:username` - Filter to repositories owned by a user/organization
  - Regular text searches across issue titles and content
- **Examples:**
  - `bug repo:myorg/project` - Search for "bug" in the myorg/project repository
  - `owner:gitea feature request` - Search for "feature request" in all gitea-owned repositories
- **Actions**: Same as "My Issues" command

### Create Issue

Create a new issue in any repository you have access to.

**Features:**

- **Repository Selection**: Choose from a dropdown of all your repositories
- **Issue Details**:
  - Title (required)
  - Description/body (supports Markdown)
  - Labels (select multiple)
  - Assignees (select multiple users)
  - Milestone
  - Due date
- **Smart Labels**: Exclusive labels (with `/` prefix) are shown as separate dropdowns
- Can be launched from other commands with a pre-selected repository

### Notifications

View and manage your Gitea notifications.

**Features:**

- **Filter**: Toggle between Unread and All notifications
- **Pinning**: Pin important notifications to keep them at the top
- **Sections**: Pinned notifications appear in their own section above regular notifications
- **Actions**:
  - Open notification in browser (↵)
  - Copy notification URL (⌘C)
  - Mark as read/unread (⌘⇧R)
  - Mark all notifications as read
  - Pin/unpin notification (⌘⇧P)

### Notifications (Menu Bar)

Shows your unread notification count in the menu bar with quick access to recent notifications.

**Features:**

- Displays unread count badge
- Shows up to 20 most recent notifications
- Click to open notification directly
- Mark all as read from menu bar
- Open full Notifications command
- Updates every minute automatically

### My Repositories

Browse your personal repositories.

**Features:**

- **Sorting Options**: Use dropdown to sort by:
  - Recently Updated (default)
  - Least Recently Updated
  - Most Stars
  - Fewest Stars
  - Newest
  - Oldest
- **Dynamic Accessories**: List shows relevant info based on sort (stars count, creation date, update date)
- **Details View**: Press ⌘⇧D to toggle detailed repository information showing:
  - Full name and description
  - Owner information with avatar
  - Primary language
  - Stars, forks, issues, and watchers count
  - Creation and update dates
  - Repository status (Private, Archived, Fork)
  - Topics/tags
  - Website link if available
- **Actions**:
  - Open repository in browser (↵)
  - Clone with editor (VS Code, Cursor, Zed, IntelliJ, WebStorm, PyCharm) - ⌘⇧C for first editor
  - Copy repository URL (⌘C)
  - Copy SSH URL (⌘⇧S)
  - Create issue in repository (⌘N)
  - Toggle details view (⌘⇧D)

**Extension Preferences:**

- Choose which editors to show in clone actions

### Explore Repositories

Discover public repositories on your Gitea instance.

**Features:**

- Same sorting options as "My Repositories"
- Same details view and actions
- Shows all public repositories you have access to browse
- Pagination support for browsing large numbers of repositories

### Search Organizations

Browse organizations on your Gitea instance.

**Features:**

- Search organizations by name
- Shows organization avatar, description, and visibility status
- **Actions**:
  - Open organization page in browser (↵)
  - Copy organization URL
  - Copy organization name

## Keyboard Shortcuts

Common shortcuts across commands:

| Action            | macOS | Windows      |
| ----------------- | ----- | ------------ |
| Open in browser   | ↵     | ↵            |
| Copy URL          | ⌘C    | Ctrl+C       |
| Create new issue  | ⌘N    | Ctrl+N       |
| Toggle details    | ⌘⇧D   | Ctrl+Shift+D |
| Mark as read      | ⌘⇧R   | Ctrl+Shift+R |
| Pin/unpin         | ⌘⇧P   | Ctrl+Shift+P |
| Copy SSH URL      | ⌘⇧S   | Ctrl+Shift+S |
| Clone with editor | ⌘⇧C   | Ctrl+Shift+C |
