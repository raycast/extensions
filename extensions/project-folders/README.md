# Project Folders

Browse creative project folders and jump to Finder, Asana, Google Drive, Frame.io, or Magic Link Machine.

## Setup

After install, Raycast asks for **Projects Root**. Point it at the parent of your year folders, for example `…/Projects`, not `…/Projects/2026`.

## Folder convention

```
YYYY/
  MMDD_Project_Name/
    Asana.html
    Google_Drive.html
    Frame_IO.html
    …other project files
```

Each HTML file is a one-line redirect: `window.location.href = "https://…"`. Missing files just mean that link is absent.

## Preferences

- **Projects Root** - required directory containing `YYYY/` year subfolders
- **Default Link App** - optional app for Drive, Frame.io, and Magic Link Machine links
- **Asana App** - optional. Pick Asana.app to open tasks natively

## Commands

**Search Project Folders** lists every project under the configured root. Open a project to get a grid of links and subfolders.

## Development

```bash
npm install
npm run dev
```
