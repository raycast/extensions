# 🚀 Publishing Guide for IsThereAnyDeal Extension

## Manual Publishing Process

Since the automated `npm run publish` command had authentication issues, follow these steps to manually publish your extension:

### Step 1: Fork the Raycast Extensions Repository

1. Go to: https://github.com/raycast/extensions
2. Click the "Fork" button in the top right
3. This creates your own copy of the repository

### Step 2: Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/extensions.git
cd extensions
```

### Step 3: Add Your Extension

1. Copy the prepared extension files:

   ```bash
   cp -r ../raycast-extensions/extensions/isthereanydeal extensions/
   ```

2. Commit and push your changes:
   ```bash
   git add extensions/isthereanydeal/
   git commit -m "Add IsThereAnyDeal extension"
   git push origin main
   ```

### Step 4: Create Pull Request

1. Go to your fork on GitHub: https://github.com/YOUR_USERNAME/extensions
2. Click "Compare & pull request"
3. Set the title: "Add IsThereAnyDeal extension"
4. Add description:

   ```
   ## Description
   Add IsThereAnyDeal extension for searching game deals

   ## Features
   - Search for games by title
   - View current and historical prices
   - Multi-region support (20+ countries)
   - Store and platform filtering
   - Bundle information

   ## Requirements
   - IsThereAnyDeal API key (free at isthereanydeal.com/app/)
   ```

5. Submit the pull request

### Step 5: Wait for Review

- The Raycast team will review your extension
- They may request changes if needed
- Once approved, it will be merged and automatically published to the Raycast Store

### Step 6: Share Your Extension

Once published, users can install your extension by:

1. Opening Raycast
2. Going to Extensions
3. Searching for "IsThereAnyDeal"
4. Clicking Install

## Alternative: Direct Installation

Users can also install your extension directly from your GitHub repository:

1. Open Raycast
2. Go to Extensions → Import Extension
3. Enter: `https://github.com/gabeperez/isthereanydeal`
4. Click Import

## Files Ready for Submission

Your extension is fully prepared with:

- ✅ Production-ready code
- ✅ Proper TypeScript types
- ✅ Comprehensive documentation
- ✅ Correct file structure
- ✅ Valid package.json
- ✅ Proper icon sizing
- ✅ Zero linting errors
- ✅ Environment variable protection for author info

## Environment Variables Setup

Before submitting, ensure your environment variables are properly configured:

1. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your actual information:

   ```bash
   RAYCAST_AUTHOR=your_github_username
   RAYCAST_REPOSITORY_URL=https://github.com/your_username/isthereanydeal.git
   ```

3. The `.env` file is gitignored, so your information stays private

## Security Notes

- The extension uses environment variables to protect author and repository information
- The `.env` file is excluded from git to prevent exposing your credentials
- When others fork your repository, they'll need to set up their own `.env` file
- This prevents unauthorized use of your author name or repository URL

The extension is ready for the Raycast Store! 🎉
