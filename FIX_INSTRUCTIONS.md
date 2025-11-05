# Quick Fix for PR #22658

Since the repository structure is managed by Raycast's publish tool, here's the manual fix:

## Option 1: Update via GitHub Web Interface

1. Go to: https://github.com/Gunk/extensions (your fork)
2. Navigate to: `extensions/rg-adguard-links/`
3. Click "Add file" → "Create new file"
4. Name it: `CHANGELOG.md`
5. Paste the content from your local `CHANGELOG.md` file
6. Commit directly to the PR branch

## Option 2: Files to Upload

Copy these files to the PR manually on GitHub:

### CHANGELOG.md
Located at: `c:\Users\Admin\Desktop\tool\Tools\vibe coding\raycast extensions\winapps\CHANGELOG.md`

### Updated package.json
Located at: `c:\Users\Admin\Desktop\tool\Tools\vibe coding\raycast extensions\winapps\package.json`

The PR will automatically update with these changes and the checks should pass!
