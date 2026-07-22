# KLIPY GIF Search

Search KLIPY, keep favorites and recents, import your own GIFs, and copy original or web-optimized GIF files from Raycast.

## Setup

Create an API key in the [KLIPY Partner Panel](https://partner.klipy.com/). Raycast asks for the key the first time you open **Search KLIPY GIFs** and stores it as a password preference.

## Commands

- **Search KLIPY GIFs** searches KLIPY and your local library, with dedicated views for favorites, recently used GIFs, local GIFs, and KLIPY results.
- **Import Local GIFs** imports individual GIF files or links folders that are scanned recursively for new GIFs.

Press Enter to copy an optimized GIF, or use the Action Panel to copy the untouched original. The extension supports macOS and Windows and does not require `ffmpeg` or another system binary.

## Size behavior

GIFs at or below the default 500 KB optimization threshold are copied unchanged. Larger GIFs enter the optimization pipeline, whose default target is 2 MB with a maximum dimension of 720 px. If KLIPY already supplies a suitable rendition, it is used directly. Otherwise the extension reduces dimensions, palette size, and—only in later fallback passes—frame rate until it reaches the target.

Imported GIFs are copied into Raycast's extension support folder, so removing or moving the source file does not break your library.

You can also link one or more folders from **Import Local GIFs**. Linked folders are scanned recursively whenever the command opens, and the Refresh action rescans them while it is open. Newly created GIFs appear under Local GIFs automatically. Linked source files are never copied or deleted.
