# Deployment Tracker

A Raycast extension for tracking which commit or version is deployed to each environment. Built for projects that deploy via rsync or other informal pipelines, with no CI/CD.

## What it does

- **Deployment Status**: see the current ref for every environment, with a toggleable detail pane (`⌘D`) showing full hash, deploy time, deployer, and notes
- **Add Deployment**: log a commit hash or version string against an environment, with optional backdating, deployer name, and notes
- **Manage Environments**: define environments once (name, color, description), then pick from a dropdown when logging a deploy
- **Menu Bar**: optionally show a live `deployed/total` count with quick access to all environments

## Usage

Add environments via **Manage Environments**, then log deployments via **Add Deployment** or directly from the **Deployment Status** list.

From the status view:

- `⌘N` - log a new deployment for the selected environment
- `⌘D` - toggle the detail pane
- `⌘C` - copy the current ref
- `⌘⇧C` - copy all environments as a markdown table

## Running locally

```bash
bun install
bun dev
```

The extension loads into Raycast automatically while `dev` is running.

## Data

Stored locally via Raycast's `LocalStorage`. Nothing is sent anywhere.
