# Publishing Marcel Raycast Extension

This guide explains how to publish the Marcel extension to the Raycast Store.

## Prerequisites

### 1. Raycast Account
- Create an account at https://raycast.com
- Your username should match the `author` field in package.json (`saravenpi`)

### 2. Test the Extension
Before publishing, ensure everything works:

```bash
cd raycast
npm install
npm run dev
```

Test all features:
- Quest list loads
- Complete quests works
- Status changes work
- Search functionality
- Error handling (try invalid token)

## Publishing Steps

### Step 1: Login to Raycast

```bash
npx @raycast/api@latest login
```

This will:
- Open your browser for authentication
- Link your CLI to your Raycast account
- Store credentials locally

### Step 2: Final Checks

Run linting and build:

```bash
npm run lint
npm run build
```

Fix any errors that appear.

### Step 3: Publish

```bash
npm run publish
```

Or directly:

```bash
npx @raycast/api@latest publish
```

This will:
1. Validate your extension
2. Check package.json structure
3. Verify icon exists and is correct size
4. Upload to Raycast
5. Submit for review

### Step 4: Follow Prompts

The CLI will ask:
- Confirm extension details
- Verify you're ready to submit
- Show submission status

## What Happens Next

### Review Process
1. Your extension enters the Raycast review queue
2. Raycast team reviews (typically 1-3 business days)
3. You'll receive feedback via email if changes needed
4. Once approved, extension goes live

### What Gets Reviewed
- Code quality and best practices
- User experience
- Error handling
- Security (API token handling)
- Description accuracy
- Icon quality

## After Publishing

### Extension URL
Once approved, your extension will be available at:
```
https://raycast.com/saravenpi/marcel
```

### Installing from Store
Users can then:
1. Open Raycast
2. Search for "Store"
3. Search for "Marcel"
4. Click "Install"

## Updating the Extension

To publish an update:

### 1. Make Changes
Edit your code as needed.

### 2. Update Version
In `package.json`, bump the version following semantic versioning:
- `1.0.0` → `1.0.1` (bug fixes)
- `1.0.0` → `1.1.0` (new features)
- `1.0.0` → `2.0.0` (breaking changes)

### 3. Test
```bash
npm run dev
```

### 4. Publish Update
```bash
npm run build
npm run publish
```

Updates are also reviewed but typically faster than initial submission.

## Troubleshooting

### "Authentication required"
```bash
npx @raycast/api@latest login
```

### "Validation failed"
Check:
- All required package.json fields are filled
- Icon is PNG, 512x512 pixels minimum
- TypeScript compiles without errors
- Dependencies are installed

Run:
```bash
npm run lint
npm run build
```

### "Icon not found"
Verify `assets/icon.png` exists and is referenced correctly in package.json.

### "Build failed"
Check for TypeScript errors:
```bash
npm run build
```

Fix any errors shown.

## Common Issues

### Wrong Author Name
Package.json `author` must match your Raycast username. Update if needed:
```json
{
  "author": "saravenpi"
}
```

### Missing Dependencies
Ensure all dependencies are in package.json:
```bash
npm install
```

### API Token in Code
Never commit API tokens. Use preferences for sensitive data (already configured correctly).

## Resources

- Raycast Developer Docs: https://developers.raycast.com
- Raycast Store: https://raycast.com/store
- Community Slack: https://raycast.com/community
- Example Extensions: https://github.com/raycast/extensions

## Support

If you encounter issues:
1. Check Raycast developer docs
2. Join Raycast Slack community
3. Review similar extensions for examples
4. Contact Raycast support

## Quick Reference

```bash
# Test locally
npm run dev

# Check code quality
npm run lint
npm run fix-lint

# Build for production
npm run build

# Login to Raycast
npx @raycast/api@latest login

# Publish extension
npm run publish

# Publish update (after version bump)
npm run publish
```

Good luck with your submission! 🚀
