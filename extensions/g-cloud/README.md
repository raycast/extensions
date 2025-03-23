# G-Cloud

A lightweight Raycast extension for managing Google Cloud resources efficiently. Access and control your GCP projects, services, IAM, storage, and more—all without leaving Raycast.

## Features

- **Project Management**: Quick access to all your Google Cloud projects
- **Project Caching**: Fast switching between frequently used projects
- **IAM Management**: View and modify permissions for users, groups, and service accounts
- **Storage Management**: Browse and manage buckets, objects, and lifecycle rules
- **Service Hub**: Enable, disable, and manage Google Cloud services
- **Command Caching**: Improved performance through intelligent caching
- **Compute Engine**: Create and manage virtual machines and persistent disks
- **Network Services**: Manage VPC networks, subnets, IP addresses, and firewall rules

## Recent Improvements

- **Storage Enhancements**: Improved bucket deletion with progress indication
- **VM Creation Workflow**: Added VM creation with subnet integration and region validation
- **Network Resource Management**: New service for managing VPC and network resources
- **Reliability Improvements**: Better error handling, timeout management, and validation
- **UI Enhancements**: More informative dropdowns with region compatibility indicators

## Screenshots


[Project Selection](assets/homescreen.png)
[Services View](assets/services.png)
[IAM Management ](assets/iam.png)

## Prerequisites

- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed on your machine
- A Google Cloud account with at least one project

## Installation

1. Clone this repository
2. Navigate to the directory
3. Run `npm install` to install dependencies
4. Run `npm run dev` to start the development server in Raycast

## Configuration

You can configure the path to your gcloud CLI and caching options in the extension preferences:

1. Open Raycast and search for "Google Cloud"
2. Click "Preferences" in the action panel
3. Set the path to your gcloud CLI (default is "gcloud")
4. Configure cache settings to your preference

## Documentation

For detailed information about this extension, see the documentation in the `docs` directory:

- [Caching System](docs/CACHING_SYSTEM.md)
- [Project Structure](docs/PROJECT_STRUCTURE.md)
- [Keyboard Shortcuts](docs/SHORTCUTS.md)

## Service Documentation

- [Compute Engine Service](src/services/compute/README.md)
- [Network Service](src/services/network/README.md)
- [Storage Service](src/services/storage/README.md)
- [IAM Service](src/services/iam/README.md)
- [Service Hub](src/services/servicehub/README.md)

## License

MIT
