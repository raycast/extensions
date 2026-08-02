# AI Compare Raycast Extension

Search from Raycast, then compare answers across selected AI sites in AI Compare.

> **Requirement:** Google Chrome and the AI Compare Chrome extension must be installed and enabled before using this command.

## Setup

1. Install and enable the AI Compare Chrome extension in Google Chrome.
2. Install AI Compare from the Raycast Store.

## Development

1. Install dependencies with `npm install`.
2. Run `npm run dev` and import the extension into Raycast.

## Usage

Run `Search with AI Compare` in Raycast, enter a question or keyword, and press Enter. Raycast opens AI Compare in Google Chrome, where it searches the selected AI sites.

```text
chrome-extension://dkhpgbbhlnmjbkihoeniojpkggkabbbl/iframe/iframe.html?sites=<sites>&type=<type>&query=<query>
```

Raycast explicitly opens this URL with Google Chrome, so macOS does not need a system-wide handler for the `chrome-extension://` URL scheme. The compare page then uses the existing AI Compare URL contract to launch the selected AI sites and start the search.

## Preferences

- `Default Sites`: optional comma-separated site names, such as `ChatGPT,Claude,Gemini`.
- `Site Type`: optional AI Compare site category. Defaults to `information`.
- `OpenClaw Mode`: optional `openclaw=1` URL parameter for automation/test runner flows.

## Notes

- The Raycast extension does not duplicate site automation logic. It only opens the existing AI Compare compare-page URL.
- The Chrome Web Store extension ID is hardcoded as `dkhpgbbhlnmjbkihoeniojpkggkabbbl`.
- Google Chrome must be installed and the official AI Compare Chrome extension must be enabled.
- Site names must match the names configured in `config/siteHandlers.json`.
- If `Default Sites` is empty, AI Compare uses its saved/default site selection behavior.
