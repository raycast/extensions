# Quick Setup Guide

Follow these steps to get your GitHub Copilot Usage Raycast extension up and running.

## Step 1: Create GitHub Personal Access Token

1. **Go to GitHub Token Settings**
   - Visit: https://github.com/settings/tokens?type=beta
   - Or: GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens

2. **Generate New Token**
   - Click **"Generate new token"**
   - Give it a name: `Raycast Copilot Usage`
   - Choose expiration: 90 days (or your preference)

3. **Set Permissions**
   - **Repository access**: Leave as "No access" (we don't need repo access)
   - **Account permissions**:
     - Scroll down to find **"Plan"**
     - Click the dropdown next to "Plan"
     - Select **"Read-only"** (Access: Read-only)

4. **Generate and Copy**
   - Click **"Generate token"** at the bottom
   - **Copy the token immediately** (format: `github_pat_...`)
   - Save it somewhere safe (you won't see it again!)

## Step 2: Import Extension to Raycast

### Option A: Development Mode (Recommended for testing)

1. **Open Raycast**
   - Press `⌘ + Space` to open Raycast

2. **Import Extension Command**
   - Type: `Import Extension`
   - Press Enter

3. **Select Directory**
   - Navigate to: `/Users/tnitish/Developer/Personal Projects/github-copilot-usage`
   - Click "Import"

4. **Raycast will import the extension**
   - You should see a success message

### Option B: Build First (Optional)

```bash
# Navigate to the extension directory
cd /Users/tnitish/Developer/Personal\ Projects/github-copilot-usage

# Build the extension
npm run build

# Then import as in Option A
```

## Step 3: Configure the Extension

1. **Run the Command for the First Time**
   - Open Raycast (`⌘ + Space`)
   - Type: `View Copilot Usage`
   - Press Enter

2. **Enter Your Token**
   - Raycast will prompt you for the GitHub Personal Access Token
   - Paste the token you created in Step 1
   - Press Enter to save

3. **View Your Usage**
   - The extension will automatically fetch your usage data
   - You should see your Copilot Premium usage statistics!

## Step 4: Using the Extension

### View Usage
- Open Raycast: `⌘ + Space`
- Type: `View Copilot Usage` or just `copilot`
- Press Enter

### Refresh Data
- While viewing usage, press `⌘ + R`
- Or select the "Refresh Data" item

### Copy Information
- Select any item
- Press `⌘ + C` to copy to clipboard

## Troubleshooting

### Token Not Working?

**Check Token Permissions:**
```
GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
→ Find your token → Edit → Verify "Plan" is set to "Read-only"
```

**Try Regenerating:**
- Delete the old token
- Create a new one following Step 1
- Update in Raycast preferences

### Can't Find the Extension?

**Verify Import:**
1. Open Raycast
2. Type: `Manage Extensions`
3. Look for "GitHub Copilot Usage" in the list
4. If not there, try importing again

### No Usage Data Showing?

**Possible Reasons:**
- You haven't used Copilot Premium features yet this month
- Usage data is processed daily (today's usage appears tomorrow)
- Token doesn't have correct permissions
- You have Copilot Individual/Business, not Copilot Premium

### Extension Won't Load?

**Check Node/npm:**
```bash
node --version  # Should be 22.14+
npm --version   # Should be 7+
```

**Reinstall Dependencies:**
```bash
cd /Users/tnitish/Developer/Personal\ Projects/github-copilot-usage
rm -rf node_modules package-lock.json
npm install
```

## Updating Your Token

If you need to change or update your token:

1. **Via Extension Command:**
   - Open Raycast
   - Type: `View Copilot Usage`
   - Go to preferences (Raycast will show option if token is invalid)

2. **Via Raycast Preferences:**
   - Open Raycast preferences: `⌘ + ,`
   - Navigate to: Extensions → GitHub Copilot Usage
   - Update the "GitHub Personal Access Token" field
   - Save

## What You'll See

The extension displays:

```
📊 Copilot Premium Usage - January 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Usage Summary - January 2026
  # Total Requests        1,234
  $ Total Cost           $49.36
  🔢 Price per Request    $0.04

Usage by Model
  🔷 GPT-5               834 requests  $33.36
  🔷 Claude-3            400 requests  $16.00

Actions
  🔄 Refresh Data
```

## Need Help?

- Check the main README.md for detailed documentation
- Verify your token has the correct permissions
- Ensure you have GitHub Copilot Premium (not just Business/Individual)
- Check that you're using the billing API correctly

## Next Steps

- Pin the command to your Raycast favorites: Select command → `⌘ + P`
- Set up a keyboard shortcut: Raycast Preferences → Extensions → GitHub Copilot Usage → Record Hotkey
- Check usage regularly to track your Copilot spending

---

**You're all set!** 🎉

Your Raycast extension is ready to show your GitHub Copilot Premium usage anytime you need it.
