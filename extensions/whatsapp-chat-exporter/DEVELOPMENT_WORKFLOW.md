# Development Workflow for WhatsApp Chat Exporter

## Repository Structure

You have TWO repositories for this extension:

### 1. Standalone Repo (Recommended for development)
**URL**: `https://github.com/IamMohitm/whatsapp-raycast-exporter`
- Your own repository for the extension code
- Where you develop and maintain the code
- Can have issues, releases, and custom documentation
- Full control over the codebase

### 2. Raycast Extensions Fork
**URL**: `https://github.com/IamMohitm/extensions`
- Fork of the official Raycast extensions monorepo
- Contains your extension at: `extensions/whatsapp-chat-exporter/`
- Used ONLY for submitting to Raycast Store
- Automatically managed by `npm run publish`

## Initial Setup

### Step 1: Create Your Standalone Repository

1. Go to https://github.com/new
2. Repository name: `whatsapp-raycast-exporter`
3. Description: "Export WhatsApp chats to JSON or Markdown with media files"
4. Make it **Public**
5. Don't initialize with README (you already have one)
6. Create repository

### Step 2: Add Your Remote

```bash
cd /Users/mo/Developer/whatsapp-raycast-exporter
git remote add origin https://github.com/IamMohitm/whatsapp-raycast-exporter.git
git branch -M main
git push -u origin main
```

## Development Workflow

### Making Changes to Your Extension

```bash
# 1. Make your code changes
vim src/export-chats.tsx  # or any file

# 2. Test locally
npm run dev

# 3. Commit to your repo
git add .
git commit -m "Add new feature X"
git push origin main

# 4. Publish to Raycast Store
npm run publish
```

**Important**: `npm run publish` will automatically:
- Push changes to your Raycast extensions fork
- Update the existing PR (if still in review)
- OR create a new PR (for future updates after approval)

### After Your Extension is Approved

Once your extension is live in the Raycast Store:

#### For Bug Fixes or Features:

```bash
# 1. Work in your standalone repo
git checkout -b feature/new-feature
# Make changes...
git commit -m "Add feature"
git push origin feature/new-feature

# 2. Merge to main
git checkout main
git merge feature/new-feature
git push origin main

# 3. Update version in package.json
# Change: "version": "1.0.0" → "1.1.0"

# 4. Update CHANGELOG.md
# Add your changes under ## [1.1.0]

# 5. Commit version bump
git add package.json CHANGELOG.md
git commit -m "Bump version to 1.1.0"
git push origin main

# 6. Publish update to Raycast
npm run publish
```

This will:
- Create a new PR in the Raycast extensions repo
- Raycast team will review the update
- Once approved, users get the update automatically

### Creating GitHub Releases (Optional but Recommended)

After publishing an update:

```bash
# 1. Tag the release
git tag -a v1.1.0 -m "Release v1.1.0 - Add feature X"
git push origin v1.1.0

# 2. Create release on GitHub
# Go to: https://github.com/IamMohitm/whatsapp-raycast-exporter/releases/new
# - Select tag: v1.1.0
# - Copy changelog for this version
# - Publish release
```

## Two-Repo Sync Strategy

Your workflow with two repos:

```
┌─────────────────────────────────────┐
│  Your Standalone Repo               │
│  github.com/IamMohitm/              │
│  whatsapp-raycast-exporter          │
│                                     │
│  - Development happens here         │
│  - Git history                      │
│  - Issues & Discussions             │
│  - Releases & Tags                  │
└──────────┬──────────────────────────┘
           │
           │ npm run publish
           │
           ▼
┌─────────────────────────────────────┐
│  Raycast Extensions Fork            │
│  github.com/IamMohitm/extensions    │
│                                     │
│  - Automatically managed            │
│  - Contains: extensions/            │
│    whatsapp-chat-exporter/          │
│  - Used only for Raycast PRs        │
└──────────┬──────────────────────────┘
           │
           │ Pull Request
           │
           ▼
┌─────────────────────────────────────┐
│  Official Raycast Extensions        │
│  github.com/raycast/extensions      │
│                                     │
│  - Published extensions             │
│  - Users download from here         │
└─────────────────────────────────────┘
```

## Quick Commands Reference

```bash
# Test locally
npm run dev

# Build for production
npm run build

# Lint and format
npm run lint
npm run fix-lint

# Publish to Raycast Store
npm run publish

# Push to your standalone repo
git push origin main

# Create a new feature branch
git checkout -b feature/my-feature

# Update extension (after v1.0.0 is approved)
# 1. Update version in package.json
# 2. Update CHANGELOG.md
# 3. Commit and push to your repo
# 4. Run: npm run publish
```

## Best Practices

1. **Always develop in your standalone repo first**
2. **Test thoroughly with `npm run dev`** before publishing
3. **Keep CHANGELOG.md updated** with every change
4. **Use semantic versioning**: 
   - Major (2.0.0): Breaking changes
   - Minor (1.1.0): New features
   - Patch (1.0.1): Bug fixes
5. **Create releases on GitHub** for major versions
6. **Respond to Raycast PR feedback quickly**

## Common Scenarios

### Scenario 1: Quick Bug Fix

```bash
# Fix the bug
vim src/utils/export.ts
git commit -am "Fix media export bug"
git push origin main

# Update version (1.0.0 → 1.0.1)
# Update CHANGELOG
git commit -am "Bump version to 1.0.1"

npm run publish
```

### Scenario 2: New Feature

```bash
git checkout -b feature/export-to-csv
# Develop feature...
git commit -m "Add CSV export format"
git push origin feature/export-to-csv

# Create PR in your repo, review, then merge
git checkout main
git merge feature/export-to-csv

# Update version (1.0.0 → 1.1.0)
# Update CHANGELOG
git commit -am "Bump version to 1.1.0"
git push origin main

npm run publish
```

### Scenario 3: Responding to Raycast Review Feedback

```bash
# Make requested changes
git commit -am "Address review feedback: improve error messages"
git push origin main

# Raycast PR updates automatically
npm run publish
```

## Troubleshooting

**Q: My changes aren't showing in the Raycast PR**
A: Run `npm run publish` - it syncs your standalone repo to the fork

**Q: Can I work directly in the extensions fork?**
A: Not recommended - always work in your standalone repo for clean history

**Q: What if I made changes in the fork by mistake?**
A: Pull them to your standalone repo:
```bash
cd /Users/mo/Developer/whatsapp-raycast-exporter
# Add the fork as a remote
git remote add fork https://github.com/IamMohitm/extensions.git
git fetch fork
# Copy changes manually or cherry-pick commits
```

## Summary

✅ **Development**: Your standalone repo
✅ **Publishing**: `npm run publish` handles the fork automatically
✅ **Updates**: Same workflow - commit to standalone, then publish
✅ **Issues/Discussions**: Use your standalone repo
