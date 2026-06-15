# Wayback Machine

Quickly open and save webpages in the Wayback Machine.

The [Wayback Machine](https://archive.org/web/) is a digital archive of the World Wide Web, founded by the [Internet Archive](https://archive.org/). It allows users to go "back in time" and see what websites looked like in the past, capturing billions of snapshots over decades.

## Features

- **Open in Wayback Machine**: Instantly find and open the latest snapshot of any webpage.
- **Open Current Tab**: Integration with the Raycast Browser Extension to quickly archive or view the page you're currently browsing.
- **Save to Wayback Machine**: Request a new snapshot of a webpage to ensure it's preserved for the future.
- **Save Multiple URLs**: Archive a list of URLs in one go.
- **Customizable Views**: Choose your default landing page (Snapshot, Calendar, Sitemap, etc.) via preferences.

## Usage

### Open in Wayback Machine

- **Argument**: Provide a URL directly as an argument.
- **Selected Text**: Highlight a URL in any application and run the command.
- **Current Tab**: Use the "Open Current Tab in Wayback Machine" command (requires the Raycast Browser Extension).

### Save to Wayback Machine

- Archive the current page you're viewing or a specific URL to the Internet Archive. This is perfect for preserving content before it changes or disappears.

### Settings & Preferences

You can configure the extension with the following preferences:

**Default View**

Choose which view to open by default when accessing the Wayback Machine:

- **Latest Snapshot**: The most recent archived version.
- **Calendar**: A visual calendar of all snapshots.
- **Site Map**: A visual representation of the site's structure.
- **Summary**: Key details about the site's archival history.
- **Collections**: The specific web archives the site belongs to.

**Check for Snapshots**

Enable this option to verify that an archived snapshot exists before opening the Wayback Machine. When enabled, the extension will check the API and show "No archived version found" if no snapshots exist. This adds a slight delay but provides confirmation. Disabled by default for faster performance.

## Requirements

- To use the **Open Current Tab** command, you must have the [Raycast Browser Extension](https://raycast.com/browser-extension) installed and active.
