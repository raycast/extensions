# Burp Search

Quick search and launcher for Burp Suite project files from Raycast.

## What it does

Recursively scans a directory for `.burp` files and lets you open them in Burp Suite. Uses a smart cache so it only scans for new/modified files after the first run, which makes it fast even with lots of projects.

Projects are sorted by last modified date, so your most recent work is at the top.

## Actions

- **Enter**: Open project in Burp Suite
- **Cmd+F**: Show in Finder
- **Cmd+.**: Copy full path to clipboard
- **Cmd+R**: Clear cache and rescan everything

## Setup

Configure two preferences:
- **Search Directory**: Where to look for `.burp` files (searches recursively)
- **Burp Suite App Name**: Name of your Burp app (default: "Burp Suite Professional")

## How the cache works

First run does a full scan. After that, it only looks for files newer than the cache, then merges them with cached results. If you move/rename projects or want to force a full rescan, use Cmd+R.
