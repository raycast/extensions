# Keep.md for Raycast

Search and manage saved Keep.md items from Raycast. The extension provides two commands:

- **Search Bookmarks:** Browse recent items, search by title, URL, notes, and tags, open or copy a URL, edit title/tags, and archive an item.
- **Save Bookmark:** Save an HTTP or HTTPS URL with optional title and tags. A URL on the clipboard fills the form automatically.

## Set up

1. Create a personal or connected-client API key in Keep Settings → Connections → API and agents. See [Keep's API key guide](https://keep.md/docs/api-keys). The key needs item read and write access.
2. Open either Keep.md command in Raycast and paste the key into the **Keep API Key** preference when prompted.

Raycast uses the password preference type for the key. The extension sends it only to `https://keep.md/api` using a Bearer header.

## Troubleshooting

- **Keep 403:** In **Search Bookmarks**, open the Action Panel and choose **Diagnose Keep Connection**. It shows HTTP statuses and Keep error codes for `/me` and `/items` without showing the key or library content. Keep documents 403 for insufficient credential access or a plan restriction. Use a personal or connected-client key from Keep Settings → Connections → API and agents. A read-only key can search within its scope but cannot save, edit, or archive.
- **Duplicate commands:** Raycast may have more than one local registration of this extension. In root search, highlight each duplicate, open its Action Panel, and choose **Copy Folder Path** to identify the source. In Raycast Settings → Extensions, disable or remove the extra registration. If both point to the same folder, restart Raycast and check again.

## Development

Run `npm install` and `npm run dev` to develop the extension. Run `npm run typecheck`, `npm run lint`, and `npm run build` to check it.

API references: [Keep REST API](https://keep.md/docs/api) · [Raycast extension docs](https://developers.raycast.com/)
