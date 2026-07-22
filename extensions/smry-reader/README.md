# smry Reader

Turn any public page already open in your browser into a clean reading view with [smry](https://smry.ai), or save it for later without leaving Raycast.

## Features

- **Browse open tabs** — Search public HTTP and HTTPS tabs by title, website, or URL.
- **Read in smry** — Open the selected page in smry with its rendered content, including pages that need browser rendering.
- **Save for later** — Send the selected page to smry's save flow with `⇧⌘↵`.
- **Keep context** — Open the original page, copy its URL, or toggle the detail panel from the action menu.
- **Safe fallback** — If Raycast cannot capture the rendered page, smry opens the public URL instead.

## Setup

1. Install the [Raycast Browser Extension](https://www.raycast.com/browser-extension) for your browser.
2. Run **Read Browser Tabs** in Raycast.
3. Select a page, then press `↵` to read it in smry or `⇧⌘↵` to save it for later.

No smry account or API key is required to read a page. Saving may ask you to sign in on smry.ai.

## Actions

| Action             | Shortcut | Result                                      |
| ------------------ | -------- | ------------------------------------------- |
| Open in smry       | `↵`      | Opens the selected page in the smry reader  |
| Save in smry       | `⇧⌘↵`    | Opens the selected page in smry's save flow |
| Toggle Details     | `⌘D`     | Shows or hides page details                 |
| Refresh Tabs       | `⌘R`     | Reloads the list of open browser tabs       |

## Privacy

smry Reader uses Raycast's Browser Extension API to list open tabs. It does not send tab contents while you browse or search the list.

The selected public URL and rendered HTML are sent to `api.smry.ai` only after you choose **Open in smry** or **Save in smry**. smry returns a private, short-lived ingest token before opening the web reader. Local, private-network, browser-internal, and non-HTTP tabs are never sent.
