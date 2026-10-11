# QuickDropcast

Send clipboard text, typed text, and files through QuickDrop on macOS. Choose the receiving device in QuickDrop after running a command.

[QuickDrop](https://github.com/leonboe1/QuickDrop) was created by [leonboe1](https://github.com/leonboe1). This independent extension integrates with its macOS sharing extension. QuickDrop is installed separately and handles device discovery and transfers.

## Setup

1. Install [QuickDrop for macOS](https://github.com/leonboe1/QuickDrop/releases), move it to Applications, and open it.
2. In macOS System Settings, search for sharing extensions and enable QuickDrop. The panel location varies by macOS version.
3. Configure your receiving device in QuickDrop. For the first test, keep both devices on the same Wi-Fi network and the recipient visible and unlocked.
4. Confirm that sharing a small file from Finder using Share → QuickDrop works.

The installed extension includes its native helper; users do not need Node, Swift, or Xcode. The helper targets macOS 12 or later; your installed Raycast and QuickDrop versions may require a newer OS.

## Commands

- **Send Clipboard:** copy text, run the command, and choose a recipient.
- **Send Text:** type or paste text, then select **Share with QuickDrop**.
- **Send Files:** choose one or more files, then select **Share with QuickDrop**.

Raycast closes when the sharing interface starts. Confirm receipt on the other device; closing the window does not prove delivery. Cancel in QuickDrop or close the helper window. Check QuickDrop for any transfer that has already started.

Clipboard images and files copied in Finder are not supported; select saved images and documents with Send Files. Compress folders before sharing them. Device favorites, delivery confirmation, and transfer progress in Raycast are not implemented.

## Troubleshooting

- **QuickDrop is missing:** install and open QuickDrop for macOS.
- **Sharing extension is disabled:** enable it in macOS settings and retry sharing from Finder.
- **Device is missing:** check receiving mode, visibility, permissions, and connectivity in QuickDrop.
- **File cannot be read:** select an existing, readable file rather than a folder.
- **Native helper is missing:** reinstall QuickDropcast. Report the issue if it persists.

This Store edition uses US English. QuickDrop and macOS retain their own language settings. Shared text preserves Unicode and line breaks.

## Privacy and implementation

QuickDropcast passes the selected text or file paths to its bundled AppKit helper over stdin. It does not upload content itself, add analytics, or request Keychain access. QuickDrop, Raycast, and macOS have their own behavior and policies. The helper source, build instructions, and hashes are included in `native/` and `NATIVE.md` for review.
