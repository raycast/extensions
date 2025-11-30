# Publishing to Raycast Store

## Pre-Publishing Checklist

### 1. Update Author Field
The `author` field in `package.json` must be your **Raycast username** (not GitHub username). 

**Important:** Update line 7 in `package.json`:
```json
"author": "your-raycast-username"
```

To find your Raycast username:
- Go to https://www.raycast.com
- Sign in and check your profile
- Your username is in the URL: `raycast.com/@username`

### 2. Verify Icon
- ✅ Icon is set to `assets/icon.png`
- ✅ Icon exists and is readable
- ⚠️  Icon is 327x327 (Raycast recommends 512x512, but current size should work)

### 3. Build & Test
```bash
npm run build
npm run dev  # Test in development mode
```

### 4. Fix Linting (if needed)
```bash
npm run fix-lint
```

## Publishing Steps

### Step 1: Login to Raycast CLI
```bash
ray login
```

This will open your browser to authenticate with Raycast.

### Step 2: Publish Extension
```bash
ray publish
```

This command will:
- Validate your extension
- Check for required fields
- Upload to Raycast Store
- Make it available for review

### Step 3: Review Process
After publishing:
1. Your extension will be submitted for review
2. Raycast team will review it (usually takes a few days)
3. You'll be notified when it's approved or if changes are needed

## Required Fields Checklist

- ✅ `name`: "instagram-transcriber"
- ✅ `title`: "Instagram Video Transcriber"
- ✅ `description`: Clear description
- ✅ `version`: "1.0.0"
- ⚠️  `author`: **MUST BE YOUR RAYCAST USERNAME** (update this!)
- ✅ `license`: "MIT"
- ✅ `icon`: "assets/icon.png"
- ✅ `categories`: ["Media", "Productivity"]
- ✅ `keywords`: Array of searchable terms
- ✅ `commands`: At least one command defined
- ✅ `preferences`: API key preference defined

## Common Issues

### "Invalid author"
- Make sure you're using your Raycast username, not GitHub username
- Username must exist on Raycast platform

### "Missing file in assets folder"
- Verify `assets/icon.png` exists
- Check file permissions

### Linting Errors
- Run `npm run fix-lint` to auto-fix issues
- Fix any remaining errors manually

## After Publishing

Once published:
- Users can install via Raycast Store
- You can update by running `ray publish` again (bump version first)
- Monitor usage and feedback

## Version Updates

When updating:
1. Update `version` in `package.json` (e.g., "1.0.1")
2. Make your changes
3. Run `npm run build`
4. Run `ray publish`

