# Hack Club Ship

Ship your projects to the Hack Club Slack directly from Raycast!

Inspired by [Caleb's Hack Club ship CLI!](https://github.com/cjdenio/hackclub-ship)

## This extension requires a Slack Access Token to work!

### Alright cool. How do I get a Slack Access Token?

1. Open https://api.slack.com/apps
2. Click "Create New App" button
3. Select "From an app manifest"
4. Select the Hack Club Slack workspace
5. Select JSON format on manifest editor page and paste this in:

```
{
    "display_information": {
        "name": "Raycast ship"
    },
    "oauth_config": {
        "scopes": {
            "user": [
                "files:write",
                "chat:write",
                "links:write",
                "links.embed:write"
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

When you open the extension for the first time, you'll be prompted to enter in your Slack Access Token. Once you do that, you'll be able to start shipping your projects at lightning speed!