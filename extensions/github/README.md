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

## Commands Disabled by Default

For simplicity, some commands are disabled by default. To use them, you can enable them in the extension's settings. These include:

- `Create Branch`
- `My Discussions`
- `Search Discussions`

## FAQ

### Can I use my GitHub pull request or issue template?

Yes! Templates for pull requests and issues are supported as long as they are in the `.github` directory.

### Why can't I see my GitHub organization?

Double-check that you have enabled the correct settings for your organizations on the [GitHub Oauth page](https://github.com/settings/connections/applications/7235fe8d42157f1f38c0) to ensure that Raycast is able to show you the data from those repos.
