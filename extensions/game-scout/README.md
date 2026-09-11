# Game Scout

The ultimate gaming companion for Raycast. Search across multiple storefronts, track historical lows, discover free giveaways, and catch the best daily deals without leaving your launcher.

## Features

- **Search Games:** Quickly look up any game, see its current price, all-time low, and active bundles (via **IsThereAnyDeal API**).
- **Smart Recommendation Engine:** Get instant verdicts (👍 STRONG OPPORTUNITY, 🟢 GOOD OPPORTUNITY, 🟡 AVERAGE TIMING, 🟠 WEAK OPPORTUNITY, ❌ POOR OPPORTUNITY) plus overrides (🎁 FREE TO CLAIM, 📦 CHEAPER IN BUNDLE) based on historical lows and bundle value analysis.
- **Price History Charts:** Visual price trend graphs (3-month, 6-month, 1-year ranges) generated directly in the detail view (via **QuickChart.io**). _(Note: Can be toggled off in preferences to save API limits)._
- **Bundle Content Viewer:** Inspect active bundle tiers, prices, and included games without leaving the extension (via **IsThereAnyDeal API**).
- **Manage Stores:** Globally filter Search, Saved Games, and Top Deals to only show prices from your preferred storefronts.
- **Saved Games:** Add games to your personal watchlist. Features advanced filtering (Only Deals, Biggest Discount, Best Opportunities) and a dynamic 🔥 Price Drops section. (via **IsThereAnyDeal API**).
- **Top Deals:** Discover the highest-rated game deals across 30+ official stores, powered by the CheapShark Deal Rating algorithm (via **CheapShark API** - No API key required).
- **Free Games:** Never miss a 100% free game or DLC giveaway across PC, PlayStation, Xbox, VR and Mobile platforms (via **GamerPower API** - No API key required).

## Setup

The **Top Deals**, **Free Games**, and **Manage Stores** commands work out of the box.

To use the **Search** and **Saved Games** features, a free API key from IsThereAnyDeal is required:

1. Create an account at [IsThereAnyDeal](https://isthereanydeal.com/).
2. Go to the [Apps page](https://isthereanydeal.com/apps/) and click **Register App**.
3. Enter a name for the application and click **Submit**.
4. On your app's dashboard, locate the **API Keys** section on the right side.
5. Copy the generated API key. _(Important: Use the API Key, **not** the OAuth Client ID or Client Secret on the left)._
6. In Raycast, open the extension preferences and fill in:
   - **IsThereAnyDeal API Key** — the API key you generated.
   - **Country** — select your preferred region for pricing data.
   - Configure optional preferences (e.g., max results, showing mature/DLC content, min discount, update frequency, and toggling the Price History Chart).

## Commands

| Command           | Description                                                        |
| :---------------- | :----------------------------------------------------------------- |
| **Search Games**  | Look up current prices, historical lows, and bundles for any game. |
| **Saved Games**   | Manage your personal watchlist and track active price drops.       |
| **Top Deals**     | Browse the best daily discounts across 30+ official stores.        |
| **Free Games**    | Find 100% free games, DLCs, and giveaways across all platforms.    |
| **Manage Stores** | Select which stores to include in your searches and deals.         |

## Actions

### Global Actions

- **Enter** — View detailed information (prices, charts, bundles, instructions) in full-screen.

### Search & Saved Games

- **Cmd+S / Ctrl+S** — Save / Remove game from your watchlist.
- **Cmd+B / Ctrl+B** — View bundle contents (if active bundles exist).
- **Cmd+R / Ctrl+R** — Force refresh price and chart data for the current game.

### Game Detail View (Search & Saved Games)

- **Cmd+C / Ctrl+C** — Copy best deal link.
- **Cmd+Shift+C / Ctrl+Shift+C** — Copy game name.

### Saved Games Specific

- **Cmd+Shift+Backspace / Ctrl+Shift+Backspace** — Clear all saved games.

### Top Deals

- **Cmd+M / Ctrl+M** — View Metacritic reviews (if available).
- **Cmd+Shift+C / Ctrl+Shift+C** — Copy deal link.
- **Cmd+Alt+Shift+C / Ctrl+Alt+Shift+C** — Copy Metacritic link (if available).

### Free Games

- **Cmd+I / Ctrl+I** — Ignore / Restore giveaway (hides from the main list).

### Manage Stores

- **Cmd+Shift+A / Ctrl+Shift+A** — Select all stores.
- **Cmd+Shift+D / Ctrl+Shift+D** — Deselect all stores.

## Troubleshooting

- **Getting "No Results" or "Invalid API Key" toast?** Double-check that you copied the **API Key** (from the right column) and not the OAuth Client ID from your IsThereAnyDeal app dashboard.
- **Hitting API Rate Limits?** If you check hundreds of games daily, try turning off the `Show Price History Chart` setting in the extension preferences to save 1 API call per game lookup.

## Support

If this extension helps you find great deals, consider buying me a coffee!

<a href="https://buymeacoffee.com/glct26" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="41" width="174"></a>
