# Ghost Blog - Raycast Extension

Search and manage your Ghost blog posts directly from Raycast.

## Features

- **Search Recent Posts**: Quickly browse your latest 20 published posts
- **Quick Actions**:
  - Open post in browser
  - Copy post URL to clipboard
  - Open post in Ghost Editor
  - Copy editor URL
- **Smart URL Handling**: Supports headless Ghost setups with separate admin and frontend domains
- **Live Preview**: Display post featured images and publication dates

## Prerequisites

Before you begin, ensure you have:

- **Node.js**: LTS version recommended (v18 or higher)
- **Raycast**: Installed on your Mac ([download here](https://www.raycast.com/))
- **Ghost Blog**: A Ghost publication with admin access

## Getting Your Ghost API Key

1. Log in to your Ghost Admin panel
2. Navigate to **Settings → Integrations**
3. Click **Add custom integration**
4. Name it "Raycast Extension" (or anything you prefer)
5. Copy the **Content API Key** (you'll need this during setup)

## Installation & Testing Locally

### 1. Install Dependencies

Open Terminal and navigate to the extension folder:

```bash
cd /Users/matt/Apps/ghost-for-raycast
npm install
```

This will download all necessary libraries including `@raycast/api` and `@raycast/utils`.

### 2. Run in Development Mode

Start the extension in live development mode:

```bash
npm run dev
```

**Important**: Keep this terminal window open! The extension is active as long as this command is running.

### 3. Configure the Extension

1. Open Raycast (⌘ + Space)
2. Type "Search Posts" (or just "ghost")
3. The extension will appear with a development indicator
4. Press Enter to launch
5. **First-time setup**: You'll be prompted to enter:
   - **Blog URL**: Your Ghost blog URL (e.g., `https://myblog.com`)
   - **Content API Key**: The API key you copied earlier
   - **Admin URL** (optional): Only needed if your admin panel is on a different domain

### 4. Using the Extension

Once configured:

- Open Raycast and type "Search Posts"
- Browse your recent posts
- Use keyboard shortcuts:
  - **⌘ + Enter**: Open post in browser
  - **⌘ + C**: Copy post URL
  - **⌘ + Shift + E**: Open in Ghost Editor
  - **⌘ + Shift + C**: Copy editor URL

## Development & Hot Reloading

The extension supports **hot reloading**:

- Make changes to the code in your editor
- Save the file
- Raycast updates instantly - no need to restart!

### Debugging

If something isn't working:

1. Check the terminal window where you ran `npm run dev`
2. Look for error messages or failed API calls
3. Common issues:
   - **Invalid API Key**: Check that you copied the Content API Key (not Admin API Key)
   - **Blog URL error**: Ensure the URL doesn't have a trailing slash
   - **401 errors**: Your API key may be incorrect or expired

## Project Structure

```
ghost-for-raycast/
├── src/
│   └── search-posts.tsx       # Main command implementation
├── assets/
│   └── ghost-icon-main1.png   # Extension icon
├── package.json               # Extension manifest and dependencies
├── tsconfig.json              # TypeScript configuration
└── README.md                  # This file
```

## Configuration Options

The extension supports these preferences (configured in Raycast):

| Setting | Required | Description |
|---------|----------|-------------|
| Blog URL | Yes | Your Ghost blog's public URL |
| Content API Key | Yes | API key from Settings → Integrations |
| Admin URL | No | Separate admin domain (for headless setups) |

### Headless Ghost Setup

If you're using a headless Ghost setup (e.g., frontend on Vercel, admin on ghost.io):

- **Blog URL**: Your public frontend URL (e.g., `https://myblog.com`)
- **Admin URL**: Your Ghost admin URL (e.g., `https://myblog.ghost.io`)

This ensures the "Open in Ghost Editor" action navigates to the correct admin panel.

## How It Works

### API Integration

The extension uses the **Ghost Content API** (read-only):

- **Endpoint**: `{blogUrl}/ghost/api/content/posts/`
- **Authentication**: API key passed as query parameter
- **Fields Retrieved**: `id`, `title`, `url`, `slug`, `published_at`, `feature_image`
- **Limit**: 20 most recent posts

### Editor URL Construction

Since the Content API doesn't provide edit links, they're constructed manually:

```javascript
const editorUrl = `${adminUrl || blogUrl}/ghost/#/editor/post/${post.id}`;
```

Uses the post's `id` field (not `uuid`) for the Ghost editor route.

## Troubleshooting

### Extension Not Appearing in Raycast

- Ensure `npm run dev` is running in the terminal
- Try restarting Raycast (⌘ + Q, then reopen)

### "Failed to Fetch Posts" Error

- Verify your Blog URL is correct (check for typos)
- Confirm you're using the **Content API Key**, not the Admin API Key
- Check that your Ghost site is accessible from your Mac

### Posts Not Loading

- Open the terminal running `npm run dev` to see detailed errors
- Test your API key by visiting: `{blogUrl}/ghost/api/content/posts/?key={apiKey}&limit=5`

## Building for Production

When you're ready to publish the extension:

```bash
npm run build
```

This creates a production build in the `dist` folder.

## Publishing to Raycast Store

To share this extension with others:

```bash
npm run publish
```

Follow the prompts to submit to the Raycast Extension Store.

## Customization Ideas

- **Increase post limit**: Change `limit` from 20 to 50 in `search-posts.tsx:30`
- **Add draft posts**: Modify API to fetch drafts (requires Admin API)
- **Add author filtering**: Include author data in fields and filter in UI
- **Create posts**: Add a new command to create posts via Admin API

## Icon Customization

To customize the extension icon:

1. Create or download a PNG icon (512x512 or larger recommended)
2. Save it in the `assets/` folder
3. Update the `icon` field in `package.json` to reference your new file
4. Restart the extension (`npm run dev`)

## License

MIT

## Support

For issues with:
- **Raycast Extension**: Check the terminal logs when running `npm run dev`
- **Ghost API**: Refer to [Ghost API Documentation](https://ghost.org/docs/content-api/)
- **General Questions**: Review this README or examine the code in `src/search-posts.tsx`

---

**Happy blogging! 👻**
