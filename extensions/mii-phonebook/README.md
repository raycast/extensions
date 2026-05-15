# MII Phonebook

A Raycast extension to search the MITRE MII employee phonebook directory.

## Version

Version 2.1 (March 2026)

## Credits

This extension is based on the Alfred workflow "MII Phonebook" created by Jeff Stein (<jstein@mitre.org>).

Originally created by Nate Lee (<nlee@mitre.org>) using Claude Code on 2025-12-04.

## Features

- **Grid View**: Visual grid display with employee badge photos
- **Quick Search**: Search employees by name, email, department, employee ID, or location
- **Relevance Scoring**: Results sorted by how well they match your search terms
- **Rich Details**: View detailed employee information including contact info, location, organization, and total time at MITRE
- **Microsoft Teams Integration**: Quick actions to chat or call via Teams
- **Quick Actions**:
  - View details (Enter)
  - Open employee's phonebook page in browser
  - Copy email address (Cmd+C)
  - Copy phone number (Cmd+Shift+P)
  - Copy mobile number (Cmd+Shift+M)
  - Copy employee number (Ctrl+E)
  - Chat in Teams (Cmd+T)
  - Call in Teams (Cmd+Shift+T)
  - Refresh phonebook data (Cmd+R)
  - Clear all cache (Cmd+Shift+Backspace)

## Requirements

- **MITRE Network Access**: This extension requires access to MITRE's internal network (or VPN) to fetch phonebook data
- The extension connects to:
  - `https://denodo.mitre.org` (employee data via Denodo API)
  - `https://static.mitre.org` (badge photos)

## Installation

1. Make sure you have [Raycast](https://raycast.com/) installed
2. Clone or download this extension
3. Open terminal and navigate to the extension directory
4. Run `npm install` to install dependencies
5. Run `npm run build` to build the extension
6. The extension will appear in Raycast

## Usage

1. Open Raycast
2. Type "Search Phonebook" or "MII"
3. Start typing a name, email, department, or employee ID
4. Press Enter on a result to view details
5. Use keyboard shortcuts for quick actions (see above)
6. Consider adding an Alias in the Extensions settings for quick access (for example, the author uses "pb" for quick access)
7. Check the extension's Preferences (Cmd+K > Extension Preferences) to configure options like automatically closing Raycast when starting a Teams chat/call.

## Search Tips

- Search is case-insensitive
- You can search by multiple terms (e.g., "John Engineering Bedford")
- All search terms must match for a result to appear
- Results are ranked by relevance (more matches = higher score)
- Search fields include:
  - Display name
  - Email address
  - Department code (hr_org)
  - Department name
  - Job title
  - Site name
  - Employee ID
  - Mail stop

## Data Caching

- Phonebook data is cached locally for 24 hours for fast search results
- Use **Cmd+R** to manually refresh data from the server
- Use **Cmd+Shift+Backspace** to clear all cached data
- If offline or off-network, the extension will use stale cached data as a fallback
- Badge photos are loaded directly from MITRE servers (cached by Raycast, not this extension)

## Troubleshooting

### "Failed to load phonebook" error

- Make sure you're connected to the MITRE network (VPN if remote)
- Try using Cmd+R to refresh the data

### "Using cached data" warning

- The extension couldn't reach the server but is showing older cached data
- Connect to the MITRE network and use Cmd+R to refresh

### Photos not loading

- Badge photos require access to `static.mitre.org`
- Make sure you're on the MITRE network

## Development

```bash
# Install dependencies
npm install

# Start development mode (hot reload)
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

## Minimum Files for Distribution

To share this extension with others, include:

```text
mii-phonebook-raycast/
├── assets/
│   └── extension-icon.png
├── src/
│   └── search-phonebook.tsx
├── package.json
├── package-lock.json - ensures consistent dependency versions
├── README.md - instructions for others
└── tsconfig.json
```

Recipients can then run `npm install && npm run build` to install.

## License

MIT
