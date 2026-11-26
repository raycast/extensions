# Google Cloud CLI

A lightweight Raycast extension for managing Google Cloud resources. Access and control your GCP projects, services, IAM, storage, and more without leaving Raycast.

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
- **Cloud Composer (Airflow)**: Browse environments, DAGs, runs, task logs, failures, performance history, and dataset lineage (read-only)

## Prerequisites

- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed on your machine
- A Google Cloud account with at least one project

## Installation

1. Open Raycast
2. Search for "Google Cloud"
3. Click "Install" to add the extension

## Configuration

The extension auto-detects your gcloud CLI installation. No manual configuration is required.

If you have a custom gcloud installation path, you can override it in preferences:

1. Open Raycast and search for "Google Cloud"
2. Open the action panel and click "Configure Extension"
3. Set your custom gcloud path (leave empty for auto-detection)

## Cloud Composer

Read-only support for Cloud Composer (managed Airflow). Nothing is triggered, cleared, paused, or edited.

### Commands

| Command | What it does |
| --- | --- |
| Composer Environments | Environments in the selected project, with health and version |
| Search Airflow DAGs | DAGs across the project's environments |
| Recent Airflow Failures | Failed DAG runs in a recent window |
| Airflow Datasets & Lineage | Datasets, events, and DAG-to-DAG lineage |
| Airflow DAG Performance | p50/p90 durations, slow-run flags, and slowest tasks |
| Airflow Import Errors | DAG files that fail to parse |
| Discover Composer Environments | Scans the projects you can access for Composer environments |
| Airflow Failures Menu Bar | Failed-run count per environment in the menu bar (off by default) |

You can also open Composer from the hub (**Cloud Composer**).

### What you can do

- Drill from an environment into DAGs, runs, task instances (mapped tasks are grouped), task logs, and XCom links.
- Filter lists with search-bar tokens such as `env:`, `dag:`, `task:`, `tag:`, `owner:`, and `is:failed`. Prefix a token with `-` to exclude matches.
- View duration charts and a run state grid for each DAG and task.
- Explore dataset lineage as lists, as a graph inside Raycast, or as an interactive diagram in your browser.
- Save an environment, DAG, run, task log, or lineage graph with **Save as Quicklink**.

### Good to know

- **Project selection** is shared with the hub. Switch it from any Composer screen with the dropdown or **Switch Project…** (⌘⇧O).
- **Region scanning:** the Composer API has no location wildcard, so every region is checked. This takes a few seconds per project, and results are cached. The menu bar only checks regions where environments were found.
- **Permissions:** Airflow's REST API is called with your gcloud access token. Your account needs a role such as `roles/composer.user` on the environment.
- **Airflow versions:** Airflow 2.x (Composer 2 and 3) is supported. Airflow 3 environments are listed as "not supported yet" and can't be browsed.
- **No extra setup:** Composer uses your existing gcloud path, default region, and selected project.

## License

MIT
