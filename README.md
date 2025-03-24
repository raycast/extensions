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

## Screenshots


[Project Selection](./assets/homescreen.png)
[Services View](./assets/services.png)
[IAM Management](./assets/iam.png)

## Prerequisites

- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed on your machine
- A Google Cloud account with at least one project

## Installation

1. Open Raycast
2. Search for "G-Cloud"
3. Click "Install" to add the extension

## Configuration

You can configure the path to your gcloud CLI and caching options in the extension preferences:

1. Open Raycast and search for "Google Cloud"
2. Click "Preferences" in the action panel
3. Set the path to your gcloud CLI (default is "gcloud")
4. Configure cache settings to your preference

## License

MIT
