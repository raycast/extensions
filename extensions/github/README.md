# GitHub

Work with issues, pull requests, manage workflows, search repositories and stay on top of notifications.

## Configuring a Personal Access Token

You can use a personal access token instead of logging in through OAuth to authenticate your GitHub account:

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" then "Generate new token (classic)
3. Add a "Note" for the token.
4. Select the required scopes:
  - `repo`
  - `read:org`
  - `read:user`
  - `read:project`
  - `notifications`
5. Click "Generate token".
6. Copy the token in the "GitHub Token" field in the extension's preferences.