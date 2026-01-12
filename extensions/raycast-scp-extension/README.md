# Raycast SCP Extension

A Raycast extension for transferring files between local and remote servers using SCP with SSH config integration.

## Features

- Upload files from local system to remote servers
- Download files from remote servers to local system
- Automatic SSH config parsing from ~/.ssh/config
- Support for recursive directory transfers
- User-friendly interface with searchable host list

## Installation

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start development mode

## Usage

### Upload Files
1. Open Raycast and search for "Upload Files via SCP"
2. Select a host from your SSH config
3. Choose local files to upload
4. Enter the remote destination path
5. Confirm to start the transfer

### Download Files
1. Open Raycast and search for "Download Files via SCP"
2. Select a host from your SSH config
3. Enter the remote file path
4. Choose local destination directory
5. Confirm to start the transfer

## Requirements

- SSH config file at ~/.ssh/config with configured hosts
- SSH access to remote servers
- Raycast installed

## Development

```bash
# Install dependencies
npm install

# Start development mode
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Fix linting issues
npm run fix-lint

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch
```

## Testing

The project includes comprehensive test coverage using Vitest:

- Unit tests for utilities (SSH config parsing, validation, SCP command building)
- Component tests for UI components
- E2E tests for upload and download workflows

Run tests with `npm run test` or use `npm run test:watch` for development.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
