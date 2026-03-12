# Colima — Raycast Extension

Manage [Colima](https://github.com/abiosoft/colima) virtual machine instances and Docker environments directly from Raycast.

## Prerequisites

- [Raycast](https://raycast.com/) installed on macOS
- [Colima](https://github.com/abiosoft/colima) installed (`brew install colima`)
- [Docker CLI](https://docs.docker.com/engine/install/) installed (`brew install docker`)

## Commands

| Command                    | Description                                                             |
| -------------------------- | ----------------------------------------------------------------------- |
| **List Colima Instances**  | View, start, stop, delete, and create Colima VM instances               |
| **List Docker Containers** | View, start, stop, restart, and remove Docker containers                |
| **List Docker Images**     | View and remove Docker images                                           |
| **Pull Docker Image**      | Pull a Docker image from a registry                                     |
| **Run Docker Container**   | Run a new container from an image with a structured form or raw command |

## Development

```bash
# Install dependencies
npm install

# Start development mode with hot reload
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Lint with auto-fix and formatting
npm run fix-lint
```

## License

MIT
