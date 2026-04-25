# Downloads Manager

Search and organize your downloads

## Delete Latest Download via Deeplink

Use a background deeplink to delete the latest download without focusing Raycast:

```sh
open -g 'raycast://extensions/thomas/downloads-manager/delete-latest-download?launchType=background'
```

Trash mode runs immediately. Permanently Delete mode requires approving a foreground deletion once; after that, the background deeplink can permanently delete without showing a prompt. Use the Toggle Deletion Behavior command to switch between Trash and Permanently Delete.
