# Cloudflare Cache Purge for Raycast

Quickly clear Cloudflare cache for entire sites or specific URLs directly from Raycast.

## Features

- **Purge Entire Site Cache**: Clear all cached content for any zone in your Cloudflare account
- **Purge Specific URLs**: Remove up to 30 URLs from cache in a single operation
- **Quick Purge**: Fast single-URL purge with automatic zone detection from clipboard
- **Auto Zone Detection**: Automatically matches URLs to the correct Cloudflare zone

## Setup

### 1. Create a Cloudflare API Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Use the "Custom token" template
4. Configure permissions:
   - **Zone** > **Zone** > **Read** (to list your zones)
   - **Zone** > **Cache Purge** > **Purge** (to clear cache)
5. Set Zone Resources to "All zones" or specific zones
6. Create the token and copy it

### 2. Configure the Extension

1. Open Raycast
2. Search for "Cloudflare Cache Purge"
3. Open Extension Preferences (⌘ + ,)
4. Paste your API Token
5. Optionally set a default Zone ID for Quick Purge

## Commands

### Purge Entire Site Cache

Lists all zones in your Cloudflare account. Select a zone and press Enter to purge all cached content.

**Keyboard shortcuts:**
- `Enter` - Purge all cache (with confirmation)
- `⌘ + C` - Copy Zone ID
- `⌘ + Shift + C` - Copy domain
- `⌘ + R` - Refresh zone list

### Purge Specific URLs

1. Select a zone from the list
2. Enter URLs (one per line, max 30)
3. Submit to purge

**Tips:**
- Include full URLs with `https://`
- Include query strings if the cached URL has them
- URLs must belong to the selected zone

### Quick Purge URL

Fast single-URL purge with smart features:

- Automatically reads URL from clipboard
- Auto-detects the correct zone based on domain
- Validates URL format and zone ownership

## API Token Permissions

Minimum required permissions:

```
Zone:Zone:Read
Zone:Cache Purge:Purge
```

For enhanced security, limit the token to specific zones rather than "All zones."

## Limitations

- Maximum 30 URLs per purge request (Cloudflare API limit)
- Cache Tag purging requires Enterprise plan
- Prefix purging requires Enterprise plan

## Troubleshooting

### "Failed to fetch zones"
- Verify your API token has Zone:Read permission
- Check the token hasn't expired
- Ensure you're connected to the internet

### "Failed to purge cache"
- Verify your API token has Cache Purge permission
- Check the URL belongs to a zone you have access to
- Ensure the URL format is correct (includes https://)

### URLs not purging
- Include the exact URL as it appears in browser
- Include query strings if present
- For cached assets, use the full path (e.g., `/css/style.css?v=123`)

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

## License

MIT
