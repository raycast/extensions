# SauceNAO - Reverse Image Search

[SauceNAO](https://saucenao.com/) lets you do a reverse image search through many art sites. This extension lets you easily initiate a search right from Raycast!

## File.io

Since SauceNAO only accepts image URLs for input, this extension relies on [File.io](https://www.file.io/) for most commands. File.io immediately deletes files after one download which happens when SauceNAO retrieves it.

## Commands

- Selected File
  - Uses your currently selected image in Finder
  - Uses File.io
- Clipboard
  - If you have an image URL in your clipboard already, it will use it directly.
  - If your clipboard contains image data, it will upload it to File.io temporarily.
- URL
  - Manual URL entry direct from the Raycast search bar.

## Setup

You need a valid SauceNAO API key to use this extension. It's completely free to use and only takes a couple minutes to setup.

1. [Register for an account.](https://saucenao.com/user.php)
2. Copy your [API key from here](https://saucenao.com/user.php?page=search-api)
3. Paste it into the extension settings.
