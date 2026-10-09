# Aktar Changelog

## [Security Improvements] - 2026-10-09

- Before sending its token, the extension asks the app on Aktar's port to prove it has the same token, so if Aktar isn't running and another program listens on its port, that program gets neither the token nor your files. Needs Aktar for Mac 0.18.0 or Aktar for Windows 0.11.0 or later; older versions show a message asking you to update
- Raycast asks before the AI creates a temporary link, since anyone with it can download the file, even from a private bucket. AI links last 1 hour unless you ask for longer, and 24 hours at most
- AI tools only use a destination you name exactly (its name or bucket), instead of the first one whose name contains the words
- File names from your buckets show as plain text in previews, so a crafted name can't load an image from elsewhere, and links copied as Markdown stay whole when a key has spaces or parentheses
- File names the AI reads lose control and text-direction characters, while the exact keys stay separate so the AI always asks for the right file
- The proof is checked again right before every request that carries the token, so a program that takes Aktar's port after Aktar quits is never trusted

## [Replace Files and Automatic Destination] - 2026-10-07

- Replace File (⌘⇧R, Ctrl+Shift+R on Windows) in Search Uploads and Browse Buckets: pick a new file and Aktar writes it at the same key, so every link already shared shows the new file. The link is copied again, and the list and thumbnails refresh. Needs Aktar for Mac 0.14.0 or Aktar for Windows 0.7.0; older versions ask you to update
- Upload File starts on Automatic: Aktar sends each file to the destination whose Use For claims its type or extension, else to the one selected in Aktar. Pick a destination to upload into a folder
- Search Uploads shows when an upload was replaced
- Upload Clipboard and Upload Selected Files follow Use For too, as they don't name a destination

## [Windows] - 2026-10-05

- The extension now works with Raycast for Windows and Aktar for Windows 0.1.0 or later. Connect to Aktar finds Aktar from the Microsoft Store or from the installer
- Upload Selected Files uploads the files selected in File Explorer on Windows
- Shortcuts that use ⌘ on macOS use Ctrl on Windows
- QR codes saved to Downloads leave out characters Windows doesn't allow in file names
- List icons in Search Uploads and Browse Buckets show thumbnails as soon as they arrive, where they could stay file icons. A selected image gets its thumbnail made too, like a video or PDF does. Thumbnails are made only for a file that stays selected, not for each one passed while moving through the list, and one that failed is tried again when the file is selected again

## [Thumbnails] - 2026-10-05

- Search Uploads and Browse Buckets show thumbnails made by Aktar: photos, but also videos, PDFs and documents, and files in private buckets. The preview shows the thumbnail of a file that isn't an image
- Icons no longer download each full-size image: a thumbnail is a few kilobytes. List icons only use thumbnails Aktar already has; the selected file gets one made if needed
- When thumbnails are off for a destination in Aktar, its files show file-type icons
- Needs Aktar 0.13.0 for Mac or 0.6.0 for Windows. With older versions, images show as before
## [Watched Folders] - 2026-10-03

- Watched Folders command: see the folders Aktar uploads from automatically, with their status, files waiting, uploading, or failed, their destination, and when they last uploaded. Enable or disable a folder, pause watching for 1 hour, until tomorrow, or until you resume it, show a folder in Finder, copy its path, or open Aktar's Watched Folders settings
- Toggle Watching command: pause all watched folders until you resume them, or resume them, with one keystroke
- Watched folders need an Aktar version with watched folders. Older versions show a message asking you to update

## [QR Codes and Renaming] - 2026-10-01

- Show QR Code (⌘⇧Q) in Search Uploads and Browse Buckets, for public links and temporary links. Copy the QR code image or save it to Downloads, or create a new temporary link (⌘R)
- Name field in Upload File: upload a single file under a different name, keeping its extension
- "Already uploaded" when Aktar finds the same file already in the destination and copies its existing link instead of uploading it again (Aktar 0.10.0 or later). Batch messages count only the files actually uploaded
- WebP and AVIF image conversion, `{md5}` and `{sha256}` file names, and files larger than 5 GB are handled by Aktar 0.10.0 for Mac and Aktar 0.3.0 for Windows, with no extension settings needed

## [Delete After] - 2026-09-30

- Delete After option (1, 7, 14, or 30 days) for Upload Clipboard, Upload Selected Files, and Upload File. Aktar puts the file under a `tmp/` folder whose bucket lifecycle rule deletes it on schedule. Needs Aktar 0.5.0 or later
- Search Uploads shows when an expiring upload will be deleted
- Clearer messages when auto-delete isn't set up for the destination yet, with a shortcut to Aktar's settings

## [Initial Version] - 2026-09-28

- Upload Clipboard, Upload Selected Files, and Upload File commands
- Search Uploads with previews, copy formats, and delete
- Browse Buckets: folders, public and temporary links, rename, move, delete, new folder, and upload into a folder
- Connect to Aktar: one-click pairing with the Aktar app
- AI tools to list destinations, search uploads, list bucket files, and create temporary links
