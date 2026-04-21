# Search Domain

A powerful Raycast extension for quickly checking domain availability.

## Features

- **Instant Domain Availability Check**: Quickly check if a domain is available for registration
- **Domain Purchase Options**: Direct links to purchase available domains
- **Persistent Query History**: View and manage your previous domain searches (delete single items, clear all)

## Usage

1. Open Raycast and search for "Search Domain"
2. Type a domain name (e.g., "example" or "example.com")
3. Press Enter to search
4. View the availability status.
5. For available domains, use the "Purchase" option to buy the domain

### Keyboard Shortcuts

- **Cmd + Enter**: Search for domain
- **Cmd + B**: Purchase domain (when available)
- **Cmd + H**: Show query history
- **Cmd + N**: Return to search from history view
- **Cmd + Shift + F**: Send feedback
- **Cmd + Shift + C**: Support developer

### History View

In the history view, you can:

- Use the dropdown menu in the search bar to toggle between "Oldest First" and "Newest First" sort order
- Delete individual history items with the Delete key
- Clear all history using the "Clear All History" action

## Technical Details

This extension uses RDAP (Registration Data Access Protocol) to determine domain registration status. It queries the generic RDAP resolver at `https://rdap.org/domain` for all TLDs. The `rdap.org` resolver may redirect requests to the authoritative registry for a given TLD when necessary.

Why this matters:

- Querying a registry-specific RDAP endpoint directly can return `404` (Object not found) if that registry does not serve the requested TLD. A `404` from the wrong registry should not be interpreted as "available." Using the generic `rdap.org` resolver avoids these false positives and returns authoritative registration data.

History management:

- The extension stores recent queries in LocalStorage. You can view the full history with the "View History" action, delete individual history items, or clear all history from the Action menu.

Developer / Local testing:

- Run in development mode: `npm run dev` (requires Raycast dev tooling).
- To perform manual RDAP checks outside the extension, you can use `curl` against `https://rdap.org/domain/{domain}` which will redirect to the registry implementing the TLD.

## Privacy

This extension only sends domain names to the API for checking availability. No personal data is collected or stored outside of your local Raycast environment.

## Support

If you encounter any issues or have suggestions for improvements, please contact the developer through the "Send Feedback" option in the extension.
