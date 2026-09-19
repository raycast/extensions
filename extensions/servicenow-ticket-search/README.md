# ServiceNow Raycast Extension

A Raycast extension for quickly searching and opening ServiceNow tickets in your browser.

## Features

- 🔍 Search for ServiceNow tickets by number
- 🎫 Support for multiple ticket types:
  - **INC** - Incidents (`incident`)
  - **CHG** - Change Requests (`change_request`)
  - **DMND** - Demands (`dmn_demand`)
  - **ENHC** - Enhancements (`rm_enhancement`)
  - **RITM** - Request Items (`sc_req_item`)
- 🌐 Opens tickets directly in your default browser
- ⚙️ Configurable ServiceNow instance URL
- 📋 Copy ticket number or URL to clipboard

## Installation

### From Source

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Load it into Raycast:
   ```bash
   npm run dev
   ```
   This builds the extension and registers it with your local Raycast, where it
   appears under a "Development" heading. The command watches `src/`, so edits
   reload without a restart. Stop it with Ctrl-C, or via Stop Development in the
   extension's action panel.

### Configuration

After installation, you'll need to configure your ServiceNow instance:

1. Open Raycast preferences (⌘,)
2. Go to Extensions → ServiceNow Ticket Search
3. Enter your ServiceNow instance URL (e.g., `mycompany.service-now.com`)
   - A bare domain is preferred, but a pasted full URL works too: the protocol,
     any path, and trailing slashes are stripped before the link is built

## Usage

1. Open Raycast (⌘Space or your configured hotkey)
2. Type "Search ServiceNow Ticket" or start typing the command name
3. Enter a ticket number in one of these formats:
   - Full ticket number: `INC0012345`, `CHG0012345`
   - Just the number: `12345` (shows all ticket types)
   - Partial prefix: `INC`, `CHG` (filters ticket types)

Short numbers are zero-padded to ServiceNow's 7-digit record width before the
link is built, so typing `12345` opens `INC0012345`. The padded number is what
you see in the list, so you can confirm it before pressing Enter. If your
instance uses a different width, change `TICKET_NUMBER_LENGTH` in
`src/search-ticket.tsx`.

### Actions

- **⏎ Enter** - Open the ticket in your default browser
- **⌘C** - Copy ticket number to clipboard
- **⌘⇧C** - Copy ticket URL to clipboard

### How ticket links are built

Each ticket type is opened against its own ServiceNow table, since a generic
number lookup doesn't reliably resolve across tables:

```
https://<instance>/nav_to.do?uri=<table>.do%3Fsysparm_query%3Dnumber%3D<TICKET>
```

The nav target is percent-encoded because it carries its own `?` and `=`, which
must not be read as separators belonging to `nav_to.do`'s own query string.

| Prefix | Table            |
| ------ | ---------------- |
| INC    | `incident`       |
| CHG    | `change_request` |
| DMND   | `dmn_demand`     |
| ENHC   | `rm_enhancement` |
| RITM   | `sc_req_item`    |

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Fix linting issues
npm run fix-lint

# Run the test suite
npm test

# Re-run tests on change
npm run test:watch
```

### Layout

`src/servicenow.ts` holds the domain logic — input parsing, zero-padding, URL
building — and deliberately imports nothing from `@raycast/api`, so it loads in
a plain Node process and is tested directly in `src/servicenow.test.ts`.
`src/search-ticket.tsx` holds the Raycast component and the icon/colour mapping.

## License

MIT

## Author

babichonnba
