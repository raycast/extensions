# Quick Start Guide

Install the Ahotu Event Search Raycast extension in under 2 minutes.

## For Team Members (No Git Required!)

### Option 1: Download & Install (Easiest)

1. **Get the extension package** from your team lead or internal server
2. **Extract and install**:
   ```bash
   tar -xzf raycast-ahotu-search-*.tar.gz
   cd raycast-ahotu-search
   ./install.sh
   ```
3. **Configure** in Raycast:
   - Open Raycast (⌘ + Space)
   - Type "Search Events"
   - Press ⌘ + , to configure
   - Set **User Email**, **User Token**, and **API Key** (ask your team lead)

That's it! 🎉

### Option 2: One-Line Install (If Available)

If your team has set up a web installer:

```bash
curl -fsSL <YOUR_TEAM_URL> | bash
```

Ask your team lead for the installation URL.

---

## Configuration

After installation, set your credentials:

1. Open Raycast (⌘ + Space)
2. Type "Search Events"
3. Press ⌘ + , (Command + Comma)
4. Set:
   - **API Base URL**: `https://core.ahotu.com` (default)
   - **User Email**: Your Ahotu account email
   - **User Token**: Your authentication token
   - **API Key**: Your API key (all from team lead)

---

## Quick Search Examples

Try these searches:

```
marathon country:USA @2024
triathlon month:jun
running -virtual @client
boston
```

### Available Filters

- **Country**: `country:USA`, `country:FRA`
- **Year**: `@2024`, `@2025`
- **Month**: `month:jun`, `month:6,7`
- **Region**: `reg:California`, `reg:"New York"`
- **Exclude**: `-virtual`, `-cancelled`
- **Client only**: `@client`
- **Status**: `status:ok`, `status:archived`

---

## Keyboard Shortcuts

- **Enter** → Open event page (core.ahotu.com/events/{id})
- **⌘ + O** → Open in admin panel
- **⌘ + I** → Copy event ID
- **⌘ + N** → Copy event name
- **⌘ + U** → Copy event URL

---

## Troubleshooting

### "pnpm: command not found"

Install pnpm:
```bash
npm install -g pnpm
```

### "API request failed: 401"

Your credentials are incorrect:
1. Verify all three credentials (email, token, API key) are set correctly
2. Get new credentials from your team lead if needed
3. Update in Raycast preferences (⌘ + ,)

### "Extension not appearing"

Re-import:
```bash
cd raycast-ahotu-search
pnpm dev
```

---

## Getting Help

- 📖 See [README.md](README.md) for full documentation
- 💬 Ask in your team Slack channel
- 📧 Contact the extension maintainer

---

## For Maintainers

### Creating a Release

```bash
./create-release.sh v1.0.0
```

This creates a tarball in `release/` that you can distribute to the team.

### Distribution Options

1. **Internal file server** - Upload tarball
2. **Google Drive/Dropbox** - Share download link
3. **GitHub Releases** - Attach to release
4. **Email** - Send directly (if small)

See [DISTRIBUTION.md](DISTRIBUTION.md) for details.
