# Google Cloud Cli

A lightweight Raycast extension for managing Google Cloud resources efficiently. Access and control your GCP projects, services, IAM, storage, and more—all without leaving Raycast.

## Features

- **Project Management**: Quick access to all your Google Cloud projects with fast switching
- **Compute Engine**: Create and manage virtual machines and persistent disks
- **Cloud Storage**: Browse and manage buckets, objects, and lifecycle rules
- **Cloud Run**: View and manage Cloud Run services and revisions
- **Cloud Logging**: Search and filter logs across all your services
- **Secret Manager**: Securely manage secrets and their versions
- **IAM Management**: View and modify permissions for users, groups, and service accounts
- **Network Services**: Manage VPC networks, subnets, IP addresses, and firewall rules
- **Doctor View**: Diagnose and troubleshoot your gcloud setup

## Prerequisites

- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed on your machine
- A Google Cloud account with at least one project

## Installation

1. Open Raycast
2. Search for "Google Cloud"
3. Click "Install" to add the extension

## Configuration

The extension auto-detects your gcloud CLI installation. No manual configuration required.

If you have a custom gcloud installation path, you can override it in preferences:

1. Open Raycast and search for "Google Cloud"
2. Open the action panel and click "Configure Extension"
3. Set your custom gcloud path (leave empty for auto-detection)

## License

MIT
