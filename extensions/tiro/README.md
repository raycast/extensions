# Tiro

Search your [Tiro](https://tiro.ooo) meeting notes, ask Raycast AI about them, and control recordings in the Tiro desktop app.

A Tiro account is required for note search. Available features depend on your Tiro plan. Desktop recording controls require Tiro desktop 4.12.1 or later.

## Commands

- **Search Notes**: search titles and transcripts, read summaries and transcripts, and copy them.
- **Start Live Note / End Live Note and Create Document**: explicitly control the current live recording.
- **Start Offline Recording / End and Upload Offline Recording**: record locally and upload through the Tiro desktop app.

Ask Raycast AI about your meetings with `@tiro`, for example "@tiro what did we decide about pricing last week?"

Assign a hotkey to Search Notes in Raycast Settings → Extensions → Tiro.

## Setup

The first time you search or ask `@tiro`, Raycast asks you to sign in to Tiro in your browser. Search and AI tools read the notes you can see in the Tiro app. The separate recording commands control desktop recording sessions.

To use an account API key instead of signing in:

1. Open [tiro.ooo/platform/me/api-keys](https://tiro.ooo/platform/me/api-keys) and select **Create New API Key**.
2. Copy the full key, including the part before the dot. It's shown only once.
3. Paste it into the **API Key** preference of this extension.

## Desktop recording

Requires Tiro desktop 4.12.1 or later, installed and signed in. Recording commands use the desktop app's account independently of this integration's API login. The live end-and-create-document handler shipped in 4.12.1; older apps may ignore it. There is no fallback to legacy start-recording or stop-recording.

| Action | Desktop URL |
| --- | --- |
| Start Live Note | `tiro://notes/create/live-voice?background=true` |
| Start Offline Recording | `tiro://notes/create/offline-mode?background=true` |
| End Live Note and Create Document | `tiro://notes/end/live-voice?background=true` |
| End and Upload Offline Recording | `tiro://notes/end/offline-mode?background=true` |

End Live Note finishes the current live note and creates its document. End and upload affects only the current offline session, including a paused session. Both end actions target the recording session even when another note is displayed. No `guid` or `target` is sent.

A request being sent does not confirm recording, document generation, or upload completion. Check the Tiro app. Recording status files and the menu-bar indicator are not included. The older generic Stop Recording command is replaced by explicit end commands (live end, offline end and upload); update any old hotkey assignments.


## Security
This is a public PKCE client. Its OAuth client ID and service URLs are public configuration, not credentials. Raycast manages user tokens and password preferences. Token response bodies are not included in sign-in error messages.
