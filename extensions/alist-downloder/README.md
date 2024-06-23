# alist-downloader

mini alist downloader based on raycast

## Overview

This Raycast extension provides a graphical interface for browsing, searching, and downloading files from an Alist instance. It supports various functionalities including file filtering, sorting, and downloading via customizable commands.

## Features
-  **Browse Directory**: Navigate through different directories in your Alist instance.
-  **Search Files**: Quickly search for files within the current directory.
-  **Download Files**: Download files using customizable shell commands.
-  **Copy Download Links**: Easily copy file download links to your clipboard.
-  **Show Only Files**: Filter the display to show only files (excluding directories).
-  **Order by Size**: Sort items in the directory by file size in ascending or descending order.
-  **Access Alist in Browser**: Open your Alist instance in a web browser directly from Raycast.
-  **Shortcut Actions**: Utilize quick keyboard shortcuts for various actions.

## Usage

### Preferences

Set your preferences in Raycast for the following:
-  **Username**: Your Alist username.
-  **Password**: Your Alist password.
-  **Host**: The base URL of your Alist instance (e.g., `https://your-alist-instance.com`).
-  **Download Command**: The command template to use for downloading files. Must include `{url}` and `{filename}` placeholders.

### Actions

-  **Download File**: Download the selected file using the specified command.
-  **Copy Download Link**: Copy the download link for the selected file to the clipboard.
-  **Copy Download Command**: Copy the command to download the file to the clipboard.
-  **Open Directory**: Navigate to the selected directory.
-  **Go Back**: Navigate back to the parent directory.
-  **Show Only Files**: Toggle the filter to show only files.
-  **Refresh**: Refresh the current directory listing.
-  **Open in Browser**: Open the Alist instance in a web browser.
-  **Order by Size Ascending**: Sort items by size in ascending order.
-  **Order by Size Descending**: Sort items by size in descending order.
-  **Copy Token**: Copy the authentication token to the clipboard.
-  **Copy Filename**: Copy the filename of the selected item.

### Keyboard Shortcuts

-  **Shift + Enter**: Go Back
-  **Cmd + F**: Show Only Files
-  **Cmd + Shift + R**: Refresh
-  **Cmd + O**: Open in Browser
-  **Ctrl + A**: Order by Size Ascending
-  **Ctrl + Z**: Order by Size Descending
-  **Cmd + T**: Copy Token
-  **Cmd + C**: Copy Filename
-  **Cmd + Shift + C**: Copy Download Command

## Development

### Directory Structure
```plaintext
src/
  ├── components/
  │   ├── Command.tsx
  │   └── DownloadForm.tsx
  ├── utils/
  │   ├── api.ts
  │   ├── helpers.ts
  │   └── types.ts
  ├── preferences.ts
  index.ts
