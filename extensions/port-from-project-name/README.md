# Port From Project Name

A Raycast extension that generates unique 4-digit ports for your development projects based on the project name.

## Features

- **Deterministic Port Generation**: Same project name always generates the same port
- **Port History**: Keeps track of all generated ports with timestamps
- **Quick Access**: Generate ports directly from Raycast with a simple command
- **History Management**: View, search, and manage your port history

## Installation

1. Install the extension from the Raycast Store
2. No additional setup or configuration required

## Usage

### Generate Port

Use the "Generate port" command in Raycast:

1. Open Raycast
2. Type "Generate port"
3. Enter your project name as an argument
4. The extension will generate and display a unique port for that project

**Example:**
```
Generate port my-react-app
```
This will generate a consistent port number for the "my-react-app" project.

### View Port History

Use the "Port History" command to:

- View all previously generated ports
- See when each port was first created and last updated
- Search through your port history
- Copy port numbers to clipboard
- Delete individual entries or clear all history

## How It Works

The extension uses a deterministic algorithm to generate ports:

1. Creates an MD5 hash of the project name
2. Converts the first 8 characters of the hash to an integer
3. Maps the result to a port number in the range 1000-9999
4. Stores the mapping in local history for future reference

**Port Range:** 1000-9999 (4-digit ports commonly used for development)

## Important Notes

- **Deterministic**: The same project name always generates the same port
- **Collision possibility**: Different project names may occasionally generate the same port. With 9,000 possible ports (1000-9999), collisions are rare but possible in practice (~42% collision probability with 100 projects).

## Privacy

- All data is stored locally on your device
- No information is sent to external servers
- Project names and generated ports are only used locally

## Development

This extension is built with:
- TypeScript
- Raycast API
- React hooks for state management
- Local storage for history persistence

## License

MIT License - feel free to use and modify as needed.

## Support

If you encounter any issues or have feature requests, please check the extension's page in Raycast for updates and support options.
