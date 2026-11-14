# Slack Accounts Status

Set a status across your connected Slack workspaces from Raycast for macOS. Choose a preset or enter custom text, an emoji shortcode, and an expiry. Set Away or Automatic presence and pause notifications independently.

The extension includes a Slack app for authorization. Open **Manage Slack Workspaces**, choose **Connect Workspace**, and authorize each workspace you want to use. Some workspaces require administrator approval. [Slack app approval](https://slack.com/help/articles/222386767-Manage-app-approval-for-your-workspace).

## 1. Use your own Slack app (optional)

Follow these steps only if you want to replace the included Slack app with your own.

**1.1** Open [Slack app management](https://api.slack.com/apps), choose **Create New App**, then **From a manifest**. Select your development workspace and paste the JSON from [slack-app-manifest.json](slack-app-manifest.json).

**1.2** Under **OAuth & Permissions**, confirm that PKCE and token rotation are enabled. The redirect URL must be exactly:

```text
raycast://oauth?package_name=Extension
```

Slack treats enabling PKCE as a one-way change. Use a new app rather than changing an existing integration. [Slack PKCE documentation](https://docs.slack.dev/authentication/using-pkce/).

**1.3** Confirm these **User Token Scopes** (not Bot Token Scopes):

| Permission            | Purpose                                           |
| --------------------- | ------------------------------------------------- |
| `users.profile:write` | Set or clear your status text, emoji, and expiry. |
| `users:write`         | Set manual Away or return to Automatic presence.  |
| `dnd:write`           | Start or end a notification pause.                |

The extension does not request message, channel, or conversation access.

**1.4** To connect workspaces beyond the app's development workspace, enable distribution under **Manage Distribution**. Slack may require additional app metadata or workspace administrator approval. [Slack OAuth setup](https://docs.slack.dev/authentication/installing-with-oauth/).

**1.5** Copy **Client ID** from **Basic Information**, then enter it in Raycast's extension preferences. Do not enter a client secret or access token.

## 2. Connect and apply a status

**2.1** Run **Manage Slack Workspaces**, choose **Connect Workspace**, and authorize your Slack user account. Repeat for each workspace. Slack does not grant API access merely because a workspace is open in its desktop app.

**2.2** Run **Set Slack Status**. **Quick Status** contains **Active**, **Away**, and **Clear Status**. **Presets** contains **Focused**, **In a Meeting**, **Commuting**, **At Lunch**, and **Custom Status**.

**2.3** Review status text, emoji shortcode (such as `:headphones:`), duration, presence, notifications, and selected workspaces. All connected workspaces are selected initially. Custom emoji must exist in every selected workspace.

**2.4** Choose **Apply Status**, or **Clear Status** when clearing. Review the result for each workspace and each change. **Retry Failed Changes** retries only failed operations, keeping the original expiry. Successful workspaces stay as they are. Updates use separate Slack requests and are not atomic across workspaces.

**2.5** To save settings without applying them, enter a **Preset Name** and choose **Save Preset**. Saved presets use relative durations and open a review form before applying. Workspace selection is not saved with a preset.

## 3. Understand expiry and presence

Slack handles status expiry and notification-pause expiry, including when Raycast is closed or the computer sleeps. Choose 30 minutes, 1 hour, 2 hours, local midnight, custom minutes, or a specific date and time. A status can also remain until cleared. Notification pauses require a finite duration and use whole minutes, so they can end up to one minute after status expiry.

Presence is separate and is **not timed**. Away stays set until you choose **Active** or change it in Slack. Active returns presence to Automatic so Slack can determine whether you're active or away. **Clear Status** removes text and emoji and leaves presence and notifications unchanged. **At Lunch** pauses notifications until the status expires and sets presence to Away until you change it.

[Slack presence and status](https://docs.slack.dev/apis/web-api/user-presence-and-status/) and [notification pauses](https://docs.slack.dev/reference/methods/dnd.setSnooze/) define these behaviors.

## 4. Connections and privacy

Access and refresh tokens stay in [Raycast's secure OAuth token storage](https://developers.raycast.com/api-reference/oauth), separately for each account. Local extension storage contains workspace/user names and identifiers, app client IDs, and saved presets. Requests go directly to Slack. The extension adds no telemetry service.

Expired access tokens refresh when you apply a status. Slack's PKCE refresh tokens expire after 30 days, so a connection left unused for too long can require authorization again. To refresh an older login label in Raycast Settings, choose **Reconnect Workspace** in **Manage Slack Workspaces** and authorize the same workspace and user.

If connecting or disconnecting fails, retry that action in **Manage Slack Workspaces**. Pending accounts remain visible there but cannot receive status updates.

Disconnecting removes local credentials and metadata. It leaves your Slack status unchanged and does not revoke the Slack app grant. Revoke the app through Slack's app settings if needed. Disconnect each account before changing Slack app configuration.
