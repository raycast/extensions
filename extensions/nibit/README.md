# Nibit

Bring your Android phone into your Raycast workflow.

Nibit is a productivity layer for Android that gives you Raycast-style tools anywhere you can type: snippets, quick links, clipboard history, AI transforms, and voice dictation through a secondary keyboard that works alongside Gboard or SwiftKey.

This Raycast extension adds the Mac side of Nibit Push, so you can send text, links, images, and files between Raycast and your Nibit devices without breaking your flow.

## Why Use Nibit with Raycast?

Raycast makes your Mac fast. Nibit brings that same idea to Android.

If you already rely on Raycast for snippets, quick links, and keyboard-driven workflows, Nibit helps those workflows travel with you:

- Send something from your Mac to your Android phone in seconds
- Receive links, notes, screenshots, and files from your phone inside Raycast
- Keep useful text and files in a local Raycast inbox
- Move between Mac and Android without emailing yourself or juggling chat apps
- Import Raycast snippets and quick links into Nibit so your library works on Android too

## What You Can Do

### 📥 Receive Pushes from Android

Open the Nibit Inbox in Raycast to browse recent pushes from your phone or other Nibit devices.

- Preview text, links, images, and files
- Copy text back to your clipboard
- Open links in your browser
- Save or open received files
- Use metadata to see where a push came from

### 📤 Send from Raycast to Your Phone

Use **Send Push** or **Send File** to move content from Raycast to your Nibit devices.

- Send text snippets, notes, and URLs
- Send images and files
- Target all devices or choose a specific one
- Use Quicklinks and script arguments to prefill sends, then confirm before sending

### ⚡ Act on the Latest Push

When you just need the newest thing, use the latest-push commands instead of opening the full inbox.

- **Latest Push** opens the newest received item with useful actions
- **Paste Latest Push** inserts the newest text push into the active app
- **Copy Latest Push** copies the newest push to your clipboard
- **Open Latest Push** opens links, files, and images directly

### 🔄 Stay in Sync

Nibit Push uses realtime delivery when available, with automatic refresh as a fallback. The goal is simple: pushes should appear quickly without you thinking about sync.

## Commands

| Command               | What it does                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------- |
| **Inbox**             | Browse your encrypted push inbox with previews for text, links, images, and files.       |
| **Send Push**         | Send encrypted text or a URL to your Nibit devices.                                      |
| **Send File**         | Send an encrypted file to your Nibit devices.                                            |
| **Latest Push**       | Open the newest received push with context-aware actions.                                |
| **Paste Latest Push** | Paste the newest text push directly into the active app.                                 |
| **Copy Latest Push**  | Copy the newest push to your clipboard.                                                  |
| **Open Latest Push**  | Open the newest push, such as a URL in your browser or a file in Finder.                 |
| **Refresh Inbox**     | Manually sync pending pushes. The inbox also refreshes automatically while it is open.    |
| **Sign out**          | Sign out of Nibit and clear local Raycast sync state.                                    |

## Getting Started

1. Install Nibit on Android from [nibit.app](https://nibit.app).
2. Create or sign in to your Nibit account.
3. Install this extension from the Raycast Store.
4. Run **Inbox**, **Send Push**, or any other Nibit command in Raycast.
5. Sign in with Nibit when prompted.

After sign-in, Raycast is registered as one of your secure Nibit devices and can send and receive pushes.

## Requirements

- A Nibit account
- Nibit Cloud Pro (Push is a Cloud Pro feature)
- At least one other Nibit device, such as your Android phone

## Privacy & Security

Push content is end-to-end encrypted. Nibit’s services help authenticate your account and deliver encrypted messages, but push content is decrypted only on your devices.

The Raycast extension stores its generated API key using Raycast’s secure OAuth token storage. Secure-device keys, inbox metadata, and received-item cache are stored locally in Raycast extension storage. Received files and images are decrypted locally so they can be previewed, copied, pasted, opened, or saved. Signing out clears local auth state, secure-device keys, inbox cache, and stored received files.

## About Nibit

Nibit gives Android a productivity layer for people who live in keyboard-first tools:

- Snippets and text expansion
- Quick links and launcher-style actions
- Persistent clipboard history
- AI text transforms
- Voice dictation
- Raycast JSON import for snippets and quick links
- Cross-device Push between Android, Raycast, and other Nibit surfaces

Learn more at [nibit.app](https://nibit.app).
