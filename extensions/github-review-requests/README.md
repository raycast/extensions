<div align="center">
  <img src="https://user-images.githubusercontent.com/6590356/140933922-60d05339-397b-40ec-ac42-a82628cbb9f4.png" width="50" />
  <h1>GitHub Review Requests</h1>
  <p>🚀 Stay on top of PR notifications to boost your working efficiency.</p>
</div>

## Key Features

We provide a work mode version rather than a general-use extension that only focuses on managing your PRs for your workspace.

PRs will be divided into 4 categories:

- Wait For Merge - Your PRs that have been approved by reviewers. This reminds you to take the next action (e.g., merge the code and deploy).
- Wait For Change - Your PRs that have been explicitly requested changes. You probably need to take some time to digest the comments and find a way to resolve them.
- Wait For Review - Your PRs are still waiting for reviewers to decide.
- New Request Review - **Other's** PRs that you haven't reviewed. Don't keep someone hanging for a long time.

<div align="center">
  <img src="https://github.com/raycast/extensions/assets/37981444/1c0424fa-a9bf-45fe-91b0-4f371b427a5c" width="300" />
</div>

## Getting Started

### Step 1: Create GitHub Personal Access Token

In Raycast, we need to use this token to authenticate your GitHub account:

1. Go to https://github.com/settings/tokens.
2. Click "Generate new token" then "Generate new token (classic).
3. Add a "Note" for the token (e.g., "Raycast GitHub Extension").
4. Select the required scopes:

- `repo`
- `read:org`
- `read:user`
- `read:email`
- `project`

5. Click "Generate token". Don't forgot to save the token into your personal password vault!
6. Copy the token in the "GitHub Token" field in the extension's preferences.

### (Optional) Step 2: Update Extension Preferences

Sometimes, you might only want to focus on specific organization/owner of PRs. For instance, you want to check PRs from your workspace hourly.

This is our moment to shine! Enter your organization/owner in the extension's preferences, separating them with commas if you have many.
