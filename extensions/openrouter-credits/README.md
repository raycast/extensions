# OpenRouter Credit Balance

See your OpenRouter credit balance in the Raycast menu bar and receive a low-balance alert before your credits run out.

## Setup

1. Install the extension and open its preferences in Raycast.
2. Create an [OpenRouter Management API key](https://openrouter.ai/settings/management-keys). A regular inference API key cannot access credit data.
3. Paste the key into **Management API Key**. The balance appears in the menu bar and refreshes every 15 minutes.

## What It Shows

- **Remaining Balance** is the amount currently available to spend.
- **Lifetime Credits Purchased** and **Lifetime Usage** are cumulative account totals provided for reference.
- **Low-Balance Alerts** notify once when the balance reaches the configured amount. The default alert amount is `$5.00`; a new alert is available after the balance rises above that amount.

OpenRouter's [Credits API](https://openrouter.ai/docs/api/api-reference/credits/get-remaining-credits) requires a Management API key and reports total credits purchased and used. This extension stores the most recent successful result locally so it can keep displaying a balance when a refresh fails.

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
