# Memos for Raycast

A minimal [Raycast](https://www.raycast.com) extension for [Memos](https://usememos.com), the open-source, self-hosted note-taking app.

## Why

The existing community extension for Memos targets the pre-0.19 API (`/api/v1/memo`), which was removed in modern Memos versions. This extension targets the current API (`/api/v1/memos`) with Bearer token authentication.

## Commands

- **Send Memo** — save a memo straight from the Raycast root search (no view).
- **Create Memo** — compose a memo in a form with a visibility picker (Private / Protected / Public).
- **List Memos** — browse your 30 most recent memos, copy their content, or open them in the browser.

## Setup

1. In Memos, create an access token: **Settings → My Account → Access Tokens**.
2. Install the extension locally:

   ```sh
   npm install
   npm run dev
   ```

   This builds the extension and installs it into Raycast in development mode.

3. When prompted, enter your instance URL (e.g. `https://memos.example.com`) and the access token.

## Notes

- The extension targets the Memos `/api/v1` API (Memos 0.19+). Older instances should use the legacy community extension instead.

## License

MIT
