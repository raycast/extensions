# Slack

This Raycast extension is the perfect companion for Slack users. It allows you to:

- Quickly open Slack channels
- Search for messages
- See unread messages,
- Snooze notifications
- Set your presence status
- Set your status

## How to get an access token?

If you don't want to log in through OAuth, you can use an access token instead. Here's how to get one:

1. Open https://api.slack.com/apps/
2. Click Button `Create New App`
3. Select `From an app manifest`
4. Select a workspace to which you want to grant the extension access.
5. Copy and paste the following manifest (Select `YAML`):
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

     # Command: Search
     - search:read

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

     # Command: Send Message
     - chat:write

     # Command: Search Emojis
     - emoji:read
   
     # Command: Set Status
     - users.profile:write
     - users.profile:read
   ```

settings:
org_deploy_enabled: false
socket_mode_enabled: false
token_rotation_enabled: false

```

6. Confirm creation of app
7. Press `Install to Workspace`
8. Get your personal access token from `Features -> OAuth & Permissions` (section `OAuth Tokens for Your Workspace`).
Your personal access token will start with `xoxp-`.

## Proxy Support

If you are behind a corporate proxy, you can configure the extension to route Slack API requests through it.

### Configuration

The proxy URL is resolved in the following order:

1. **Raycast preference** — set the "Proxy URL" field in the extension settings (e.g. `http://proxy.example.com:8080`)
2. **`HTTPS_PROXY` environment variable**
3. **`HTTP_PROXY` environment variable**

### Important Notes

- Proxy support applies to **Slack API calls only**. The OAuth login flow uses Raycast's built-in networking, which does not go through the configured proxy.
- If you are on a corporate network that blocks OAuth, use a **personal access token** instead (see above). Token-based authentication bypasses OAuth entirely and all subsequent API calls will use the proxy.
```
