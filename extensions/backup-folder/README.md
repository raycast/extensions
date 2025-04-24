# Backup Folder

An extension to easily back up a specified folder and manage old archives using GNU Tar (`gtar`).

Quickly create timestamped `.tar.gz` backups of important directories and automatically clean up old archives based on a configurable retention period.

## Installation

1.  Open Raycast Preferences (`⌘` + `,`)
2.  Navigate to the `Extensions` tab.
3.  Click the `+` button in the bottom left and select `Install from Store`.
4.  Search for "Backup Folder" and click `Install`.

## Prerequisites

This extension **requires GNU Tar (`gtar`)** to be installed and accessible on your system PATH or specified directly in the preferences.

- **Verify Installation:** Open your terminal and run `which gtar`. You should see path information if it's installed correctly.
- **Install (macOS with Homebrew):** If you don't have it, you can install it using Homebrew:

  ```zsh
  brew install gnu-tar
  ```
