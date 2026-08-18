# OpenRouter Credit Balance

See your OpenRouter credit balance in the Raycast menu bar and receive a low-balance alert before your credits run out.

## What This Extension Is For

OpenRouter Credit Balance is a lightweight balance monitor. It keeps the amount you can currently spend visible in the menu bar, provides a compact lifetime-spend dashboard, and alerts you when the balance reaches your chosen threshold.

It is intentionally not an OpenRouter account manager: it does not create, list, revoke, or otherwise manage API keys. You create a Management API key in OpenRouter, then add it to Raycast only to read your credit data.

## Setup

1. Install the extension and open its preferences in Raycast.
2. Create an [OpenRouter Management API key](https://openrouter.ai/settings/management-keys). A regular inference API key cannot access credit data.
3. Paste the key into **Management API Key**. The balance appears in the menu bar and refreshes every 15 minutes.

## What It Shows

- **Remaining Balance** is the amount currently available to spend.
- **Lifetime Credits Purchased** and **Lifetime Usage** are cumulative account totals provided for reference.
- **Low-Balance Alerts** notify once when the balance reaches the configured amount. The default alert amount is `$5.00`; a new alert is available after the balance rises above that amount.

OpenRouter's [Credits API](https://openrouter.ai/docs/api/api-reference/credits/get-remaining-credits) requires a Management API key and reports total credits purchased and used. This extension keeps a key-bound local cache for faster startup, but clears the displayed balance if a refresh fails or the Management API key changes.

## Development

```bash
npm install
npm run dev
npm run lint
npm run build
```

## Disclaimer

OpenRouter is a trademark of OpenRouter, Inc. This independent extension is not affiliated with or endorsed by OpenRouter.

## License

MIT
