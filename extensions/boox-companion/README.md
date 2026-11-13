# BOOX Companion

Browse and control a BOOX device from Raycast through BOOXDrop. File transfers and screen streaming stay on the local network.

## Setup

1. Connect the Mac and BOOX to the same local network.
2. Open BOOXDrop on the BOOX device.
3. Run the **BOOX** command. The extension discovers the device automatically.

If discovery is unavailable on the network, set **Device Address** in the extension preferences. Enter the optional BOOXDrop password there as well.

Screen commands require **Screen Mirroring** to be active in BOOXDrop.

## Features

- Browse the BOOX library, notes, media, and internal storage.
- Upload, download, organize, and remove files and folders.
- Add supported documents to the BOOX Library and select a shelf.
- Quick-send files selected in Finder.
- View the BOOX screen in a native window.
- Copy the full screen or an interactively selected region.
- Show device status and quick actions in the menu bar.

## Development

```sh
npm install
npm run dev
```

The build compiles the included Swift/AppKit screen helper for Apple silicon and Intel Macs, then bundles the signed universal binary as an extension asset.
