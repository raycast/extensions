# Lark Docs for Raycast

Search Feishu/Lark documents, browse recent files, and create new docs, sheets, or slides without leaving Raycast.

This project is a new implementation based on the authentication and web-API patterns from the MIT-licensed
[Raycast Lark extension](https://github.com/raycast/extensions/tree/main/extensions/lark).

## Features

- QR-code login with the Feishu/Lark mobile app
- Recent document list with a configurable size
- Full-text document search
- Open and copy document links
- Remove files from the recent list
- Create Docs, Sheets, and Slides in My Documents
- Use the current search text as the title when creating from the search command
- Feishu, Lark, and self-hosted deployment support

## Development

```bash
npm install
npm run dev
```

Run `npm run typecheck` for a standalone TypeScript check.

## Authentication

The extension follows the same browser-session approach as the existing Raycast Lark extension:

1. It requests a QR login token from the Feishu/Lark web login service.
2. The Feishu/Lark mobile app scans and confirms the QR code.
3. The extension stores the returned `session` cookie in Raycast Local Storage.
4. The session is reused for recent files and document search.

The session is a sensitive credential. This extension does not send it anywhere except the configured Feishu/Lark domain.

## Internal Endpoints

This implementation intentionally uses the same web APIs as the Feishu/Lark web app:

```text
POST /accounts/qrlogin/init
POST /accounts/qrlogin/polling
GET  /space/api/explorer/recent/list/
GET  /space/api/search/refine_search/
POST /space/api/explorer/recent/delete/
POST /space/api/explorer/v2/create/object/
```

The create endpoint expects `application/x-www-form-urlencoded` data, not JSON. The extension matches the
web client's request format and uses an empty `parent_token` for the My Documents root.

These endpoints are not part of the documented Feishu Open Platform API and may change when the web application changes.
