# Kiri Focus Timer

Run focus blocks from Raycast and keep the time left in your menu bar. Play Kiri background sounds while you work, and save each finished block to your Kiri history.

The timer works without an account.

## Commands

- **Start Focus Block**: pick 25, 50 or 90 minutes (or type your own, up to 120), an optional task and a sound. The block starts right away.
- **Kiri Timer**: shows the time left in the menu bar. Pause, resume, stop, start a break or a new block from its menu. Turn it on once so you get the countdown and the alert at the end.
- **Start Break**: starts a break with your break length.
- **Stop Timer**: stops the running block or break. A block stopped early is not saved.
- **Focus History**: the blocks you finished in Raycast, by day. Connect or disconnect your Kiri account here.

When a block ends you get a notification and, if you like, a short sound. Kiri then offers your break, or starts it by itself.

## Sounds

Sounds are real recordings from [Kiri](https://project-kiri.com). They are downloaded once and played with macOS's own audio player. They stop when the block ends.

- Without an account: brown noise.
- With a free Kiri account: rain and brown noise.
- With Kiri Lifetime: every Kiri sound, such as forest, sea, cafe and fireplace.

## Connect your Kiri account (optional)

1. Open **Focus History** and choose **Connect Kiri Account**.
2. Your browser opens project-kiri.com with a short code. Sign in, check that the code matches the one in Raycast, and choose **Allow**.
3. Raycast connects within a few seconds.

From then on, every block you finish is saved to your Kiri history, next to the blocks you do on the site. Blocks finished while offline are saved later.

Raycast keeps only a token for this Mac, in Raycast's local storage. It can save blocks, play the sounds of your plan and read your first name and plan. You can disconnect in Focus History, or on your Kiri progress page under Connected apps.

## Preferences

- Default block length
- Break length
- Start the break by itself when a block ends
- Play a short sound when a block or break ends
- Save finished blocks to my Kiri account
- Pause a focus block when a call starts (off by default)

## Calls (optional)

Turn on **Pause a focus block when a call starts** to have the block pause when an app starts using the microphone (FaceTime, Zoom, Google Meet, Teams and others). Resume it from the menu bar when you are done. Dictation and voice recordings count too. Kiri reads only whether the microphone is in use, with macOS's own `pmset` tool; it never listens or records. This needs the Kiri Timer menu bar command turned on.

## Privacy

The extension talks only to Kiri (api.project-kiri.com). It sends nothing unless your Kiri account is connected, apart from downloading brown noise. There is no analytics or tracking.
