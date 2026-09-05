# Project Folders

Browse creative project folders and jump to Finder, Asana, Google Drive, Frame.io, or Magic Link Machine.

## How it differs

Project Folders is filesystem-first. It treats an existing `YYYY/MMDD_Project_Name` directory as the project record, discovers it automatically, and groups its local subfolders with redirect files for Asana, Google Drive, and Frame.io. There is no separate project catalog, service API token, or design-file index to maintain.

- **Project Hub** is a general-purpose catalog of manually created projects and web links. Project Folders derives projects and links from the existing folder structure, then adds Finder and subfolder actions, pinning, and Asana gid deeplinks.
- **Design File Finder** locates individual Adobe project files across mounted drives. Project Folders indexes whole production folders instead and keeps each folder connected to its Asana, Drive, Frame.io, and Magic Link Machine destinations.
- **Penpot** provides access to boards in one hosted design service. Project Folders coordinates local folders and multiple existing service links without acting as a client for any one design platform.

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
