# Paperclip for Raycast

Search Paperclip issues from Raycast and jump straight to the issue in your browser.

This extension is intentionally focused: it fetches issues from your Paperclip server, lets you search by title or identifier, and opens the selected issue in the Paperclip web UI.

## Features

- Search issues across all active companies returned by your Paperclip server
- Switch status filters from a visible dropdown in the search bar
- Jump directly into a dedicated review queue with the `Show Review or Blocked Issues` command
- Create new issues from a dedicated Raycast form, including assignee selection
- Inspect issue details in Raycast before opening them
- Open the issue in your browser with one keystroke

## Preferences

- `Paperclip Base URL`: your Paperclip server, such as `http://127.0.0.1:3100`
- `Auth Mode`: `No Auth`, `Bearer Token`, or `Custom Header`
- `Bearer Token`: used for bearer-based Paperclip auth
- `Custom Header Name` / `Custom Header Value`: used when your server sits behind an auth proxy

## Install

1. Open Terminal in this extension folder:

```bash
cd /Users/istib/Projects/raycast-paperclipai
```

2. Install dependencies:

```bash
npm install
```

3. Start Raycast development mode for this extension:

```bash
npm run dev
```

4. Raycast should import the extension automatically. If it does not, open the `Import Extension` command in Raycast and select this folder.

5. In Raycast, open the extension preferences for `Paperclip` and set:

- `Paperclip Base URL` to your server, for example `http://127.0.0.1:3100`
- `Auth Mode` plus credentials if your server requires auth

6. Run the `Search Issues` command from Raycast.

You can also run `Show Review or Blocked Issues` to jump straight into the review queue.
Use `Create Issue` to open the new-issue dialog directly from Raycast.

## Development

```bash
npm install
npm run dev
```

## Notes

- Issue web links use the Paperclip route shape `/{companyIssuePrefix}/issues/{identifier}`, for example `http://127.0.0.1:3100/SELA/issues/SELA-18`
- The search command calls the Paperclip REST API under `/api/companies` and `/api/companies/{companyId}/issues`
- The list header includes a status dropdown with `Active`, `All`, `In Review`, `Blocked`, and `Review or Blocked`

## License

MIT
