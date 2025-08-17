# DevDocs Extension

Browse [DevDocs](https://devdocs.io/) documenation from Raycast.

## Commands

### Search Documentations

When searching, some of the official aliases from DevDocs will work for an exact match. For example "js" will filter just to the "JavaScript" documentation.

With a selected documentation, you may use the "Save as Quicklink" action to scope future entries search to just this documentation.

### Search Entries

Pass the documentation slug as an argument. For example, use "javascript" or "python~3.12" depending on whether the desired documentation specifies a version.

The `Open in DevDocs` action requires the [DevDocs app](https://github.com/dteoh/devdocs-macos) to be installed.

## Import Documentation Settings

From the [DevDocs web app settings](https://devdocs.io/settings), ensure you have your preferred documentations selected as "Enable," and click the "Export" button to save the JSON file output.

Invoke the "Import Documentation Settings" command, select the file (called `devdocs.json` by default), and run the "Import" action.

Your "enabled" documentations will show up at the top of the "Search Documentations" list for ease of locating. Subsequent imports will overwrite the existing settings. To reset to the default values, invoke the "Clear Local Storage & Cache" action from any command.

## Preferences

### Primary entries action

When viewing a list of documentation entries, the primary action can be configured to open either the entry in your browser (default) or in the DevDocs macOS app. Whichever item is not set by this preference will be available as the secondary action.
