# Connect your Slack workspaces

Run **Manage Slack Workspaces** and choose **Connect Workspace** for each account. Use **Set Slack Status** to apply a status to selected workspaces. Your workspace may require administrator approval.

## Use your own Slack app (optional)

Create a new app at [Slack app management](https://api.slack.com/apps), choosing **From a manifest**. Select **JSON** and paste this manifest, then review and create the app:

```json
{
  "display_information": {
    "name": "Slack Accounts Status",
    "description": "Set your status, presence, and notification pause from Raycast.",
    "background_color": "#153c44"
  },
  "oauth_config": {
    "redirect_urls": ["raycast://oauth?package_name=Extension"],
    "scopes": {
      "user": ["users.profile:write", "users:write", "dnd:write"]
    },
    "pkce_enabled": true
  },
  "settings": {
    "org_deploy_enabled": false,
    "socket_mode_enabled": false,
    "token_rotation_enabled": true
  }
}
```

Enable PKCE and token rotation. Set the redirect URL to exactly `raycast://oauth?package_name=Extension`. Enabling PKCE changes an app permanently, so use a new app.

Add these **User Token Scopes**: `users.profile:write`, `users:write`, and `dnd:write`. Do not add bot scopes. Enable distribution to authorize workspaces beyond the app's development workspace. Your workspace may require administrator approval.

Copy the **Client ID** from **Basic Information** and enter it here. A client ID looks like `123456789.123456789`. Never enter a client secret or access token.

Status and notification pauses can expire. Away remains set until changed.
