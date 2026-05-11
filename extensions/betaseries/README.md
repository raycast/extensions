# BetaSeries Extension for Raycast

Manage your TV shows and movies with BetaSeries directly from Raycast.

## Features

- **Search Shows & Movies** - Quickly find TV shows and movies
- **My Shows** - View your TV shows library with unwatched episodes count
- **My Movies** - Access your movies collection
- **Planning** - See your upcoming episodes
- **New Episodes Menu Bar** - Show unread released episodes in the macOS menu bar
- **Mark as Watched** - Mark episodes and movies as watched/unwatched
- **Rate Content** - Rate your movies directly from Raycast

## Setup

1. Get your BetaSeries API Key from [BetaSeries Developer Portal](https://www.betaseries.com/api/)
2. Open one of the member commands (**My Shows**, **My Movies**, or **Planning**).
3. Sign in with your BetaSeries login/email and password directly in the extension form.  
   The extension will request the token and save it automatically.

## Commands

### Search Shows
Search for TV shows on BetaSeries and add them to your library.

### Search Movies
Search for movies on BetaSeries and add them to your collection.

### My Shows
View all your TV shows with their unwatched episodes count. Press Enter to see unwatched episodes.
You can enable or disable episode notifications per show from the Action Panel.

### My Movies
Browse your movie collection and mark them as watched or rate them.

### Planning
See your upcoming episodes for the week.

### New Episodes Menu Bar
Get notified when you have new episodes to watch on active shows.

Behavior:
- The menu bar icon appears only when there are episodes to watch.
- The title shows only the number of episodes.
- Notifications are created only for episodes released in the last 7 days.
- Dismissed notifications are not sent again for the same episode.
- Active notifications are deduplicated (no duplicate entry for the same episode).
- Notifications are enabled by default for active non-archived shows.
- A show can be muted/unmuted from **My Shows**.
- `Discard notifications` hides the currently visible episode notifications.
- Marking an episode as watched from **My Shows** triggers an immediate menu bar refresh.

## Configuration

The extension requires:
- **API Key** : Your BetaSeries Developer API Key
- **OAuth Token** : For accessing user-specific features like your library and planning (generated and saved automatically from the login form)

## License

MIT
