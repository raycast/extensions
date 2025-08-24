<div align="center">
    <img src="https://user-images.githubusercontent.com/6590356/140933922-60d05339-397b-40ec-ac42-a82628cbb9f4.png" width="50" />
    <h1>GitHub for Enterprise</h1>
    <p>Have your GitHub workflow at your fingertips.</p>
    <p>With the GitHub extension, you can deal with your issues and pull requests in a keyboard-driven way.</p>
</div>

## Create, view and manage issues

- View open issues
- Search through all issues (open and closed) with advanced filtering
- Create issues (with support for loading custom issue templates)
- Reopen issues
- Close issues
- View in the browser
- Copy issue number / url

## View and manage pull requests

- View open pull requests
- View all pull requests (open, closed, merged)
- Reopen pull requests
- Close pull requests
- Add reviews
- Merge pull requests (merge commit, squash, and rebase)
- View in the browser
- Copy pull request number / url

## Getting Started

This extension brings GitHub Enterprise support to Raycast through the use of GraphQL and personal access tokens. To get started, first:

- Login to your organization's GitHub instance (Eg. https://github.mycompany.com)
- Click on your avatar image in the right upper corner
- From the dropdown menu, click on `Settings`
- On the left-hand side, click on `Developer settings`.
- On the left-hand side, click on `Personal access tokens`.
- On this page, we'll create a new access token. Click on `Generate new token` in the upper-right.
- Leave a `note` for your token (Eg. `Raycast`). This will help you identify it in the future.
- You'll need to check the following boxes to ensure this extension can perform properly:
  - `repo`
  - `user`
  - `write:discussion`

  optional, if you want to use notifications command and menu bar icon
  - `read:org`
  - `read:project`

- Click `Generate token` and save this value somewhere. **You'll only be able to see this once**.

> Future updates to this extension will offer more functionality that may require additional scopes be defined in this token.

## Configuring the Extension

Launch the GitHub for Enterprise Raycast extension. You can select any command to get started.

When launching a command, you'll be presented with a configuration screen asking for three pieces of information:

- `GraphQL API` (Eg. https://github.mycompany.com/api/graphql)
- `Username`
- `Token`

![Configuration](https://user-images.githubusercontent.com/6590356/140934002-081ed77e-6fe2-4b5a-aadc-feb662db6407.png)

Once this information has been filled in, you should have access to manage your issues and pull requests.

### Unsafe HTTPS

In the event your GitHub enterprise server has a self-hosted certificate, this extension may not work right away. Try enabling "unsafe HTTPS" if
everything else looks correct.
