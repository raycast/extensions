# FreshRSS Raycast Extension

Browse and manage your FreshRSS feeds and articles directly from Raycast.

Full technical writeup can be found [here](https://ebourgess.dev/posts/building-a-freshrss-raycast-extension/)

## Features

- **List Feeds** — View all subscribed RSS/Atom feeds with icons
- **Add Feed** — Subscribe to a new RSS/Atom feed by URL, optionally assign to a category
- **Remove Feed** — Unsubscribe from a feed with confirmation
- **Unread Articles** — Browse unread articles with pagination, mark-as-read, and star actions
- **Read Articles** — Browse read articles with pagination, mark-as-unread, and star actions
- **Starred Articles** — Browse starred/favorite articles with pagination, unstar, and read/unread actions
- **Browse by Category** — Navigate articles by category/label folders
- **Search Articles** — Full-text search across all feeds with debounced input and pagination
- **Random Article** — Open a random article from your feeds for serendipitous reading
- **Refresh Feeds** — Force refresh all feeds and clear the local cache
- **Side-by-side Preview** — Read article content next to the list as you navigate
- **Readwise Reader Integration** — Save articles to Readwise Reader with one action
- **Auto Mark as Read** — Optionally mark articles as read when selected in the list or opened in detail view
- **Mark Read on Readwise Save** — Optionally mark articles as read when saving to Readwise Reader
- **Keyboard Shortcuts** — Every action has a keyboard shortcut

## Prerequisites

### 1. Enable the FreshRSS API

In your FreshRSS web interface:

1. Log in as your user
2. Go to **Settings** → **Profile**
3. Under **Authentication**, check **"Allow API access (required for mobile apps)"**
4. Save changes

### 2. Set your API password

The API password is separate from your FreshRSS login password:

1. In **Settings** → **Profile**, find the **"API password (e.g., for mobile apps)"** field
2. Enter a password — this will be your API password for Raycast
3. Save changes

### 3. Verify API access

Click the API link shown next to your API password field (e.g. `https://your-instance.example/api/`). If you see a page with test links, the API is enabled.

## Configuration

Configure the extension in Raycast Preferences:

| Preference   | Description                                      | Example                        |
|-------------|--------------------------------------------------|--------------------------------|
| Base URL    | Your FreshRSS instance URL (without `/api/`)    | `https://your-freshrss-instance`   |
| Username    | Your FreshRSS username                           | `alice`                        |
| API Password| Your FreshRSS **API password** (not your login)  | *(your API password)*          |
| Readwise Token | Your Readwise access token (optional)        | *(from readwise.io/access_token)* |
| Auto Mark as Read | Mark articles as read when selected/opened | Off (checkbox) |
| Mark Read on Readwise Save | Mark articles as read when saving to Readwise | Off (checkbox) |

The API endpoint is constructed automatically as `{Base URL}/api/greader.php`.

## FreshRSS API Endpoints Used

This extension uses the FreshRSS Google Reader-compatible API:

| Operation            | Endpoint                                                                           | Method |
|----------------------|------------------------------------------------------------------------------------|--------|
| Authentication       | `/accounts/ClientLogin`                                                           | POST   |
| Write token          | `/reader/api/0/token`                                                               | GET    |
| List feeds           | `/reader/api/0/subscription/list`                                                  | GET    |
| Add feed             | `/reader/api/0/subscription/quickadd`                                               | POST   |
| Add feed with category | `/reader/api/0/subscription/edit`                                                | POST   |
| Remove feed          | `/reader/api/0/subscription/edit`                                                   | POST   |
| List categories      | `/reader/api/0/tag/list`                                                            | GET    |
| Search articles      | `/reader/api/0/stream/contents/reading-list` (client-side filtering)                | GET    |
| Unread articles      | `/reader/api/0/stream/contents/reading-list` with `xt=user/-/state/com.google/read` | GET    |
| Read articles        | `/reader/api/0/stream/contents/reading-list` with `it=user/-/state/com.google/read` | GET    |
| Starred articles     | `/reader/api/0/stream/contents/reading-list` with `it=user/-/state/com.google/starred` | GET    |
| Articles by category | `/reader/api/0/stream/contents/{categoryId}`                                        | GET    |
| Articles by feed     | `/reader/api/0/stream/contents/{feedId}`                                            | GET    |
| Mark read/unread     | `/reader/api/0/edit-tag`                                                            | POST   |
| Star/unstar          | `/reader/api/0/edit-tag`                                                            | POST   |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Enter` | View article (push to full detail) |
| `Cmd+O` | Open in browser |
| `Cmd+C` | Copy article URL |
| `Cmd+R` | Mark as read / Another random article (in Random Article) |
| `Cmd+U` | Mark as unread |
| `Cmd+S` | Star article |
| `Cmd+Shift+S` | Unstar article |
| `Cmd+Shift+W` | Save to Readwise Reader |
| `Ctrl+Shift+W` | Open Readwise Reader |
| `Cmd+Shift+R` | Refresh |
| `Cmd+L` | Load more articles |

Shortcuts work in both the list view and the pushed detail view.

## Running Locally

1. Install dependencies:

    ```bash
    npm install
    ```

2. Build the extension:

    ```bash
    npm run build
    ```

3. Develop with live reload:

    ```bash
    npm run dev
    ```

4. Lint:

    ```bash
    npm run lint
    ```

## Features Detail

### Side-by-side Preview

Article lists use Raycast's `isShowingDetail` mode to show article content next to the list as you navigate. Press `Cmd+Enter` to push to a full-screen detail view for complete article reading.

### Pagination

Article lists support pagination via the FreshRSS continuation token. Select "Load more articles..." at the bottom of any article list to fetch the next page.

### Search

The "Search Articles" command fetches articles from the reading-list and filters them client-side across title, summary, author, URL, and feed title, with a 300ms debounce to avoid excessive API calls. FreshRSS's Google Reader API does not support server-side search via the `q` parameter. Results render through the same `ArticleList` component, so you get the side-by-side preview, keyboard shortcuts, and all article actions automatically.

### Caching

Feed lists and categories are cached for 5 minutes to reduce API calls. The cache is automatically invalidated when you add or remove a feed, and on explicit refresh.

### Feed Icons

Feed icons from the FreshRSS API are displayed next to feed titles when available.

### Category Browsing

The "Browse by Category" command shows all labels/folders from your FreshRSS account. Select a category to see its articles with full pagination and read/star support.

### Readwise Reader Integration

Set your Readwise access token in Raycast Preferences to enable the "Save to Readwise Reader" action. Articles are saved via the Readwise API (`POST https://readwise.io/api/v3/save/`) with the article URL, title, author, and summary.

Enable the "Mark Read on Readwise Save" preference to automatically mark articles as read when you save them to Readwise Reader.

### Random Article

The "Random Article" command fetches all articles from your FreshRSS instance and opens a randomly selected one in a detail view. Press `Cmd+R` to get another random article. Supports all standard actions including Readwise save, mark read/unread, and star/unstar.

### Feed Management

- **Add Feed** — Form with URL validation and a category dropdown populated from your FreshRSS labels
- **Remove Feed** — Destructive action with confirmation dialog
- **Refresh Feeds** — `no-view` command that clears the cache and re-fetches all feeds

## License

MIT
