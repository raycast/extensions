# SharePoint Finder

Open a SharePoint file or folder in your browser, run **Open SharePoint in
Finder**, and jump directly to the same item in your locally synced OneDrive
library.

## Requirements

- macOS
- The Raycast browser extension
- The SharePoint document library synced through the OneDrive app

## How to Use

1. Open a SharePoint file or folder in your browser and wait for it to load.
2. Open Raycast and run **Open SharePoint in Finder**.
3. The matching local folder opens, or the matching local file is revealed.

SharePoint Finder automatically detects the Microsoft tenant, SharePoint site,
document library, and local OneDrive Shared Libraries folder. It also supports
multiple Microsoft organizations on the same Mac.

## Privacy

The extension reads the active SharePoint tab URL and title, then checks local
OneDrive paths. It does not request Microsoft Graph access, download files, or
send data to another service.

## Troubleshooting

If the item cannot be found, confirm that the document library is synced with
the OneDrive app and available beneath `~/Library/CloudStorage`. Error
notifications include a **Copy Full Error** action and are written to Raycast's
extension logs.
