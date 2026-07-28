# Next Game

**What to Play Next - Smart Game Picker** - A smart Raycast extension that analyzes your local Steam library and play history to recommend what to play next. Discover hidden gems in your backlog, rediscover forgotten favorites, or break your usual gaming habits entirely.

## Features

- **Smart Recommendation Engine:** Generate highly tailored game picks using a dynamic taste profile built from your historical playtime, tags, and genres.
- **Intent-Based Filtering:** Choose from targeted strategies like **The Backlog** (unplayed games), **Rediscover** (forgotten favorites), **Break the Mold** (outside your comfort zone), specific **Moods** (Story, Adrenaline, Fantasy, Chill & Relax, etc.), or **Social** (Solo, Co-op, Competitive).
- **Curated Dashboard:** Get an algorithmic "Top Pick" alongside alternative matches. Every recommendation features dynamic subtitles explaining exactly *why* it was chosen for you.
- **Algorithmic Diversity:** Uses Szymkiewicz–Simpson overlap coefficients and dynamic slot systems to ensure your recommendation list is varied and not dominated by a single genre.
- **Advanced Preferences:** Deeply control your recommendation pool. Filter by installed status, controller support, Steam achievements, maximum release age, VR support, multiplayer/singleplayer modes, or globally blacklist specific tags.
- **Skip System:** Hide games you don't want to see right now with a dedicated manager command to view and restore them later.
- **Fully Local & Private:** Parse Steam's local files directly from your disk. No Steam API key is required, and your data never leaves your machine (via **Local Steam Files**).

## Setup

This extension works out of the box by automatically detecting your default Steam installation on macOS and Windows. **No API key is required.**

1. Open the extension in Raycast.
2. If your games are not found, open the extension **Preferences**.
3. Use the **Custom Steam Path** directory picker to select your main Steam installation directory. This must be the root directory containing the `userdata` and `appcache` folders (e.g., `D:\Games\Steam` on Windows, or `/Volumes/ExternalDrive/Steam` on macOS).
4. Configure optional preferences (e.g., Recommendation Limit, Taste Timeframe, Exclusion Filters and more).

## Requirements

**Steam Desktop Client:** Must be installed on your system.
**Local Library Data:** The extension reads your local Steam configuration files to build recommendations. If your Steam installation is on a custom drive, you must specify the path in the extension preferences.

## Commands

| Command | Description |
| :--- | :--- |
| **Play Next** | View game recommendations and start your next session. |
| **Manage Skipped Games** | View, filter (by time), and unskip games you have hidden from your recommendations. |

## Keyboard Shortcuts (Play Next)

- **Enter** — Launch the game (if installed) or trigger the Steam download prompt (if not).
- **Cmd+Enter / Ctrl+Enter** — Open the game's Steam Store page.
- **Cmd+S / Ctrl+S** — Skip the game (removes it from your recommendation pool).
- **Cmd+R / Ctrl+R** — Refresh the list to generate new recommendations.

## Keyboard Shortcuts (Manage Skipped Games)

- **Enter** — Unskip the game (restores it to your recommendation pool).
- **Cmd+Enter / Ctrl+Enter** — Open the game's Steam Store page.
- **Cmd+Shift+X / Ctrl+Shift+X** — Unskip all (restores all skipped games to your recommendation pool).

## Preferences

- **Custom Steam Path:** Set your main Steam installation directory if it is not in the default OS location.
- **Recommendation Limit:** Choose between a Top 10 or Extended Top 20 list.
- **Open Steam pages in Steam client:** Uses the `steam://` protocol to open store pages in the desktop app instead of the web browser.
- **Library Visibility:** Hide games not currently installed.
- **Base Recommendations On:** Adjust how far back the algorithm looks to determine your taste (Last 3 Months, 6 Months, 1 Year, or All Time).
- **Exclusion Filters:** Hide Multiplayer-Only or Singleplayer-Only titles.
- **Maximum Game Age:** Hide games older than a specific number of years.
- **Blacklisted Tags:** A comma-separated list of Steam tags to permanently ignore (e.g., `Anime, Visual Novel, Hidden Object`).
- **Require Controller Support:** Only show games with partial or full controller support.
- **Require Steam Achievements:** Only show games that feature achievements.
- **Hide Free-to-Play Games:** Filters out F2P titles.
- **VR Mode:** Choose to show all games, hide VR games, or only show VR games.

## Data Privacy

Next Game operates entirely locally. It reads your Steam library, playtime, and installed games directly from your local Steam configuration files. **No automatic network requests are made.** Opening the Steam store page in your browser or client is an explicit action you take.

## Troubleshooting

- **Getting a "Steam Library Not Found" error?** Make sure Steam is installed and has been run at least once on your current OS user account. If Steam is on a custom drive, you must specify the exact root path using the directory picker in the extension preferences.
- **Zero games recommended?** Review your extension preferences and disable overlapping constraints (e.g., VR Only, Require Achievements, Show Only Installed, or an extensive tag blacklist) to expand your recommendation pool.
- **Recommendations feel repetitive?** Lower the **Base Recommendations On** timeframe in preferences to weight only recent games. Switch the strategy to **Break the Mold** to bypass your standard taste profile entirely. Finally, loosen your global preference filters to allow a wider variety of genres and games to pass through the algorithm.
- **Missing newly purchased games?** Steam updates `appinfo.vdf` in the background. Launching the Steam client or starting a game download will force the local cache to update, making the games visible to the extension.

## Support

If this extension helps you conquer your backlog, consider buying me a coffee!

<a href="https://buymeacoffee.com/glct26" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="41" width="174"></a>