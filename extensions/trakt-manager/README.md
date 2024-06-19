# Trakt Manager

Control your Trakt account directly from Raycast.

## Usage

Trakt Manager enables you to control your Trakt account directly from Raycast. It provides a set of commands to perform various actions on your account like adding shows to watchlist, checking-in on shows, and more. It allows you to sign in to your Trakt account using OAuth and then perform actions on your account.

> [!IMPORTANT]
> Please note that you would need a VIP account to be able to perform actions like add to watchlist or check-in.

> [!NOTE]
> Since Trakt doesn't provide a way to get the poster images, this extension makes use of a read only TMDB API bearer token to fetch the poster images from TMDB.

## Commands

### Search Movies

Search for movies by title.

### Search Shows

Search for shows by title.

### Watchlist

Lists movies and shows that are in your watchlist.

### Up Next

Get the list of shows that are up next.

### History

Lists movies and shows that are in your history.

### Refresh

Refreshes the cache from API.

> [!NOTE]
> This command also runs in the background every 6 hours to keep the cache up to date.
