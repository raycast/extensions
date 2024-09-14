# Gitea Raycast Extension

**Gitea Raycast Extension** allows you to seamlessly manage your [Gitea](https://gitea.io) instance directly from Raycast. This extension is designed to enhance productivity for developers by providing quick and easy access to various Gitea operations such as searching issues, managing pull requests, and exploring repositories.

## Features

This extension offers the following commands to help you manage your Gitea instance:

- **Create Issue**: Quickly create an issue in any repository.
- **Search Issues**: Search through issues across your Gitea repositories.
- **Search Assigned Issues**: View issues that are assigned to you.
- **Search Pull Requests**: Search and browse through open and closed pull requests.
- **Search Assigned Pull Requests**: Find pull requests that are specifically assigned to you.
- **Search Review Requested Pull Requests**: Locate pull requests that are awaiting your review.
- **Search Repositories**: Easily search through repositories in your Gitea instance.
- **Search Packages**: Search for packages in your Gitea instance.
- **Search Organizations**: Find organizations within your Gitea instance.

## Configuration

You will need to configure the extension before using it. The following preferences can be set:

1. **Instance URL** (Required): The URL of your Gitea instance.
2. **Access Token** (Required): Your Gitea access token, which you can generate from `/user/settings/applications`.
    - Issue -> Read and Write
    - Organization -> Read
    - Package -> Read
    - Repository -> Read
3. **Default Organization** (Optional): The default organization to use when performing searches without all organizations option.
4. **Default Issue State** (Optional): Set the default state for issues when searching (Options: All, Open, Closed).
5. **Default Pull Request State** (Optional): Set the default state for pull requests when searching (Options: All, Open, Closed).
