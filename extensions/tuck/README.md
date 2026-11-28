# Tuck for Raycast

Tuck a thought from Raycast into [Tuck](https://tuckthis.app), the end-to-end encrypted second brain. The command sends the line to the Tuck menu bar app on this Mac (`127.0.0.1` only), and the app files it into your vault.

## Set up

1. Install and sign in to the Tuck Mac app.
2. In the Tuck menu bar, choose **Copy pair link**.
3. Open the **Tuck** command and paste the `tuck://pair?port=47221&token=…` link into its **Pair link** preference.

The pair link is stored as a password preference. It is not your vault passphrase, and it only works on this Mac.

## Use

Open **Tuck** and type the thought. From Raycast's root search, `Tuck call Ada tomorrow` opens with that line.

Type `#`, `@`, or `/` at the end of the line to pick tags, people, and brains. Enter inserts the name and a space. A name that is not there yet offers **Create**. `⌘↩` tucks the line as typed. `*`, `~daily`, `~weekly`, `~monthly`, and `!YYYY-MM-DD` stay in the line, and the Mac app reads them.

After you tuck, the command says what happened:

- **Tucked**: the vault was unlocked and the thought is filed.
- **Waiting until Tuck is unlocked**: the line is queued on this Mac.
- **Sent to your inbox**: Tuck posted the line to your inbox.

While the vault is locked, names are not listed. You can still tuck a line, and names come back after you unlock.

## Develop

In this folder: `npm install`, then `npm run dev`. `npm run lint` runs the store checks.
