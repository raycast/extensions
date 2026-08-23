# GitHub

Work with issues, pull requests, manage workflows, search repositories and stay on top of notifications.

## Configuring a Personal Access Token

You can use a personal access token instead of logging in through OAuth to authenticate your GitHub account:

The following link can be used as a shortcut to create your token:
<https://github.com/settings/tokens/new?description=Raycast&scopes=repo,read:org,read:user,project,notifications>

Otherwise, you can manually create it:

1. Go to <https://github.com/settings/tokens>
2. Click "Generate new token" then "Generate new token (classic)
3. Add a "Note" for the token.
4. Select the required scopes:

- `repo`
- `read:org`
- `read:user`
- `project`
- `notifications`

5. Click "Generate token".
6. Copy the token in the "GitHub Token" field in the extension's preferences.

## Cloning and Downloading Repositories

The extension provides two different ways to get repository files locally:

- **Clone and Open (Default Path)** runs `git clone` and opens the repository in your configured IDE. It uses:
  `<Default Clone Path>/<repository-name>`.
- **Clone with Options (Choose Path)** also runs `git clone`, but lets you choose or override the destination for that clone.
- **Download as ZIP** downloads an archive of a repository or directory. It does not create a Git repository and does not use the Default Clone Path.

To clone a repository:

1. Set **Default Clone Path** and **IDE Application** in the extension preferences if you want to use **Clone and Open (Default Path)**.
2. Open **Search Repositories** and select a repository.
3. Open the Action Panel (`⌘K`) and choose **Clone and Open (Default Path)** or **Clone with Options (Choose Path)**.

The **Default Clone Path** preference applies only to these extension clone actions. It is not used by **Download as ZIP** or by a natural-language request to the GitHub AI assistant; those flows may use their own destination or working directory.

## Menu Bar Commands

This extension ships three independent Menu Bar Commands. They can be enabled together or in any combination depending on what you want at a glance from your menu bar.

- **My GitHub Stats Menu Bar** — A profile-centric overview: followers, stars received, organizations, API rate limit, plus a small _Activity_ drill-down with the **5 most recently updated** PRs and issues you authored or have open. Optionally surfaces a _What's New_ section when one of your repositories receives new stars. Designed for users who want a single icon in the menu bar that summarises everything about _you_.
- **My Pull Requests Menu Bar** — An inbox-style command focused on Pull Requests: configurable sections for assigned / mentioned / reviewed / review-requested / drafts, repository filtering, sortable list, and CI status icons (draft, merge-queue, success, failure, pending). Use this if you want a dedicated PR triage surface.
- **My Issues Menu Bar** — The Issue counterpart of _My Pull Requests Menu Bar_: dedicated sections for created / assigned / mentioned / recently closed, repository filtering, sortable. Use this if you want a dedicated Issue triage surface.

The activity drill-down in _My GitHub Stats Menu Bar_ is intentionally a thin convenience — it shows just the 5 most recently updated items per category, with no filters or sorting, so users who keep only that single command enabled still have one-click access to their latest work. For a richer, more configurable PR or Issue workflow, enable the dedicated _My Pull Requests Menu Bar_ or _My Issues Menu Bar_ alongside it.

## Commands Disabled by Default

For simplicity, some commands are disabled by default. To use them, you can enable them in the extension's settings. These include:

- `Create Branch`
- `My Discussions`
- `Search Discussions`

## FAQ

### Can I use my GitHub pull request or issue template?

Yes! Templates for pull requests and issues are supported as long as they are in the `.github` directory.

### Why can't I see my GitHub organization?

Double-check that you have enabled the correct settings for your organizations on the [GitHub Oauth page](https://github.com/settings/connections/applications/7235fe8d42157f1f38c0) to ensure that Raycast is able to show you the data from those repositories.
