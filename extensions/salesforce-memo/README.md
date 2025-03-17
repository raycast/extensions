# Salesforce Memo

This extension allows you to easily create and view memos from Raycast and sync them with Salesforce.

## Features

- Create memos for Salesforce
- View and manage your past memos
- Configure Salesforce connection settings

## Installation

### From Raycast Store

1. Open Raycast
2. Search for "Salesforce Memo"
3. Click Install

### For Development

If you have a development environment:

1. Clone the repository
2. Run the following commands in your terminal:
   ```bash
   cd salesforce-memo
   npm install
   npm run build
   ```
3. Open Raycast, go to Extensions preferences, and select "Import Extension"

## Initial Setup

After installation, you need to configure the following:

1. Open Raycast and type "Salesforce Memo Settings"
2. Enter the following information:
   - **Salesforce URL**: Your Salesforce instance URL (e.g., `https://your-instance.my.salesforce.com`)
   - **Salesforce Username**: Your Salesforce login username (email)
   - **Salesforce Password**: Your Salesforce login password
   - **Salesforce Security Token**: Your Salesforce security token (if required)

## Usage

### Creating Memos

1. Open Raycast and type "Create Memo"
2. Enter the memo content and press Enter
3. Optionally search for and link to a Salesforce record

### Viewing Memos

1. Open Raycast and type "View Memos"
2. Browse your previously created memos
3. Select a memo to view its details

## Troubleshooting

### Connection Issues

1. Verify your connection settings (URL, username, password, security token)
2. Ensure your internet connection is working properly
3. Check for authentication issues on the Salesforce side

## Data Format

By default, this extension uses Salesforce's "ContentNote" object to store memos. You can change this in the settings to use other object types like ContentDocument, Task, or a custom object of your choice.

## Notes

- Node.js 16.0.0 or higher is required
- Salesforce credentials are stored locally using Raycast's secure storage
- This extension adheres to Salesforce API usage limits

## Version

Version: 1.0.0

## Support

If you encounter any issues or have questions, please contact the developer.