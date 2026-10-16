# SharePoint Finder

Open a SharePoint file or folder in your browser, run **Open SharePoint in
Finder**, and jump directly to the same item in your locally synced OneDrive
library.

## Requirements

- macOS
- The Raycast browser extension for automatic tab detection
- The SharePoint document library synced through the OneDrive app

## How to Use

1. Open a SharePoint file or folder in your browser and wait for it to load.
2. Open Raycast and run **Open SharePoint in Finder**.
3. The matching local folder opens, or the matching local file is revealed.

If Raycast cannot read the active tab, copy the SharePoint URL from your
browser's address bar and run the command again. Only a copied HTTPS SharePoint
URL is used, and an active SharePoint tab takes priority.

SharePoint Finder automatically detects the Microsoft tenant, SharePoint site,
document library, and local OneDrive Shared Libraries folder. It also supports
multiple Microsoft organizations on the same Mac.

The tenant and site must match uniquely before any item is opened. Exact site
names take priority over reordered words, then partial names. Ambiguous matches
stop with an error. Shared file links search the matched site's libraries and
require one unique filename.

## Privacy

The extension reads the active SharePoint tab URL and title, or checks the
clipboard for a SharePoint URL when no active tab is available, then checks
local OneDrive paths. It does not request Microsoft Graph access, download
files, or send data to another service.

## Troubleshooting

If the item cannot be found, confirm that the document library is synced with
the OneDrive app and available beneath `~/Library/CloudStorage`. Error
notifications include a **Copy Full Error** action and are written to Raycast's
extension logs.

For browser errors, check that you are signed in to both SharePoint and the
Raycast browser extension. Logs include the failure stage, browser connection,
tab count, and active tab domains, without full tab URLs or clipboard contents.
**Copy Full Error** includes the stage, stack trace, and underlying error.
