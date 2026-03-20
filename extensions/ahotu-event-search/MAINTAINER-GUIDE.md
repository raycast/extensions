# Maintainer Guide

Guide for maintaining and distributing the Ahotu Event Search Raycast extension.

## Quick Reference

```bash
# Create a release
./create-release.sh v1.0.0

# Test locally
pnpm install
pnpm dev

# Build for production
pnpm build
```

## Creating a New Release

### 1. Prepare the Release

Make sure all changes are committed and tested:

```bash
cd /path/to/ahotu-site/apps/raycast-ahotu-search

# Test the extension locally
pnpm install
pnpm dev

# Check in Raycast that everything works
# Try some searches: marathon country:USA @2024
```

### 2. Create Release Package

```bash
./create-release.sh v1.0.0
```

This creates: `release/raycast-ahotu-search-v1.0.0.tar.gz`

The script automatically:
- ✅ Copies necessary files (src, configs, docs)
- ✅ Creates a standalone install.sh
- ✅ Packages everything in a tarball
- ✅ Shows distribution instructions

### 3. Distribute to Team

Choose one of these distribution methods:

#### Option A: Internal File Server (Recommended)

```bash
# Upload to your server
scp release/raycast-ahotu-search-v1.0.0.tar.gz user@files.yourcompany.com:/downloads/

# Share the URL with team
echo "Download: https://files.yourcompany.com/downloads/raycast-ahotu-search-v1.0.0.tar.gz"
```

#### Option B: Google Drive / Dropbox

1. Upload `release/raycast-ahotu-search-v1.0.0.tar.gz`
2. Get shareable link
3. Share in Slack/Teams with installation instructions

#### Option C: GitHub Release (if ahotu-site is on GitHub)

```bash
gh release create raycast-v1.0.0 \
  release/raycast-ahotu-search-v1.0.0.tar.gz \
  --title "Raycast Extension v1.0.0" \
  --notes "See INSTALL-FOR-TEAM.md for installation instructions"
```

#### Option D: Email (Small Teams)

1. Attach `release/raycast-ahotu-search-v1.0.0.tar.gz`
2. Include these instructions:

```
Installation:
1. Extract: tar -xzf raycast-ahotu-search-v1.0.0.tar.gz
2. Install: cd raycast-ahotu-search && ./install.sh
3. Configure API token in Raycast preferences
```

### 4. Share Installation Instructions

Send team members link to one of:
- **QUICK-START.md** - Ultra-simple guide
- **INSTALL-FOR-TEAM.md** - Detailed with troubleshooting

Or share this message:

```
🚀 New Raycast Extension Available!

Search Ahotu events directly from Raycast.

Installation (2 minutes):
1. Download: [link to tarball]
2. Extract: tar -xzf raycast-ahotu-search-*.tar.gz
3. Install: cd raycast-ahotu-search && ./install.sh
4. Configure API token in Raycast (⌘ + ,)

Try: marathon country:USA @2024

Questions? See INSTALL-FOR-TEAM.md
```

---

## Version Management

### Semantic Versioning

Use semantic versioning: `vMAJOR.MINOR.PATCH`

- **MAJOR** (v2.0.0): Breaking changes, major new features
- **MINOR** (v1.1.0): New features, backwards compatible
- **PATCH** (v1.0.1): Bug fixes, minor improvements

### Keeping a Changelog

Update a CHANGELOG.md with each release:

```markdown
## [1.0.1] - 2024-03-20
### Fixed
- Fixed search with special characters
- Improved error handling for 401 responses

## [1.0.0] - 2024-03-15
### Added
- Initial release
- Event search with filters
- Keyboard shortcuts for common actions
```

---

## Testing Before Release

### Local Testing Checklist

- [ ] `pnpm install` works
- [ ] `pnpm dev` imports successfully
- [ ] Basic search works: `marathon`
- [ ] Filters work: `marathon country:USA @2024`
- [ ] Keyboard shortcuts work (⌘+I, ⌘+N, ⌘+U)
- [ ] API token configuration works
- [ ] Event links open correctly
- [ ] No console errors

### Release Package Testing

```bash
# Create test release
./create-release.sh test

# Extract and test
cd /tmp
tar -xzf /path/to/release/raycast-ahotu-search-test.tar.gz
cd raycast-ahotu-search
./install.sh

# Verify it works in Raycast
```

---

## Updating the Extension

### Adding New Features

1. Make changes in the monorepo:
   ```bash
   cd /path/to/ahotu-site/apps/raycast-ahotu-search
   # Make your changes
   pnpm dev  # Test locally
   ```

2. Test thoroughly

3. Update version in package.json

4. Create release package

5. Distribute to team

### Bug Fixes

Same process as features, but use PATCH version bump.

---

## Team Support

### Common Issues

**"pnpm: command not found"**
→ Install pnpm: `npm install -g pnpm`
→ Or let install.sh do it

**"API request failed: 401"**
→ Check API token is correct
→ Generate new token if expired

**"Extension not showing"**
→ Re-run: `pnpm dev`
→ Check Raycast Extensions preferences
→ Restart Raycast

### Getting Feedback

Create a feedback channel:
- Slack/Teams: `#raycast-ahotu` or `#tools`
- Regular check-ins with users
- Track feature requests

### API Token Management

Options for API tokens:

1. **Individual tokens** (most secure):
   - Generate unique token per user
   - Can revoke individually
   - Track usage per user

2. **Team token** (easier):
   - One shared token
   - Store in 1Password/LastPass
   - Easier to manage

Document token location in team wiki.

---

## Monorepo Integration

The extension lives in: `ahotu-site/apps/raycast-ahotu-search`

### Committing Changes

```bash
cd /path/to/ahotu-site
git add apps/raycast-ahotu-search
git commit -m "Update Raycast extension: <description>"
git push
```

### Pulling Updates

If team members have the monorepo, they can update:

```bash
cd /path/to/ahotu-site
git pull
cd apps/raycast-ahotu-search
pnpm install  # If dependencies changed
```

---

## Advanced: Web Installer (Optional)

For even easier distribution, set up a web installer:

1. Host `web-install.sh` on your server
2. Set the `DOWNLOAD_URL` environment variable
3. Team installs with:
   ```bash
   curl -fsSL https://yourcompany.com/install-raycast.sh | bash
   ```

See `web-install.sh` for details.

---

## Troubleshooting

### Release Script Fails

```bash
# Check permissions
chmod +x create-release.sh

# Check tar is available
which tar

# Run with verbose output
bash -x create-release.sh v1.0.0
```

### Extension Won't Import

```bash
# Check Raycast is running
pgrep -l Raycast

# Try manual import
cd raycast-ahotu-search
pnpm install
pnpm dlx @raycast/api@latest import
```

---

## Resources

- **Raycast Docs**: https://developers.raycast.com/
- **pnpm Docs**: https://pnpm.io/
- **Ahotu API**: Internal documentation
- **Team Wiki**: [Add your wiki link here]

---

## Checklist: Complete Release Process

- [ ] Test changes locally
- [ ] Update version in package.json
- [ ] Update CHANGELOG.md (if exists)
- [ ] Run `./create-release.sh vX.Y.Z`
- [ ] Test release package
- [ ] Upload to distribution location
- [ ] Share download link with team
- [ ] Share installation instructions
- [ ] Monitor for issues/questions
- [ ] Update team wiki if needed

---

## Questions?

Contact: [Your contact info]
Slack: [Your team channel]
