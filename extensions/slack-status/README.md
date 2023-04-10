# Slack Set Status

Extension for quickly changing your Slack status. Set up presets for common statuses or set a custom one. Make sure to explore available actions in the action panel (⌘ + K).

## How to Get Access Token

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
                "users.profile:read"
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

_Note: If this instruction wasn't clear, please let me know in [Slack Community](https://raycast.com/community) or feel free to create a PR with improved steps._
