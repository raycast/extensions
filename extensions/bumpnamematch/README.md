# Bump Name Match

Search baby names and view their full details (name meanings, origins, popularity, nicknames, related names, and more) right from Raycast... powered by the [Bump Name Match](https://bumpnamematch.com) API.

## Commands

- **Search Names** — type a name or a meaning. Results are scored with the same algorithm as the website: exact name -> name prefix -> name contains -> nickname (e.g. "Bob" -> Robert) -> meaning -> synonym, with popular names ranked higher. Press `↵` to open a rich detail view, or open the web page from the actions.
- **Search by Origin** — browse names by cultural origin. Pick an origin to see its names, with a search-bar **gender** dropdown (All / Boy / Girl / Neutral) that carries through. Each name has the same actions as Search Names (details, save, add to list, open, copy).
- **My Lists** — browse your favorite lists and the names in each (requires an API key). Open a list to see its names, `↵` into a name's details, or remove a name from the list with `⌃X`. Section dividers from the web app are shown as list sections. Without a key, the command shows a one-tap action to open preferences (and a link to create a key).
- **Naming Sessions** — vote on names with your partner (requires an API key). List your sessions, **Vote on Names** one at a time (Like / Dislike `⌘D`, plus the usual save/open actions), and when you both like a name you get a **🎉 Match** toast. **View Matches** lists everything you've matched on. Create a new session on the web, or **Join Session** with a partner's invite code right in the extension.

## Saving favorites

With an API key configured (see below), each name gets save actions:

- **Save to Favorites** (`⌘S`) — saves to your default Favorites list.
- **Add to List** (`⌘⇧S`) — pick any of your lists from a submenu.

Without a key, the save action instead opens the page where you can create one.

## Configuration

- **API Key** (optional) — a personal key used to save names to your lists and to view them in **My Lists**. Create one at <https://bumpnamematch.com/dashboard/api-keys>, then paste it into the extension preferences. Keys don't expire and can be revoked any time from the same page. Sent as the `x-api-key` header on requests. (Searching and browsing names works without a key.)

## Development

```bash
npm install
npm run dev   # ray develop
```
