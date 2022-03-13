# Slack

## How to get an access token?

1. Open https://api.slack.com/apps/
2. Click Button `Create New App`
3. Select `From an app manifest`
4. Select a workspace to which you want to grant the extension access.
5. Copy and paste the following manifest:

```
display_information:
  name: Raycast - Slack
oauth_config:
  scopes:
    user:
      - channels:read
      - groups:read
      - mpim:read
      - users.profile:read
      - users:read
      - users:write
      - dnd:read
      - dnd:write
settings:
  org_deploy_enabled: false
  socket_mode_enabled: false
  token_rotation_enabled: false
```

6. Confirm creation of app
7. Press `Install to Workspace`
8. Get your personal access token from `Features -> OAuth & Permissions` (section `OAuth Tokens for Your Workspace`).  
   Your personal access token will start with `xoxp-`.
