# RepoRay

Quickly open or clone git repositories — directly from Raycast.

## Setup

### 1. Configure Project Directories

In the extension preferences, set **Project Directories** to a comma-separated list of directories you want to scan for git repositories.

```
~/Documents, ~/Work, ~/Projects
```

Each directory is scanned one level deep. Any folder containing a `.git` directory is treated as a repository.

### 2. Configure Editors

Set at least one editor using the **Editor 1** preference. Up to five editors can be configured (Editor 1–5).

- If only one editor is configured, repositories open directly in that editor.
- If multiple editors are configured, selecting a repository presents a list to choose from.

## Commands

### Open Repo

Search your local git repositories by name and open them in an editor.

### Clone Repository

Paste a repository URL and select which of your configured directories to clone it into.

## Preferences

| Preference | Required | Description |
|---|---|---|
| Project Directories | Yes | Comma-separated list of directories to scan |
| Editor 1 | Yes | Primary editor |
| Editor 2–5 | No | Additional editors shown in the selection list |
