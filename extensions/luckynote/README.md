# Luckynote

Capture notes and tasks in your Luckynote account from Raycast.

## Connect your account

1. Run **Save Message** and choose **Connect to Luckynote**.
2. Continue in your browser. If you are signed out, sign in to Luckynote there, including with Google or Apple when available.
3. After sign-in, you return to Raycast automatically. No password or API key is entered in Raycast.

The connection is remembered securely. To disconnect or switch accounts, use Raycast's built-in **Log Out** action in the Luckynote extension preferences, then connect again through Save Message.

## Commands

- **Quick Save Note** saves the supplied text to Inbox.
- **Save Message** offers a title, optional body and searchable folder picker.

Start a title with `-` to create a task, or use **Save as Task** (`⌘⇧↵`) in Save Message. Assign global shortcuts using Raycast's settings.

If Quick Save Note needs a connection, it opens Save Message with your note preserved. Connect there, then save the note. Failed saves keep the editor contents; an expired connection can be reconnected from the editor.

## Development

The optional Server URL preference defaults to `https://luckynote.io`. Use a server origin with HTTPS. For local development set Server URL to `http://localhost:3000`. Raycast opens that web app for sign-in and sends GraphQL requests to `http://localhost:4000`. Both local servers must be running. Other server origins serve both browser authorization and GraphQL through the same origin. Sessions are isolated per origin.

Run `npm install`, `npm run dev`, `npm run typecheck`, `npm test`, and `npm run lint`.
