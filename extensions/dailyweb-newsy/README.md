# Dailyweb.pl Newsy — Raycast Extension

A feed reader for [Dailyweb.pl](https://dailyweb.pl) built for Raycast. Browse the latest articles, filter by category or author, and search — without ever leaving Raycast.

---

## Requirements

- [Raycast](https://raycast.com) 1.26+
- Node.js 22.14+
- npm 7+

---

## Installation (developer mode)

```bash
git clone <repo>
cd Dailyweb-Reader-raycast
npm install
npm run dev
```

Raycast will automatically detect the extension and load it under the **Development** section.

---

## Features

### Main screen — list or grid

In **Preferences**, choose between **List** and **Grid** layouts:

| Layout             | View                                            |
| ------------------ | ----------------------------------------------- |
| **Grid** (default) | Cards: cover image, title, date · author        |
| **List**           | Rows: cover + title; preview panel on the right |

- **Time sections** — posts grouped into: _Today_, _Yesterday_, _Earlier_
- **Preview panel** — on the right: full title, excerpt, author (with avatar), category, date, link
- **Thumbnail** — article cover image as an icon on the left side of the list
- **List row** — cover image and title only (author, category, and date appear in the preview panel on the right)
- **Unread tracking** — tracked in LocalStorage; marked as read after previewing or opening (actions available in the Cmd+K panel)
- **Load more posts** — scroll to the bottom or use "Load more" in the Raycast footer

### Search

Type a phrase in the search bar — the list switches to server-side search mode (`?search=`). Clearing the search returns to browsing with sections.

### Filter by category

Dropdown on the right side of the search bar — available categories:

| Section       | Categories                                                              |
| ------------- | ----------------------------------------------------------------------- |
| Tech          | Tech (all), Mobile, Hardware, Photo & Video, AI, Audio, Smart Home, Web |
| Entertainment | Entertainment (all), Games, Gaming, Movies & Series, Lifestyle          |
| Other         | News, Marketing & New Media                                             |

### Actions (Cmd+K on a selected post)

| Action              | Shortcut    | Description                                     |
| ------------------- | ----------- | ----------------------------------------------- |
| Open in browser     | Enter       | Opens the article in the default browser        |
| Copy link           | Cmd+.       | Copies the URL to the clipboard                 |
| Show category: X    | —           | Filters the list by the current post's category |
| More from: [author] | —           | Filters the list by the current post's author   |
| Show all posts      | Cmd+R       | Resets filters (author/category)                |
| Refresh             | Cmd+Shift+R | Re-fetches the post list                        |
| Extension settings  | —           | Opens the preferences panel                     |

---

## Settings

Available at: **Raycast Preferences → Extensions → Dailyweb.pl Newsy**

| Setting                  | Options                                 | Default    | Description                                |
| ------------------------ | --------------------------------------- | ---------- | ------------------------------------------ |
| Background notifications | on/off                                  | off        | Enable notifications for new posts         |
| Check frequency          | Every hour / Every 3h / Every 6h        | Every hour | How often to check for new posts           |
| Notification category    | All, News, Mobile, Entertainment, Games | All        | Notify only for the selected category      |
| Layout                   | List / Grid                             | Grid       | Grid = cards; List = rows with preview     |
| Grid columns             | 2 / 3                                   | 3          | Number of cards per row (Grid layout only) |
| Posts per page           | 5 / 10 / 15 / 30                        | 5          | How many posts to load at a time           |

---

## Background notifications

The extension includes a hidden background command that checks for new posts. It is disabled by default and does not appear in Raycast's search.

**How to enable:**

1. Raycast Preferences → Extensions → Dailyweb.pl Newsy
2. Next to the _"check for new posts"_ command — toggle it **on**
3. In the extension settings, enable **Enable notifications**

**How it works:**

- Raycast wakes the command every 30 minutes (system granularity)
- On each wake, it checks whether the interval set in preferences (1h/3h/6h) has elapsed — if not, it exits without any action
- If the interval has elapsed: it fetches the latest post (optionally from the selected category)
- Compares it against the last reported ID (stored in LocalStorage)
- If a new post has appeared — it shows a HUD notification with the title
- On first run, it saves the ID without sending a notification (no false positives)

---

## Data source

The extension uses the Dailyweb.pl public WordPress REST API:

```
https://dailyweb.pl/wp-json/wp/v2/posts?_embed&per_page=5&page=1
```

The `_embed` parameter fetches in a single request: the thumbnail (`wp:featuredmedia`), the author with avatar (`author`), and categories (`wp:term`).

**Known limitations:**

- Some Dailyweb.pl posts redirect to stalka.pl or another portal within the same network — the redirect happens at the HTTP server level and the API does not expose the final destination URL
- The excerpt may be empty for some posts — the preview panel will then display only the title

---

## Project structure

```
├── assets/
│   └── icon.png              # Extension icon (512×512, Dailyweb logo)
├── src/
│   ├── index.tsx             # Router: list vs grid
│   ├── posts-list-view.tsx   # List layout
│   ├── posts-grid-view.tsx   # Grid layout
│   ├── background.tsx        # Background command — notifications
│   ├── use-posts-feed.ts     # Post fetching and filters
│   ├── constants.ts          # BASE_URL, LocalStorage keys
│   ├── use-read-posts.ts     # Read posts state
│   └── utils.ts              # decodeHtmlEntities, formatDate, stripHtml
├── package.json              # Extension manifest + dependencies
└── tsconfig.json
```

---

## Development

```bash
npm run dev      # developer mode with hot-reload
npm run build    # production build
npm run lint     # ESLint
```

Stack: TypeScript + React, `@raycast/api ^1.104`, `@raycast/utils ^2.2`.
