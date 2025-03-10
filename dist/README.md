# Firebase Firestore Manager for Raycast

A Raycast extension that enables seamless interaction with Google Firestore using a Firebase service account.

## Features

- 🔍 **List Documents** – Retrieve all documents from a Firestore collection.
- 🎯 **Filter & Search** – Query documents based on specific fields and values.
- ✏️ **View & Edit** – Quickly inspect and update document fields.
- ➕ **Add & Delete** – Create new documents and remove existing ones.
- ⚡ **Fast & Secure** – Uses Firebase service account for direct API access.

## Setup

1. **Generate a Firebase Service Account Key**:
   - Go to the [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Navigate to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save the JSON file securely

2. **Configure the Extension**:
   - Open Raycast
   - Search for "Setup Firebase Service Account"
   - Paste the entire JSON content of your service account key
   - Click "Save Service Account"

3. **Start Using the Extension**:
   - Once configured, you can use all the features of the extension
   - Use "List Firestore Documents" to browse your collections

## Commands

- **List Firestore Documents**: Browse and search documents in your Firestore collections
- **Setup Firebase Service Account**: Configure your Firebase service account
- **Reset Firebase Service Account**: Reset your service account configuration

## Security

Your Firebase service account credentials are stored locally on your machine and are never sent to any external servers.

## Troubleshooting

If you encounter any issues:

1. Try resetting your service account configuration and setting it up again
2. Ensure your service account has the necessary permissions to access Firestore
3. Check that your Firebase project has Firestore enabled