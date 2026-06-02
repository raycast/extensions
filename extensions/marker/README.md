# Marker for Raycast

Create, browse, and edit Marker timeline records from Raycast.

Marker for Raycast lets you capture markers and chapter markers without leaving Raycast. You can send moments to the latest active sub-session, choose a specific session and sub-session, review recent timeline history, and add markers to linked live Twitch channels.

## Setup

1. Open the Marker app.
2. Create or open your Marker account.
3. Go to the API or integrations settings in Marker.
4. Create a Raycast API token.
5. Copy the token and paste it into the **Marker API Token** preference in Raycast.

The extension chooses the correct Marker API environment from the token prefix automatically:

- `mkr_dev_` uses Marker development.
- `mkr_tf_` uses Marker TestFlight.
- `mkr_prod_` uses Marker production.

If you need help creating a token, visit [getmarker.app/contact](https://getmarker.app/contact).

## Required Scopes

Recommended token scopes:

- `sessions:read`
- `subsessions:read`
- `tags:read`
- `markers:read`
- `markers:write`
- `chapterMarkers:read`
- `chapterMarkers:write`

Creating sessions or sub-sessions from Raycast also requires the corresponding write scopes.

## Commands

- **Add Marker**: Add a marker with session, sub-session, tags, description, and offset controls.
- **Add Marker to Latest**: Quickly add a marker to the active or newest sub-session.
- **Add Chapter Marker**: Add a chapter marker with session, sub-session, tags, and offset controls.
- **Add Chapter Marker to Latest**: Quickly add a chapter marker to the active or newest sub-session.
- **Marker History**: Browse, edit, delete, copy, and insert timeline records by sub-session.
- **Twitch Marker**: Add Marker records to linked live Twitch channels.
- **Create Session**: Create a Marker session.
- **Create Sub-Session**: Create a Marker sub-session inside a selected session.

## Troubleshooting

- If Raycast says the token is missing or invalid, create a fresh Raycast token in Marker and paste it into the extension preferences.
- If sessions, sub-sessions, or tags are missing, refresh the command and confirm the token includes the recommended read scopes.
- If create actions fail, confirm the token includes the matching write scopes.
- If Twitch channels are missing, connect Twitch in Marker first, then refresh the Twitch Marker command.
