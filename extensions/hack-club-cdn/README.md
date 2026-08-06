# Hack Club CDN

Upload files to the [Hack Club CDN](https://cdn.hackclub.com) and manage your uploads,
right from Raycast.

**Requires a Hack Club account.** This extension talks to the Hack Club CDN's API, which is
gated behind "Sign in with Hack Club." If you don't have a Hack Club account, this extension
won't be usable for you.

## Setup

1. Go to [cdn.hackclub.com](https://cdn.hackclub.com) and sign in with your Hack Club account.
2. Visit [cdn.hackclub.com/api_keys](https://cdn.hackclub.com/api_keys) and create a new API key. Copy it, since it's only shown once.
3. In Raycast, open this extension's preferences and paste the key into **API Token**.

## Commands

- **Upload Clipboard File**: the fast path. Copy a file in Finder (or copy a local file
  path, or a link), then run this command. It uploads whatever's on your clipboard and
  copies the resulting CDN link back to your clipboard. We recommend binding this to a
  global hotkey (Raycast Preferences → Extensions → Hack Club CDN → Upload Clipboard File)
  for the fastest workflow.
- **Upload File**: pick a file from disk, or paste in a path, via a form. Slower but more
  deliberate; includes an inline "Undo" action right after uploading.
- **Recent Uploads**: browse, copy links from, and delete files you've uploaded from this
  Mac. This list is stored locally and only reflects uploads made through this extension.
  It can't show uploads made via the CDN website or elsewhere.

## Made a mistake?

If "Upload Clipboard File" uploads the wrong thing, open **Recent Uploads** (your latest
upload is always at the top) and use **Delete from CDN** to remove it.
