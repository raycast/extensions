# Custom Token Authentication Setup

Since your iOS app uses Sign in with Apple, the best way to authenticate the Raycast extension is with a **Custom Firebase Token**.

## What is a Custom Token?

A custom token is a Firebase authentication token that you generate server-side or from your iOS app. It allows you to authenticate users without requiring them to enter credentials.

## Quick Setup (Temporary Solution)

### Option 1: Use Firebase Console to Create Email/Password

The easiest temporary solution:

1. Go to Firebase Console → Authentication
2. Click "Add User"
3. Create an email/password account for the **same user** that uses Sign in with Apple
4. Make sure the `userId` matches your Apple Sign In account
5. Use this email/password in the Raycast extension

### Option 2: Generate a Custom Token (Better)

You have two approaches:

## Approach A: Generate from iOS App

Add this code to your iOS app to generate a custom token:

```swift
// Add this to your iOS app (e.g., in SettingsView)
import FirebaseAuth

func generateCustomTokenForRaycast() async throws -> String {
    guard let currentUser = Auth.auth().currentUser else {
        throw NSError(domain: "Auth", code: 0, userInfo: [NSLocalizedDescriptionKey: "No user signed in"])
    }
    
    // Get the ID token
    let idToken = try await currentUser.getIDToken()
    
    // Display this to the user to copy to Raycast
    return idToken
}
```

Then add a button in your Settings to show this token:

```swift
Button("Generate Raycast Token") {
    Task {
        do {
            let token = try await generateCustomTokenForRaycast()
            // Copy to clipboard
            UIPasteboard.general.string = token
            print("Token copied to clipboard!")
        } catch {
            print("Error: \(error)")
        }
    }
}
```

**Important**: ID tokens expire after 1 hour, so this isn't a permanent solution.

## Approach B: Use Firebase Admin SDK (Permanent)

For a permanent solution, you need to generate a custom token using Firebase Admin SDK:

### 1. Set up Firebase Admin SDK

```bash
npm install firebase-admin
```

### 2. Create a token generator script

```javascript
// generate-token.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const uid = 'YOUR_USER_ID_HERE'; // Your Firebase user ID

admin.auth().createCustomToken(uid)
  .then((customToken) => {
    console.log('Custom Token:');
    console.log(customToken);
  })
  .catch((error) => {
    console.log('Error creating custom token:', error);
  });
```

### 3. Get your Service Account Key

1. Go to Firebase Console
2. Project Settings → Service Accounts
3. Click "Generate New Private Key"
4. Save as `serviceAccountKey.json`

### 4. Get your User ID

Run this in your iOS app to get your user ID:

```swift
if let user = Auth.auth().currentUser {
    print("User ID: \(user.uid)")
}
```

### 5. Generate the token

```bash
node generate-token.js
```

This will output a custom token that **doesn't expire**. Use this in the Raycast extension!

## Best Practice: Add to iOS App

The ideal solution is to add a "Generate Raycast Token" feature to your iOS app:

1. Add a button in Settings
2. Generate a long-lived custom token (using Admin SDK on a backend)
3. Display it to the user with a "Copy" button
4. User pastes it into Raycast preferences

This way, users don't need to deal with email/password authentication at all!

## Troubleshooting

### "Invalid custom token"
- Make sure you're using the correct token format
- Verify your Firebase project ID is correct
- Check that the user ID in the token matches an existing user

### Token expired
- ID tokens expire after 1 hour
- Use Firebase Admin SDK to generate custom tokens that don't expire
- Or implement a refresh mechanism

### User not found
- Make sure the user ID in the custom token exists in Firebase Auth
- Check that you're using the correct Firebase project

## Security Note

Custom tokens are sensitive! Don't share them publicly or commit them to version control. Treat them like passwords.


