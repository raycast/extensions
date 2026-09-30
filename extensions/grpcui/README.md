# gRPC UI

Save and quickly launch [grpcui](https://github.com/fullstorydev/grpcui) for your gRPC services directly from Raycast.

## Prerequisites

This extension requires [grpcui](https://github.com/fullstorydev/grpcui) to be installed on your system.

**Install via Homebrew:**

```bash
brew install grpcui
```

**Or via Go:**

```bash
go install github.com/fullstorydev/grpcui/cmd/grpcui@latest
```

Make sure `grpcui` is available in your PATH by running `grpcui -version`.

## How It Works

This extension stores your gRPC service URLs and launches them in your preferred terminal with a single command. It simply runs `grpcui <your-url>` in a new terminal tab.

## Features

- **Search Services** — Browse and launch saved services
- **Add Service** — Save a new service URL
- **Import Services** — Bulk import from JSON file

## Supported Terminals

- Terminal (macOS default)
- iTerm
- Ghostty

Configure your preferred terminal in extension settings.

## URL Format

You can save URLs with or without grpcui flags:

```
localhost:9000
-plaintext localhost:9000
-insecure staging.example.com:443
```

## Import JSON Format

To bulk import services, use a JSON file with this structure:

```json
[
  { "title": "My Service", "url": "localhost:9000" },
  { "title": "My Service on staging", "url": "-plaintext staging.example.com:443" }
]
```
