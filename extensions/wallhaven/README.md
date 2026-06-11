# Wallhaven

Browse and download desktop wallpapers from [Wallhaven](https://wallhaven.cc).

## Commands

| Command               | Description                                                        |
| --------------------- | ------------------------------------------------------------------ |
| **Search Wallpapers** | Search wallpapers with filters for category, purity, and sorting   |
| **Top Wallpapers**    | Browse the top-rated wallpapers for a given time range             |
| **My Collections**    | Browse and set wallpapers from your personal Wallhaven collections |
| **Random Wallpaper**  | Instantly set a random wallpaper as your desktop background        |

## Actions (Cmd+K on any wallpaper)

| Action                  | Shortcut | Description                                             |
| ----------------------- | -------- | ------------------------------------------------------- |
| Set on All Desktops     | `↵`      | Download and set the wallpaper on every monitor         |
| Set on Current Desktop  | `⇧⌘W`    | Set the wallpaper only on the active desktop            |
| Preview Wallpaper       | `⌘Y`     | Open a detail view with full metadata and color palette |
| Search Similar          | `⇧⌘S`    | Find wallpapers similar to the selected one             |
| Open in Browser         | `⌘O`     | Open the wallpaper's page on wallhaven.cc               |
| Download                | `⌘D`     | Save the full-resolution image to your download folder  |
| Copy Image to Clipboard | `⇧⌘C`    | Copy the image file directly to your clipboard          |
| Copy Image URL          | `⌘C`     | Copy the direct download URL                            |
| Copy Wallpaper ID       | —        | Copy the wallpaper ID for sharing                       |
| Copy Color Palette      | —        | Copy all dominant colors as hex values                  |

## Setup

### Basic Usage (No API Key Required)

The extension works out of the box — just open **Search Wallpapers** and start browsing SFW content.

### API Key (Optional but Recommended)

An API key unlocks:

- **NSFW content** filtering
- **My Collections** command

To get your API key:

1. Create or log in to your account at [wallhaven.cc](https://wallhaven.cc)
2. Go to [Account Settings](https://wallhaven.cc/settings/account)
3. Scroll to the **API Key** section and copy your key
4. Open Raycast → search **Wallhaven** → press `⌘,` to open preferences
5. Paste the key into **API Key**

### Username (Required for My Collections)

To use **My Collections**, you also need to set your username:

1. Find your username on your [Wallhaven profile](https://wallhaven.cc/settings/account)
2. In extension preferences, enter it in the **Username** field

### Download Directory (Optional)

By default, downloads are saved to `~/Downloads`. You can change this in extension preferences under **Download Directory**.

## Preferences

| Name               | Required | Description                                                              |
| ------------------ | -------- | ------------------------------------------------------------------------ |
| API Key            | No       | Enables NSFW content and collections                                     |
| Username           | No       | Required for My Collections command                                      |
| Download Directory | No       | Where to save downloaded wallpapers (default: `~/Downloads`)             |
| SFW Only           | No       | Always restrict results to SFW content, even when an API key is provided |

## Notes

- The Wallhaven API is rate-limited to **45 requests per minute**
- Search results are paginated at 24 wallpapers per page — scroll to the bottom to load more
- The **Random Wallpaper** command runs silently in the background (no-view mode) and shows a HUD when done
