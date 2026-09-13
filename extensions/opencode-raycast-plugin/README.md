# Opencode Info

Track your [OpenCode Go](https://opencode.ai) usage from Raycast — the three limit windows, the live model catalog, and the daily picks — in a full view and a menu-bar command.

## Setup

You need an **active OpenCode Go subscription** — the extension surfaces subscription usage, so there's nothing to see without one.

Then paste your **OpenCode Go API key** into the extension preferences:

1. Open Raycast → Extensions → **Opencode Info** → Preferences.
2. Enter your API key in the **API key** field.

The extension reads the key from preferences and sends it only to the OpenCode API to fetch your usage. It fetches the model catalog and current pricing from opencode's public endpoints without sharing your key.

## Features

- **Limit windows** — rolling 5h, weekly, and monthly usage with a used-percent and reset time.
- **Model catalog** — the live OpenCode Go and OpenCode Zen model list with current $/M pricing, sortable by cost, quota, or name.
- **Picks** — daily recommendations (stretch quota and best value) computed from current pricing.
- **Quota** — per-model estimated request capacity for the rolling 5h window.
- **Menu bar** — the OpenCode logo as a pill in the menu bar, refreshed every 60 seconds.

## Notes

- This extension surfaces the opencode product family; today that is **OpenCode Go**, and future opencode features may join under the same extension identity.
- Inspired by the omarchy-opencode-usage KDE Plasma widget by ardfard (https://github.com/ardfard/omarchy-opencode-usage).

## License

[MIT](./LICENSE)