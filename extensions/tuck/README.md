# Tuck for Raycast

Tuck a thought from Raycast into [Tuck](https://tuckthis.app), the end-to-end encrypted second brain. The command sends the line to the Tuck menu bar app on this Mac (`127.0.0.1` only), and the app files it into your vault.

## Set up

1. Download the Tuck Mac app from [tuckthis.app/site/apps](https://tuckthis.app/site/apps), open it, and sign in. A Tuck account is needed.
2. Click Tuck in the menu bar and choose **Copy pair link**.
3. Open the **Tuck** command in Raycast. It asks for the **Pair Link** the first time. Paste the `tuck://pair?port=47221&token=…` link there.

To change the link later, open Raycast Settings, then Extensions, then Tuck.

The pair link is stored as a password preference. It is not your vault passphrase, and it only works on this Mac.

## Use

Open **Tuck** and type the thought. From Raycast's root search, `Tuck call Ada tomorrow` opens with that line.

Type `#`, `@`, or `/` at the end of the line to pick tags, people, and brains. Enter inserts the name and a space. A name that is not there yet offers **Create**. `⌘↩` tucks the line as typed. `*`, `~daily`, `~weekly`, `~monthly`, and `!YYYY-MM-DD` stay in the line, and the Mac app reads them.

After you tuck, the command says what happened:

- **Tucked**: the vault was unlocked and the thought is filed.
- **Waiting until Tuck is unlocked**: the line is queued on this Mac.
- **Sent to your inbox**: Tuck posted the line to your inbox.

While the vault is locked, names are not listed. You can still tuck a line, and names come back after you unlock.
