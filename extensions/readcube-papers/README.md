# ReadCube Papers

Search and browse your [ReadCube Papers](https://app.readcube.com) library from Raycast.

## Commands

- **Search Papers** — full-text search across a library (title, authors, journal, DOI…). With an empty query it shows the most recently added papers. Switch libraries with the dropdown when you have more than one.
- **Browse Lists** — pick a library, then any of its lists (nested lists show as `Parent › Child`) to see the papers in it.

From any paper you can open it in ReadCube, open its PDF in the ReadCube viewer, open the DOI link, toggle a details panel with the abstract, or copy a citation, the DOI, the citekey, or the ReadCube link.

## Setup

Fill in the extension preferences with **one** of:

1. **Email and Password** — the same credentials you use at app.readcube.com. The password is stored securely by Raycast; the extension signs in and keeps the session.
2. **Session Cookie** — for accounts that sign in with SSO/institutional login. Open app.readcube.com in your browser, open the developer tools' Network tab, select any request to `sync.readcube.com`, and copy the value of its `Cookie` request header.

## Note

ReadCube doesn't offer a public API. This extension uses the same endpoints as the ReadCube web app (`services.readcube.com` and `sync.readcube.com`), so it may need updating if ReadCube changes them.
