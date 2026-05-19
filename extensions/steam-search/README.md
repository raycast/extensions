# Steam Search

Search the Steam store directly from Raycast. View live prices, review scores, and player counts — and open games straight into the Steam client.

## Features

- Search the Steam store in real time
- See current player count and 24h peak per game
- View review score (color-coded green/yellow/red)
- See Steam price including active discounts
- See lowest keyshop price from GG.deals (🔑)
- Owned games are tagged with a green **Owned** badge
- Open games directly in the Steam client, on GG.deals, or on SteamDB
- Localized prices — choose your region and currency in preferences
- Results and prices are cached locally for fast repeat searches
- All credentials are optional — use only the features you need

## Setup

All preferences are optional. The extension works without any credentials, but some features require them:

### Steam API Key *(optional)*
Enables: live player counts + Owned badge
1. Go to https://steamcommunity.com/dev/apikey
2. Log in and register a key (domain field can be anything, e.g. `localhost`)
3. Copy the key and paste it into the **Steam API Key** preference

### Steam ID *(optional)*
Enables: Owned badge
1. Go to https://steamid.io
2. Enter your Steam profile URL or username
3. Copy your **steamID64** (a 17-digit number starting with `7656`)
4. Paste it into the **Steam ID** preference

### GG.deals API Key *(optional)*
Enables: keyshop prices (🔑)
1. Go to https://gg.deals/api/
2. Find the API section and generate a key
3. Paste it into the **GG.deals API Key** preference

### Region & Currency *(optional, defaults to Germany/EUR)*
Controls the currency used for both Steam and GG.deals prices. Supported regions:

| Region | Currency |
|---|---|
| 🇩🇪 Germany | EUR € |
| 🇺🇸 United States | USD $ |
| 🇬🇧 United Kingdom | GBP £ |
| 🇫🇷 France | EUR € |
| 🇳🇱 Netherlands | EUR € |
| 🇵🇱 Poland | PLN zł |
| 🇨🇿 Czech Republic | CZK Kč |
| 🇸🇪 Sweden | SEK kr |
| 🇳🇴 Norway | NOK kr |
| 🇦🇺 Australia | AUD A$ |
| 🇨🇦 Canada | CAD C$ |
| 🇧🇷 Brazil | BRL R$ |
| 🇹🇷 Turkey | TRY ₺ |
| 🇷🇺 Russia | RUB ₽ |

## Usage

| Action | Shortcut (Windows) | Shortcut (macOS) |
|---|---|---|
| Open in Steam client | `↵` | `↵` |
| Open in Library (owned games) | `Ctrl + ↵` | `Cmd + ↵` |
| View on GG.deals | `Ctrl + G` | `Cmd + G` |
| View on SteamDB | `Ctrl + D` | `Cmd + D` |
| Copy Store URL | `Ctrl + C` | `Cmd + C` |

## How It Works

- Details (price, rating, players) only load for the game you're currently hovering over — keeping the extension fast even with many results
- GG.deals prices are batch-fetched for all results at once as soon as they arrive
- All data is cached in memory for the session and persisted locally for 1 hour, so switching back to a previously viewed game loads instantly
- Switching region invalidates the cache automatically so you always see correct prices