# Ask Instinct

Ask Instinct directly from Raycast and continue the conversation in a lightweight thread without switching to Messages.

## Setup

1. Open **Raycast Settings → Extensions → Ask Instinct** and confirm the Instinct iMessage address.
2. In **System Settings → Privacy & Security → Full Disk Access**, enable Raycast. This lets the extension watch the local Messages database for replies.
3. Open **Raycast Settings → Launcher → Fallback Commands** and enable **Ask**.

You can now type a question in Raycast and choose **Ask** as the fallback, or open the command directly and enter the optional Question argument.

## Privacy and Safety

- Questions are sent to the configured Instinct address through the macOS Messages app.
- Replies are read locally from the macOS Messages database. The extension queries only incoming messages from the configured address and does not upload message history.
- The first send to an address requires confirmation. You can require confirmation for every send in the extension preferences.
- If Messages cannot confirm a send, check the conversation before retrying to avoid sending the question twice.
