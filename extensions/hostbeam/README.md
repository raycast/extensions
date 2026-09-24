# Hostbeam

Beam the screenshot on your clipboard to a remote host over SSH, and get the
paste-ready path back — from Raycast.

This extension drives the [Hostbeam](https://hostbeam.app) Mac app. It never
connects to a host itself and holds no credentials: it reads the app's
settings, and asks the app to do the work.

## Before you start

- **Install Hostbeam for Mac** — from [hostbeam.app](https://hostbeam.app), or
  `brew install --cask punkabeat/tap/hostbeam`. Hostbeam is free for 5 beams a
  day; a one-time license removes the limit.
- **Open it once and add a host.** The commands work with the hosts you set up
  there.

## Commands

| Command | What it does |
| --- | --- |
| **Beam Clipboard** | Beams the screenshot on your clipboard to your current host |
| **Switch Host** | Lists your hosts, the current one ticked; switch, or switch and beam in one action |
| **Recent Beams** | What you have beamed, with thumbnails; copy the paste-ready text or the bare remote path |
| **Beam Selected Files** | Hands the images selected in Finder to Hostbeam |

Copying uses the sentence you set in Hostbeam's own settings, so a copy here
and a copy from the app's Recent list give you the same text.

## If a command says Hostbeam is not accepting commands

Beam Clipboard and Switch Host need Hostbeam's permission, and it is on unless
you turned it off: **Hostbeam → Preferences → General → Beaming → Let other
apps control Hostbeam**. The message comes with an **Open Hostbeam Settings**
button that takes you straight there.

If it says a newer Hostbeam is needed, update from Hostbeam's About pane.

## Privacy

The extension reads Hostbeam's settings file, the installed app's version, and
the thumbnails Hostbeam keeps for your recent beams (copying ones from before
Hostbeam 0.1.27 into its own Raycast folder, since a list cannot show them
directly). It sends
nothing anywhere; the only thing that leaves your Mac is the screenshot
Hostbeam beams, to the host you chose.
