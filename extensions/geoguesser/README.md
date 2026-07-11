# GeoGuessr Raycast Extension

View your [GeoGuessr](https://www.geoguessr.com/) profile, track daily challenges, and analyze your game history right from Raycast.

## Getting Started

1. Log in to GeoGuessr in your browser
2. Open DevTools (F12 or Right Click → Inspect)
3. Go to **Application** tab → **Cookies** → `www.geoguessr.com`
4. Find the `_ncfa` cookie and copy its **Value**
5. Paste the token in Raycast extension preferences when prompted

**Note:** The `_ncfa` token is valid for 1 year and provides secure access to your GeoGuessr data.

### Optional Configuration

- **Number & Date Format** - Select your preferred locale for formatting numbers and dates (default: German)
- **Country Code** - Enter your 2-letter country code (e.g., DE, US, FR) for accurate team identification in duels

## Commands

### Get Your Profile

View your complete GeoGuessr profile with comprehensive statistics:

- Level progression with XP tracking and progress bars
- Battle Royale stats including level, division, and rating
- Explorer and Streak medal progress across all tiers (Bronze, Silver, Gold, Platinum)
- Overall game statistics: total games played, max/average scores, closest/average distances

### Daily Challenge

Check today's daily challenge and track your performance:

- View time remaining until the next challenge
- See total participants and top 5 global leaderboard
- Display your personal score, time, distance, and current streak (if you've played)
- Shows whether you're on the leaderboard
- Quick link to play the challenge directly in your browser

### Show Your Recent Games

Browse your complete game history with support for multiple game types:

- **Daily Challenges** - View scores, dates, and challenge tokens
- **Streak Sessions** - See session summaries with best streak achieved
- **Duels** - Check competitive match results

Click any game to view detailed information:

- Round-by-round score breakdown
- Distance from correct location for each round
- Time taken per round
- Clickable Google Maps links to actual locations and your guesses
- Game settings (moving, zooming, rotating permissions)

**For Duels:** Displays team comparison, health tracking, victory/defeat status, rating changes, win streaks, and damage dealt per round.

**Plonk It Integration:** Each round includes a quick action to open [Plonk It](https://www.plonkit.net/) for practicing that specific country (keyboard shortcuts: Cmd+1 through Cmd+9 for rounds 1-9).

## ⚠️ Disclaimer

This extension is **not affiliated with, endorsed by, or connected to GeoGuessr AB** in any way.

GeoGuessr® is a registered trademark of GeoGuessr AB. All GeoGuessr-related trademarks, logos, and assets are property of their respective owners.

This is an unofficial, community-built extension provided as-is for personal use only.

## License

MIT License
