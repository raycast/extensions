# Slack Set Status

Extension for quickly changing your Slack status. Set up presets for common statuses or set a custom one. Make sure to explore available actions in the action panel (`⌘ + K`). And if you want to spice it up, use Raycast AI to set your status. Simply type what you are doing and hit return to let AI pick an emoji, title, and duration of your status.

## Automatic Setup

Simply open the extension and authenticate with OAuth to your workspace. Afterwards use the extension to quickly set your Slack status right from Raycast.

## Manual Setup

The extension supports OAuth, which makes it easy to connect to your Slack workspace. If you prefer a manual setup, follow those steps to create your own Slack app and use it's access token to access your Slack workspace.

1. Open https://api.slack.com/apps
2. Click "Create New App" button
3. Select "From an app manifest"
4. Select Workspace where you are going to use it
5. Select JSON format on manifest editor page and paste this code:

```
{
    "_metadata": {
        "major_version": 1,
        "minor_version": 1
    },
    "display_information": {
        "name": "Raycast - Set Slack Status"
    },
    "oauth_config": {
        "scopes": {
            "user": [
                "emoji:read",
                "users.profile:write",
                "users.profile:read",
                "dnd:write",
                "dnd:read"
            ]
        }
    },
    "settings": {
        "org_deploy_enabled": false,
        "socket_mode_enabled": false,
        "token_rotation_enabled": false
    }
}
```

6. Press "Next" and then "Create"
7. In the sidebar select "OAuth & Permissions"
8. Press "Install to Workspace" button in "OAuth Tokens for Your Workspace" section
9. Once installed, you'll be able to copy your access token. It starts with "xoxp-"

_Note: If this instruction wasn't clear, please reach out in our [Slack Community](https://raycast.com/community) or even better, create a PR to improve the steps._
