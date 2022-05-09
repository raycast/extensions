# Slack

## How to get an access token?

1. Open https://api.slack.com/apps/
2. Click Button `Create New App`
3. Select `From an app manifest`
4. Select a workspace to which you want to grant the extension access.
5. Copy and paste the following manifest:  
   _Feel free to exclude permission scope groups - see comments - if you don't want to have the full experience of this extension._

    ```
    display_information:
      name: Raycast - Slack
    oauth_config:
      scopes:
        user:
          # Command: Search & Unread Messages & Set Presence
          - users:read

          # Command: Search & Unread Messages
          - channels:read
          - groups:read
          - im:read
          - mpim:read

          # Command: Unread Messages
          - channels:history
          - groups:history
          - im:history
          - mpim:history

          # Command: Unread Messages (optional - needed for marking conversations as read)
          - channels:write
          - groups:write
          - im:write
          - mpim:write

          # Command: Set Presence
          - users:write

          # Command: Set Snooze
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

## Validate your Slack API Token after extension updates

After extension updates in which new features were introduced you might be kindly asked for validating the permission scopes of your Slack API Token. If they differ from those scopes that are mentioned in this README your action is required: To get the extension running again you need to update the permission scopes of your existing Slack API Token or create a completely new Token by following the instructions above.
