# Custom Token Generation for Raycast Extension

## The Problem

Firebase ID tokens (from `getIDToken()`) cannot be used as custom tokens. We need to generate **real custom tokens** using Firebase Admin SDK.

## Solution: One-Time Setup

### Step 1: Get Your Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** (⚙️ icon) → **Service Accounts** tab
4. Click **"Generate New Private Key"**
5. Download the JSON file
6. Save it as `raycast-extension/serviceAccountKey.json`

⚠️ **IMPORTANT**: This file contains sensitive credentials!
- It's already in `.gitignore`
- Do NOT commit it to version control
- Do NOT share it publicly

### Step 2: Get Your User ID

Open your iOS/macOS app and look in the console for your user ID, or run:

```bash
# The app writes this to the auth file
cat ~/Library/Application\ Support/to-do/raycast-auth.json
```

Look for the `userId` field.

### Step 3: Generate Custom Token

```bash
cd raycast-extension
npm install  # Install firebase-admin
npm run generate-token <your-user-id>
```

Example:
```bash
npm run generate-token abc123xyz456
```

This will:
1. Generate a proper custom token using Firebase Admin SDK
2. Write it to `~/Library/Application Support/to-do/raycast-auth.json`
3. The Raycast extension will use this token

### Step 4: Use Raycast Extension

Now open Raycast and type "Add Task" - it should work!

## Token Refresh

Custom tokens don't expire, but Firebase sessions do. To refresh:

```bash
cd raycast-extension
npm run generate-token
```

(It will read the userId from the existing auth file)

## Alternative: Automatic Token Generation

If you want automatic token generation, you could:

1. **Add to iOS/macOS app**: Embed the service account in the app and generate tokens there
2. **Create a backend**: Set up a simple backend service to generate tokens on demand
3. **Use Keychain**: Store long-lived credentials in macOS Keychain

For personal use, the manual approach above is simplest and most secure.

## Troubleshooting

### "serviceAccountKey.json not found"
- Download it from Firebase Console (see Step 1)
- Make sure it's in `raycast-extension/serviceAccountKey.json`

### "No userId provided"
- Either run the iOS app first, or provide userId as argument:
  ```bash
  npm run generate-token YOUR_USER_ID_HERE
  ```

### "Permission denied" or "Unauthorized"
- Make sure the service account key is valid
- Check that you downloaded it from the correct Firebase project

### Still not working?
- Delete the old auth file: `rm ~/Library/Application\ Support/to-do/raycast-auth.json`
- Generate a new token
- Restart the Raycast extension (`npm run dev`)


