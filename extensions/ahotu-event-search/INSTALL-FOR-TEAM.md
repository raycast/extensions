# Installation Guide for Team Members

Quick guide to install the Ahotu Event Search extension for Raycast.

**No Git required!** Just download, extract, and run the installer.

> **💡 Looking for an easier way?** Check out [BETTER-DISTRIBUTION.md](BETTER-DISTRIBUTION.md) for zero-friction installation via Raycast Store (recommended!)

---

## Prerequisites

- ✅ [Raycast](https://raycast.com/) installed
- ✅ Node.js 18+ installed ([download](https://nodejs.org/))
- ✅ Ahotu credentials (email, user token, API key - ask your team lead)

## Quick Install (2 minutes)

### Step 1: Get the Extension Package

Ask your team lead for the latest release package, or download from your internal server.

You'll receive a file like: `raycast-ahotu-search-v1.0.0.tar.gz`

### Step 2: Extract the Package

```bash
# Navigate to your downloads folder
cd ~/Downloads

# Extract the package
tar -xzf raycast-ahotu-search-*.tar.gz

# Enter the directory
cd raycast-ahotu-search
```

### Step 3: Run the Installer

```bash
./install.sh
```

The installer will:
- ✅ Check prerequisites (Raycast, Node.js)
- ✅ Install pnpm if needed
- ✅ Install dependencies
- ✅ Import the extension to Raycast

### Step 4: Configure Your Credentials

1. Open Raycast (⌘ + Space)
2. Type "Search Events"
3. Press ⌘ + , (Command + Comma) to open preferences
4. Configure:
   - **API Base URL**: `https://core.ahotu.com` (already set)
   - **User Email**: Your Ahotu account email
   - **User Token**: Your Ahotu user token
   - **API Key**: Your Ahotu API key

### Step 5: Test It!

1. Open Raycast (⌘ + Space)
2. Type "Search Events"
3. Try: `marathon country:USA @2024`

You should see search results! 🎉

---

## Alternative: Manual Installation

If the installer doesn't work, install manually:

```bash
cd raycast-ahotu-search

# Install pnpm (if needed)
npm install -g pnpm

# Install dependencies
pnpm install

# Import to Raycast
pnpm dev
```

Then configure your credentials as described in Step 4 above.

---

## Getting Your Credentials

Ask your team lead for:
- **User Email**: Your Ahotu account email
- **User Token**: Your authentication token
- **API Key**: Your API key

These credentials are required to authenticate with the Ahotu API.

---

## Usage Tips

### Basic Search
Just type what you're looking for:
- `marathon`
- `boston`
- `triathlon`

### Power Filters

**By Location:**
- `marathon country:USA`
- `triathlon country:FRA`
- `running reg:California`
- `10k reg:"New York"`

**By Date:**
- `marathon @2024`
- `triathlon month:jun`
- `running month:6,7 @2025`

**By Status:**
- `@client` - Only client events
- `status:ok` - Only active events

**Exclude Terms:**
- `marathon -virtual`
- `running -cancelled`

**Combine Filters:**
```
marathon country:USA @2024 -virtual
triathlon month:jun reg:California @client
running status:ok country:GBR @2025
```

### Keyboard Shortcuts

- **Enter** - Open event page (core.ahotu.com/events/{id})
- **⌘ + O** - Open in admin panel
- **⌘ + I** - Copy event ID
- **⌘ + N** - Copy event name
- **⌘ + U** - Copy event URL

---

## Updating the Extension

When a new version is released:

1. Download the new package
2. Extract it
3. Run `./install.sh` again

Or update manually:
```bash
cd raycast-ahotu-search
pnpm install  # If dependencies changed
```

Then reload in Raycast: ⌘ + ⇧ + R

---

## Troubleshooting

### "pnpm: command not found"

Install pnpm:
```bash
npm install -g pnpm
```

Or let the installer do it for you.

### "Extension not found in Raycast"

Re-import:
```bash
cd raycast-ahotu-search
pnpm dev
```

### "API request failed: 401"

Your credentials are incorrect or expired:
1. Verify all three credentials are set correctly
2. Get new credentials from your team lead if needed
3. Update in Raycast preferences (⌘ + ,)

### "No results appearing"

1. Check all your credentials are set correctly
2. Try a simple search: `marathon`
3. Remove filters and try again
4. Check Raycast console: ⌘ + ⇧ + D (in dev mode)

### "Module not found" errors

Re-install dependencies:
```bash
cd raycast-ahotu-search
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

## Where's the Extension Installed?

The extension files are in the folder where you extracted the package.

You can move it anywhere you like, for example:
```bash
mv raycast-ahotu-search ~/Applications/
```

Raycast will keep working as long as you don't delete the folder.

---

## Need Help?

- 💬 Ask in your team Slack/Teams channel
- 📧 Contact your extension maintainer
- 📖 Check [README.md](README.md) for full docs
- 🔧 See [QUICK-START.md](QUICK-START.md) for basics

---

## What's Next?

Customize your experience:

1. **Set a keyboard shortcut** for instant access
2. **Alias the command** - type "events" instead of "Search Events"
3. **Pin to favorites** in Raycast

To customize:
1. Open Raycast
2. Find "Ahotu Event Search"
3. Press ⌘ + K → "Configure Extension"
