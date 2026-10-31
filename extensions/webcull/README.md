# WebCull for Raycast

WebCull is a command center for scattered work. If Raycast is already part of your day, this extension puts your saved links within reach of the keyboard.

Move from a project, a question, or a half-remembered page to the link you need. Search your WebCull bookmarks, open a result or copy its URL, and save a new page to the folder where it belongs. Your library stays in WebCull, with Raycast as an optional way to reach it.

## Find the links you work with

Open **Search WebCull Bookmarks** to search titles, URLs, notes, and tags. Open a saved URL, copy it, or return to its parent folder in WebCull when you need the surrounding context. You can also save the clipboard URL to a result's parent folder.

Search returns up to 25 bookmarks, ordered by recent modification. Filters such as `title:example` and `url:example.com` help narrow the results. For a full URL, use `url:"https://example.com/path"`. Folder paths are not searched.

## Put a new link where it belongs

Open **Save URL to WebCull Stack** to save a URL with an optional title. The clipboard prefills the URL, and you choose Root or a folder before saving. Folder IDs distinguish folders with the same name.

The picker shows Root and up to 100 folders, subject to the response size limit. Use WebCull directly for folders outside that list.

## Connect your WebCull account

1. Open **Manage WebCull Account** in Raycast.
2. Choose **Open WebCull Login** or **Add WebCull Account**.
3. Sign in to WebCull in your browser and select the intended account. Approve only a connection you just started from Raycast.
4. Return to Raycast. The connected account becomes active. Reopen the search or save command after connecting or switching accounts.

You can keep multiple WebCull accounts connected and choose the active one. Logging out revokes the selected Raycast authorization. Logging out all saved accounts affects this Raycast installation, not your other devices.

A paid WebCull account or an active trial is required. Accounts on the iOS app plan cannot use this extension. End-to-end encrypted accounts are not supported in this release; unlocking WebCull in the browser does not unlock Raycast. An internet connection is required.

## Privacy

Connection uses browser approval. You do not enter your WebCull password in Raycast or install the WebCull CLI. Account details and scoped access tokens are stored in Raycast local storage. Search terms and URLs you choose to save are sent directly to WebCull. Search results are held in memory while the command runs.

The extension adds no analytics.
