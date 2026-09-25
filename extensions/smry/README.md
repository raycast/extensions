# smry

Save the page in front of you, clear a pile of open tabs, or send any public link to your [smry](https://smry.ai) reading queue.

## Commands

| Command | Result |
| --- | --- |
| **Save Current Tab** | Saves the active public browser tab to your default Inbox or Later destination. |
| **Save Browser Tabs** | Searches every open public tab and lets you save one to Inbox or Later. |
| **Save Link** | Saves a pasted public URL to the destination you choose. If that URL is already open, its rendered HTML is preserved too. |

## Setup

Install the [Raycast Browser Extension](https://www.raycast.com/browser-extension) to use the current-tab and browser-tab commands. **Save Link** also works without it.

The extension uses a private API key so each command can save silently and report a confirmed result:

1. Create a private API key in [smry API key settings](https://smry.ai/mcp-api-cli?view=keys).
2. Paste it into **Raycast Settings → Extensions → smry → API Key**. Personal API access is available on smry Patron and Pro plans.
3. Choose whether one-keystroke current-tab saves go to **Later** or **Inbox**.

## Saving behavior

- **Later** keeps an article in your read-later queue.
- **Inbox** keeps it in your incoming reading queue for triage.
- Existing articles are updated idempotently instead of duplicated.
- When a browser tab is available, smry preserves its rendered HTML after the explicit save action. This supports pages that need client-side rendering or an authenticated browser session.
- If capture fails, is too large, or is unavailable, the API retrieves the public URL instead.

## Privacy

The extension lists browser tabs locally. It does not send their URLs or contents while you browse or search.

After an explicit save, the selected public URL and—when available—its rendered HTML are sent only to `api.smry.ai`. Browser-internal, smry, credential-bearing, loopback, local-development, private-network, multicast, and reserved-address URLs are rejected before any network request.
