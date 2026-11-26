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
- **Cloud Composer (Airflow)**: Browse environments, DAGs, runs, task logs, failures, performance history and dataset lineage (read-only)

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

### Cloud Composer

- Open it from the hub (**Cloud Composer**) or from its commands: Composer Environments, Search Airflow DAGs, Recent Airflow Failures, Airflow Datasets & Lineage, Airflow DAG Performance, Airflow Import Errors, and Discover Composer Environments.
- The selected project is shared with the hub. Switch it with the dropdown or **Switch Project…** (⌘⇧O). **Discover** scans the projects you can access for Composer environments, one region at a time.
- The Composer API has no location wildcard, so every region is checked. This takes a few seconds per project and the result is cached.
- The Airflow REST API is called with your gcloud access token. Your account needs a role such as `roles/composer.user` on the environment.
- Supports Airflow 2.x environments (Composer 2 and 3). Airflow 3 environments are listed, but you can't browse them yet.

## License

MIT
