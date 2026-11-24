# Downloads Manager

Search and organize your downloads

## Preview files

The detail pane shows file metadata. Show Preview also displays text file contents. To preview images, PDFs, and other files on macOS, select a download and press `⌘Y` or choose Quick Look from the Action Panel. Quick Look works in both list and grid layouts.

## Delete Latest Download via Deeplink

Use a background deeplink to delete the latest download without focusing Raycast:

```sh
open -g 'raycast://extensions/thomas/downloads-manager/delete-latest-download?launchType=background'
```

Trash mode runs immediately. Permanently Delete mode requires approving a foreground deletion before background deletion is enabled; after that approval, the background deeplink can permanently delete without showing a prompt. Foreground permanent deletion still asks for confirmation every time. Canceling a foreground permanent deletion disables background permanent deletion until the next foreground approval. Use the Toggle Deletion Behavior command to switch between Trash and Permanently Delete.
