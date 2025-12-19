# API Key Vault

Store and retrieve API keys locally from Raycast.

## Commands

- **Find API Key**: Search by key name, tag, application, or service. Selecting an item copies the API key to the clipboard.
- **Create API Key**: Add a new API key entry.
- **Update API Key**: Select an entry (supports partial matching), then edit fields. The API key value stays unchanged unless you enter a new one.
- **Delete API Key**: Select an entry (supports partial matching), then confirm deletion.

## Notes

- **Key names** are normalized to kebab-case and must be globally unique.
- **Storage**: Data is stored locally using Raycast LocalStorage.

## Sync

If you have **Raycast Sync** enabled, the data stored by this extension (via Raycast LocalStorage) should sync across your Raycast installs on the same account. Sync timing may not be instant.

## Privacy

This extension stores data locally on your machine and does not send API keys over the network.
