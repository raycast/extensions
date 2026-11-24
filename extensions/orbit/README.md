# Memory Machine Raycast Extension

Open and search your screen history and jump to Memory Machine settings from Raycast.

## Setup

Install [Memory Machine](https://memorymachine.app/) for macOS, version 1.6.0 or later.

If you run a command before installing the app, choose **Get Memory Machine** to open the download page. Once the app is installed, return to Raycast and choose **Try Again**.

## Commands

- **Open Search** opens the search window. Enter a query in Raycast to pass it directly to Memory Machine, or leave the argument blank to open Search without a query.
- **Open History** opens your latest capture by default. Enter a date or time such as `last Tuesday`, `yesterday at 3pm`, or `5 minutes ago` to find the first capture at or after that time.
- **Open Settings** opens the Memory Machine settings window.

## Raycast AI

Mention `@orbit` in Raycast AI Chat to open Search, History, or Settings. Try these prompts.

- `@orbit search for invoices or receipts in Chrome`
- `@orbit open history for yesterday at 3pm`
- `@orbit open settings`

## Search examples

Enter a query in **Open Search** or ask `@orbit` to search for it. Separate words must all match, and double quotes match an exact phrase. The operators `AND`, `OR`, and `NOT` are case-insensitive. Use parentheses to group alternatives before applying a shared filter. Put a wildcard `*` at the end of a word to match its prefix.

| Query                             | What it finds                                                               |
| --------------------------------- | --------------------------------------------------------------------------- |
| `quarterly review`                | Captures containing both words                                              |
| `"design review"`                 | The exact phrase                                                            |
| `invoice*`                        | Words that start with `invoice`                                             |
| `(invoice OR receipt) NOT draft`  | Invoices or receipts with drafts excluded                                   |
| `(invoice OR receipt) app:Chrome` | Either keyword in Chrome                                                    |
| `app:"Microsoft Teams"`           | Captures from Microsoft Teams                                               |
| `handoff app:(Figma OR Notion)`   | Handoffs in either app                                                      |
| `text:invoice site:example.com`   | Captures with `invoice` in the recognized text and `example.com` in the URL |

Use `app:` on its own or combine it with keywords. Quote app names that contain spaces. Use `text:` for recognized screen text and `title:` for window titles. Both `site:` and `url:` search the captured URL.

## Direct links

Use these links in a Raycast Quicklink, script, or browser to open the Mac app directly.

| Link                                                | What it opens                                             |
| --------------------------------------------------- | --------------------------------------------------------- |
| `memorymachine://search`                            | Search                                                    |
| `memorymachine://search?term=design%20review`       | Search with `design review` filled in                     |
| `memorymachine://history`                           | History at the latest capture                             |
| `memorymachine://history?date=2026-03-03`           | History from midnight on that date in your local timezone |
| `memorymachine://history?date=2026-03-03T14:00:00Z` | History from the specified UTC time                       |
| `memorymachine://settings`                          | Settings                                                  |

URL-encode query values that contain spaces or special characters.
