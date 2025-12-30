# Better Contacts

A fast, native contacts extension for Raycast. Search 700+ contacts instantly. That's an oddly specific number, I know. That's because that's how many contacts I have so that's what I tested with 🙂.

## Features

| Action | Shortcut | Description |
|--------|----------|-------------|
| **Call** | - | Call any phone number (supports multiple numbers) |
| **Email** | - | Opens your default email app with the address prefilled (supports multiple addresses) |
| **Open in Maps** | ⌘M | Get directions to any address (supports multiple addresses) |
| **Copy Phone** | ⌘⇧P | Copy phone number to clipboard |
| **Copy Email** | ⌘⇧E | Copy email address to clipboard |
| **Open in Contacts** | - | Jump to the native Contacts app |
| **Refresh Contacts** | ⌘R | Force sync from Contacts.app |
| **Delete Contact** | ⌃X | Remove contact with confirmation |

## Smart Submenus

When a contact has multiple phone numbers, email addresses, or postal addresses, the extension shows a submenu letting you choose which one to use.

## How It Works

The extension maintains a separate SQLite cache of your contacts for fast searching:

- **Cache location**: `~/Library/Application Support/better-contacts/contacts.db`
- **Auto-refresh**: Cache refreshes automatically every 5 minutes
- **Manual refresh**: Press ⌘R to force sync from Contacts.app
- **Delete**: Removes contact from both the cache and Contacts.app, then auto-refreshes the list
- **New contacts**: Will appear after the next auto-refresh or manual ⌘R

The cache is read-only from the extension's perspective—all changes go through the native Contacts framework.


## Contributing

Press ⌘K in Raycast and choose "Fork Extension" to get started. Raycast will handle the sparse checkout to your desired location. After making changes, run `npm run publish` to contribute back.

## Testing

The extension includes unit tests for critical functionality to ensure quality going forward. Run `npm test` to execute the test suite.

## Requirements

- macOS 12+
- Raycast
- Contacts permission granted to Raycast
