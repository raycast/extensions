# Slack

This Raycast extension is the perfect companion for Slack users. It allows you to:

- Quickly open Slack channels
- Search for messages
- See unread messages,
- Snooze notifications
- Set your presence status
- Set your status

## Set your status from a deep link

The **Set Status** command accepts two optional arguments, `statusText` and `emoji`, so you can build a deep link (or a [Quicklink](https://manual.raycast.com/quicklinks)) that sets your status in one step:

```
raycast://extensions/mommertf/slack/set-status?arguments=%7B%22statusText%22%3A%22Lunch%22%2C%22emoji%22%3A%22%3Ahamburger%3A%22%7D
```

The `arguments` query parameter is a URL-encoded JSON object, for example:

```json
{ "statusText": "Lunch", "emoji": ":hamburger:" }
```

- Either argument may be omitted; only the one you provide is changed.
- `emoji` accepts a Slack emoji name with or without colons (`hamburger` or `:hamburger:`).

Statuses set this way don't auto-expire. To pick an expiration, open the command and use the **Set New Status** form.

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

         # Command: Unread Messages (optional - needed for marking conversations as read)
         # AI Tool: Send Message (needed to open a DM from a user ID)
         - im:write
         - mpim:write

         # Command: Set Presence
         - users:write

         # Command: Set Snooze
         - dnd:read
         - dnd:write

         # Command & AI Tool: Send Message
         - chat:write

         # AI Tool: Upload Files
         - files:write

         # Command: Search Emojis
         - emoji:read

         # AI Tool: Add Reaction
         - reactions:write

         # Command: Set Status
         - users.profile:write
         - users.profile:read

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

## Slack API rate limits

Slack applies Web API rate limits **per API method, per workspace, per app**, using one-minute windows. The published tier number is a guaranteed floor rather than a fixed maximum; Slack allows some bursts and may change the exact allowance. Signing in again or clearing Raycast's extension cache does not reset these workspace-level app limits.

The limits most relevant to this extension are:

| Extension operation                     | Slack method                                                                         | Published limit                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Search workspace members                | [`users.list`](https://docs.slack.dev/reference/methods/users.list/)                 | Tier 2: 20+ requests per minute                                                  |
| Search channels and group conversations | [`conversations.list`](https://docs.slack.dev/reference/methods/conversations.list/) | Tier 2: 20+ requests per minute                                                  |
| Search messages                         | [`search.messages`](https://docs.slack.dev/reference/methods/search.messages/)       | Tier 2: 20+ requests per minute                                                  |
| Send messages                           | [`chat.postMessage`](https://docs.slack.dev/reference/methods/chat.postMessage/)     | Special: generally 1 message per second per channel, plus a workspace-wide limit |

`users.list` and `conversations.list` are cursor-paginated, and every page is another request against that method's rate limit. Normal directory loading uses Slack's recommended 200-item page size. A focused directory search can request up to 999 items per transient page (Slack requires the value to remain below 1,000), immediately discarding the full API page after retaining only compact matches. This reduces request pressure in very large workspaces without rebuilding the previous unbounded in-memory directory.

When a limit is exceeded, Slack responds with HTTP `429` and a `Retry-After` header containing the number of seconds to wait. The extension shows that delay in Raycast, pauses the affected Slack API request, and retries it automatically. Calls to other Slack API methods can continue because each method has its own rate-limit bucket. See [Slack's rate-limit overview](https://docs.slack.dev/apis/web-api/rate-limits/) for the full tier definitions and current policy.
