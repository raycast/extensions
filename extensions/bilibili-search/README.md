# Bilibili Search

Search, browse, and open Bilibili content directly from Raycast.

## Features

- Search Bilibili videos, anime, movies/TV, live rooms, articles, and users.
- Browse popular videos when the search query is empty.
- Log in with a Bilibili QR code to unlock account-based commands.
- View Bilibili watch history with pagination and video metadata.
- Browse favorite folders, search within a folder, or search across all folders.
- Browse followed users, followed anime, and followed cinema entries from the search command.
- Show rich details such as cover images, author, duration, publish time, tags, views, likes, coins, favorites, replies, danmaku, scores, cast, and staff.
- Open results in the browser or copy links from the action panel.

## Commands

### Search Bilibili

Search across multiple Bilibili content types.

Supported categories:

- Video
- Anime
- Movie/TV
- Live
- Article
- User

Usage notes:

- Leave the query empty in the Video category to browse popular videos.
- Select a category from the dropdown in the search bar.
- Use `Control + Arrow Right` / `Control + Arrow Left` to switch categories from the action panel.
- Use `Control + B` to show or hide the detail panel.
- Use `Control + C` to copy the selected result link.
- Use `Control + Enter` to open the current search keyword in Bilibili's browser search.
- Prefix a query with `:` when browsing followed users, followed anime, or followed cinema to filter locally, for example `:music`.

### Login Bilibili

Log in to Bilibili by scanning a QR code with the Bilibili mobile app.

After login, the extension stores the Bilibili cookie in Raycast's local cache so the History and Favorites commands can call account APIs.

### History

View your Bilibili watch history.

- Requires login.
- Supports pagination.
- Shows video details and stats.
- Opens videos in the browser and copies video links.

### Favorites

View your Bilibili favorite folders.

- Requires login.
- Select a favorite folder from the dropdown.
- Choose All Favorites to search across every folder.
- In All Favorites mode, type a search query first; the extension does not load every item before searching.
- Shows video details and stats.

## Preferences

| Preference | Description |
| --- | --- |
| Default Favorite Folder | Optional favorite folder name to open by default. If empty or not found, the first folder is used. |

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Control + B` | Toggle details |
| `Control + C` | Copy selected link |
| `Control + Enter` | Search current keyword in browser |
| `Control + Arrow Right` | Next search category |
| `Control + Arrow Left` | Previous search category |
| `Control + R` | Refresh followed user data in User category |

## Development

Install dependencies:

```bash
npm install
```

Run the extension in development mode:

```bash
npm run dev
```

Lint the extension:

```bash
npm run lint
```

Build the extension:

```bash
npm run build
```

Publish to the Raycast Store:

```bash
npm run publish
```

## Project Structure

```text
assets/                 Extension icon
src/bilibili-search.tsx Main search command
src/login.tsx           QR-code login command
src/history.tsx         Watch history command
src/favorites.tsx       Favorites command
src/utils/              Bilibili API and auth helpers
```

## Privacy

This extension communicates with Bilibili APIs to fetch search results and account data. Login cookies are stored locally in Raycast's cache and are used only for authenticated Bilibili requests such as history, favorites, followings, and followed media.

## Acknowledgements

This extension is inspired by the existing Bilibili extension in the Raycast extension ecosystem. It is an independent implementation focused on richer search categories, account-based browsing, and detailed result views.

## Notes

Bilibili API responses and availability may change over time. If a command stops returning results, try logging in again or running the command later.
