# Firebase Firestore Manager for Raycast

A Raycast extension that enables seamless interaction with Google Firestore using a Firebase service account.

## Features

- 🔍 **List Documents** – Retrieve all documents from a Firestore collection.
- 🎯 **Filter & Search** – Query documents based on specific fields and values.
- ✏️ **View Documents** – Quickly inspect document fields.
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
   - Use "Firestore Manage" to browse your collections

## Detailed Usage Guide

### Browsing Collections and Documents

1. **Access Firestore Manage**:
   - Open Raycast and search for "Firestore Manage"
   - The extension will automatically load all collections from your Firestore database

2. **View Documents in a Collection**:
   - Select a collection from the dropdown menu
   - Optionally set a document limit to restrict the number of documents loaded
   - Click "View Documents" to see all documents in the selected collection

3. **Filter Documents**:
   - Toggle "Filter Documents" to enable filtering
   - Specify a field name, operator, and value to filter by
   - Available operators include:
     - Equals (==)
     - Not equals (!=)
     - Less than (<)
     - Less than or equal to (<=)
     - Greater than (>)
     - Greater than or equal to (>=)
     - Array contains
     - Array contains any
     - In
     - Not in
   - For "In" and "Not in" operators, enter comma-separated values
   - For "Array contains any", enter comma-separated values
   - Click "View Documents" to see filtered results

4. **Search by Document ID**:
   - Enter a specific document ID to directly access that document
   - This works with both regular and filtered views

### Working with Documents

1. **View Document Details**:
   - Click on any document in the list to view its full content
   - The document data is displayed in a formatted JSON viewer

2. **Delete Documents**:
   - While viewing a document, click "Delete Document" in the action panel
   - Confirm the deletion when prompted

### Advanced Features

1. **Export Documents**:
   - While viewing a collection, click "Export to JSON" in the action panel
   - The documents will be copied to your clipboard in JSON format

2. **Copy Document ID or Data**:
   - While viewing a document, use the action panel to:
     - Copy Document ID
     - Copy Document Data (as JSON)
     - Copy Field Value (select a specific field to copy)

3. **Open in Firebase Console**:
   - Click "Open in Firebase Console" to view the current document or collection in your browser

4. **Sort Documents**:
   - Click "Sort Documents" in the action panel
   - Choose a field to sort by and the sort direction (ascending/descending)

5. **Reset Service Account**:
   - If you need to change your Firebase project, use "Reset Firebase Service Account"
   - This will remove your current credentials and prompt you to set up a new service account

## Security

Your Firebase service account credentials are stored locally on your machine and are never sent to any external servers. The extension uses these credentials to authenticate directly with the Firebase API.

## Troubleshooting

If you encounter any issues:

1. **Authentication Problems**:
   - Reset your service account configuration and set it up again
   - Ensure your service account JSON is complete and valid
   - Check that your service account has the necessary permissions to access Firestore

2. **Loading Issues**:
   - Verify your internet connection
   - Confirm that your Firebase project has Firestore enabled
   - Check if your Firestore database has the collections you're trying to access

3. **Performance Considerations**:
   - When working with large collections, use document limits to improve performance
   - Use specific filters to narrow down results when possible
   - For very large documents, the JSON viewer might take a moment to render

## Feedback and Support

If you find this extension useful, please consider:
- Rating it in the Raycast Store
- Reporting any bugs or suggesting features through GitHub issues
- Contributing to the project if you're a developer

## License

MIT