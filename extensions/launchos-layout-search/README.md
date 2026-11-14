# LaunchOS Layout Search

Find apps using the custom names, aliases, folders, and pages in your LaunchOS layout directly from Raycast. Choose an app to open it, reveal its location in Finder, or copy its path. Hidden apps stay excluded unless you enable them in preferences.

## Setup

1. Install and open [LaunchOS](https://launchosapp.com/) once to populate its layout.
2. Run **Search LaunchOS Layout** in Raycast.

The standard database is `~/Library/Application Support/LaunchOS/LaunchOS.sqlite`. An optional preference allows a different local database location.

## Compatibility and data

LaunchOS has no published automation API or URL scheme for controlling layout settings. This extension reads its local SQLite layout in **read-only mode**, with the format verified against LaunchOS 2.4.0. A future database change may require an extension update. It does not edit your layout, reorganize apps, hide apps, or restore backups. Those actions remain available in LaunchOS’s [documented interface](https://launchosapp.com/features/).

Opening an app checks that the saved location still exists. Unsupported or remote locations are omitted, and incomplete coverage is reported. No layout data is sent to a server.

The icon is derived from the installed official LaunchOS app’s icon. This is an independent integration, not an official Remix Design product.
