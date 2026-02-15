# X Bookmarks

View your X/Twitter bookmarks and likes in Raycast using the [bird CLI](https://bird.fast/).

## Prerequisites

### 1. Install bird CLI

**Using npm (recommended):**

```bash
npm install -g @steipete/bird
```

**Using Homebrew:**

```bash
brew install steipete/tap/bird
```

### 2. Authenticate

Run this command to authenticate with your X/Twitter account:

```bash
bird whoami
```

### 3. Find your bird path

Run this in your terminal:

```bash
which bird
```

Copy the output (e.g., `/opt/homebrew/bin/bird` or `/Users/you/.nvm/versions/node/v20.0.0/bin/bird`).

If the extension doesn't work with the default path, paste this path into the **Bird CLI Path** preference in Raycast.

## Commands

- **View Bookmarks** - Display your bookmarked tweets
- **View Likes** - Display your liked tweets

## Preferences

| Preference | Description |
|------------|-------------|
| Bird CLI Path | Full path to bird binary. Default: `/opt/homebrew/bin/bird` (Apple Silicon) or `/usr/local/bin/bird` (Intel) |
| Default Count | Number of tweets to fetch (default: 20) |

## Troubleshooting

**"command not found" error:**
1. Run `which bird` in your terminal
2. Copy the full path
3. Open Raycast preferences for this extension
4. Paste the path into "Bird CLI Path"

**Windows users:**
Run `where bird` instead of `which bird` to find the path.
