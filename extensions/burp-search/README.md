# Burp Search

Quick search and launcher for Burp Suite project files from Raycast.

## What it does

Recursively scans a top-level project directory for `.burp` files and lets you open them in Burp Suite. Projects are sorted by last modified date, so the project you used most recently is at the top (Burp writes to the project file while it's open).

The last scan is shown instantly from cache while a full rescan runs in the background, so new, moved and deleted projects are always picked up. Hidden directories, `node_modules` and `~/Library` are skipped.

## Actions

- **Enter**: Open project in Burp Suite
- **Cmd+F**: Show in Finder
- **Cmd+.**: Copy full path to clipboard
- **Cmd+R**: Rescan

## Setup

On first launch Raycast asks for:
- **Search Directory**: Top-level directory containing your projects (searched recursively)
- **Burp Suite App Name**: Name of your Burp app (default: "Burp Suite")
