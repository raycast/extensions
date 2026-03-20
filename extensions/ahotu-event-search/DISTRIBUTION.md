# Private Distribution Guide

Distribute the Ahotu Event Search Raycast extension to your team without requiring Git or monorepo access.

## Option 1: Standalone Package Distribution (Recommended)

**Best for**: Teams who want a simple, no-Git-required installation process.

### For Maintainers: Create a Release Package

```bash
./create-release.sh v1.0.0
```

This creates a standalone tarball in `release/raycast-ahotu-search-v1.0.0.tar.gz`.

### Distribute the Package

Upload the tarball to one of these locations:

1. **Internal file server** (easiest):
   ```bash
   scp release/raycast-ahotu-search-v1.0.0.tar.gz your-server:/downloads/
   ```
   Share URL: `https://files.yourcompany.com/downloads/raycast-ahotu-search-v1.0.0.tar.gz`

2. **Google Drive / Dropbox**:
   - Upload the tarball
   - Get shareable link
   - Share with team

3. **GitHub Releases** (if using ahotu-site repo):
   ```bash
   gh release create raycast-v1.0.0 release/raycast-ahotu-search-v1.0.0.tar.gz
   ```

4. **Email** (for small teams):
   - Attach the tarball
   - Include INSTALL-FOR-TEAM.md instructions

### For Team Members to Install

Send them these instructions:

```bash
# Download and extract
tar -xzf raycast-ahotu-search-v1.0.0.tar.gz
cd raycast-ahotu-search

# Run installer
./install.sh
```

**No Git required!** ✅

See [INSTALL-FOR-TEAM.md](INSTALL-FOR-TEAM.md) for complete installation instructions.

### Updating the Extension

When releasing a new version:
1. Create new release package: `./create-release.sh v1.0.1`
2. Distribute new tarball
3. Team members download and run `./install.sh` again

---

## Option 2: Raycast Teams (Paid Feature)

If your organization uses **Raycast Teams** (paid tier), you can share extensions privately.

### Setup

1. **Build the extension**:
   ```bash
   npm run build
   ```

2. **Publish to your team**:
   ```bash
   npx @raycast/api@latest publish --organization your-team-name
   ```

3. Team members will see it in their Raycast Store under "Team Extensions"

### Advantages
- ✅ Automatic updates for team members
- ✅ Centralized management
- ✅ No manual installation needed
- ✅ Usage analytics

### Disadvantages
- ❌ Requires Raycast Teams subscription ($8/user/month)

---

## Option 3: Direct File Distribution

Share the extension files directly with team members.

### Setup

1. **Create a distribution package**:
   ```bash
   # In the raycast-ahotu-search directory
   cd ..
   tar -czf raycast-ahotu-search.tar.gz raycast-ahotu-search/
   ```

2. **Share the tar.gz file** via:
   - Company file server
   - Google Drive / Dropbox
   - Internal wiki
   - Email (if small enough)

### For Team Members to Install

1. Extract the archive:
   ```bash
   tar -xzf raycast-ahotu-search.tar.gz
   cd raycast-ahotu-search
   ```

2. Follow standard installation:
   ```bash
   npm install
   npm run dev
   ```

### Disadvantages
- ❌ Manual updates required
- ❌ Version tracking is harder

---

## Option 4: Private npm Registry (Advanced)

For larger organizations with private npm registry.

### Setup

1. **Publish to private npm**:
   ```bash
   npm publish --registry https://your-private-npm-registry.com
   ```

2. **Team members install**:
   ```bash
   npm install -g @your-org/raycast-ahotu-search --registry https://your-private-npm-registry.com
   ```

---

## Recommended Approach

**For most teams**: Use **Option 1 (Monorepo Access)**

- ✅ Free
- ✅ Easy version control (already in ahotu-site repo)
- ✅ Team members can contribute improvements
- ✅ Clear update path
- ✅ Works with existing developer workflows
- ✅ Single source of truth
- ✅ No separate repository to manage

### Quick Start for Monorepo Distribution

1. **Ensure extension is committed**:
   ```bash
   cd /Users/jules/WorldsSportsGroup/ahotu-site
   git add apps/raycast-ahotu-search
   git commit -m "Add Raycast event search extension"
   git push
   ```

2. **Share install instructions** with team (see INSTALL-FOR-TEAM.md):
   - They clone/pull ahotu-site
   - Navigate to `apps/raycast-ahotu-search`
   - Run `npm install && npm run dev`
   - Configure API token in Raycast

---

## Security Considerations

### API Token Distribution

**DO NOT commit API tokens to the repository!**

Options for sharing tokens securely:

1. **Individual tokens** (best):
   - Generate unique API token for each team member
   - Each person configures their own token
   - Can revoke individual access

2. **Shared team token** (easier):
   - Create one token for the team
   - Share via secure password manager (1Password, LastPass)
   - Each person adds to Raycast preferences

3. **Environment-based**:
   - Different tokens for dev/staging/prod
   - Document which URL uses which token

### Repository Access

- Use private GitHub repository
- Only grant access to team members who need it
- Use GitHub Teams for easier management
- Enable 2FA on GitHub accounts

---

## Managing Updates

### For Maintainers

When you make changes:

1. **Commit and push**:
   ```bash
   git add .
   git commit -m "Add feature X"
   git push
   ```

2. **Tag releases** (optional but recommended):
   ```bash
   git tag -a v1.0.1 -m "Fix search bug"
   git push --tags
   ```

3. **Notify team**:
   - Post in Slack/Teams
   - Update changelog
   - Mention in team meeting

### For Team Members

To get updates:

```bash
cd raycast-ahotu-search
git pull
npm install  # Only if package.json changed
```

Then reload in Raycast (⌘ + ⇧ + R)

---

## Troubleshooting for Team Members

### Extension not showing in Raycast

```bash
# Re-import the extension
cd raycast-ahotu-search
npm run dev
```

### Dependencies out of date

```bash
rm -rf node_modules package-lock.json
npm install
```

### API not working

- Check API token is correctly set in Raycast preferences
- Verify API Base URL is correct
- Test API access with curl:
  ```bash
  curl -H "Authorization: Bearer YOUR_TOKEN" \
       "https://core.ahotu.com/v1/a_events/autocomplete?term=marathon"
  ```

---

## Support

For internal support, consider:

- Creating a #raycast-ahotu channel in Slack
- Adding FAQ to company wiki
- Designating a maintainer for the extension
- Setting up office hours for help with installation
