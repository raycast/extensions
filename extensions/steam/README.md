# Steam

[![](https://shields.io/badge/Raycast-Cross--Extension-eee?labelColor=FF6363&logo=raycast&logoColor=fff&style=flat-square)](https://github.com/LitoMore/raycast-cross-extension-conventions)

Search Steam games and users, browse your library, and ask Raycast AI for recommendations.

## Setup

Set both in the extension preferences.

- **Web API Key** (required, [get one](https://steamcommunity.com/dev/apikey)): downloads a list of every Steam game, so search runs on your Mac.
- **Steam ID** (optional): your games. Accepts your Steam ID, profile URL, or custom URL name.

## Features

- Search every Steam game
- Recently added, viewed, and played games
- Sort your library by name, playtime, last played, date added, or never played
- Pin games to the top of My Games
- Similar games for any game
- Game news and patch notes
- Player counts: live players, 24-hour and all-time peaks, and a chart of recent history
- Most Played Games: Steam's top 100 right now or this week
- HowLongToBeat, YouTube, and SteamDB links
- SteamGridDB images and ProtonDB scores (needs their Raycast extensions)
- Launch or install games in Steam
- Launch games from My Games with ⌘Return (or Return, in preferences)
- Hide software, DLC, videos, or hardware

## FAQ

**Why doesn't my DLC show as owned?**

Steam's Web API lists the games you own, but not DLC. Steam only shares your DLC with the Steam client and store when you're signed in, so the extension can't see it.

**Where do player counts come from?**

The live count and the Most Played Games list come from Steam. Player history, peaks, and the monthly table come from [SteamCharts](https://steamcharts.com). If SteamCharts doesn't track a game, you'll still see Steam's live count.

## AI Tools

- **Search Steam Games**: find a game by title
- **Get Steam Game Details**: price, release date, and store info
- **Search Steam Users**: look up a profile
- **Get Owned Games**: your library and playtime
- **Get Recently Played Games**: the last two weeks
- **Find Similar Games**: games like one game
- **Recommend Games**: games to buy, based on games you like
- **Recommend Owned Games**: games from your library, based on games you like
- **Get Game News**: announcements and patch notes
- **Get Player Count**: players now, peaks, and recent trend
- **Query Game List**: what's new or updated on Steam
- **Refresh Game List**: download the game list again (asks first)
- **Launch Game**: start a game (asks first)
- **Install Game**: open Steam's install dialog (asks first)
