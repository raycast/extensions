# Kilobat

See which apps use your network, check Wi-Fi and latency, find out why a site won't load, test your speed and keep your Mac awake, all from Raycast.

## Setup

This extension runs the free, open-source [Kilobat CLI](https://github.com/seifip/kilobat-cli). Install it with Homebrew:

```
brew install seifip/kilobat/kilobat
```

If you installed it somewhere other than Homebrew's bin folder, set **Kilobat CLI Path** in the extension's preferences.

## Commands

- **Network Apps**: live download and upload per app, helpers grouped under the app they belong to, with two minutes of traffic for each.
- **Network Status**: Wi-Fi signal, band and link rate, internet latency with a live line, VPN, metered network and power.
- **Why Can't I Reach**: checks a site or host layer by layer and names the one that fails: network, proxy, DNS, rules, connection or server.
- **Speed Test**: live dials for download and upload, latency under load, and whether voice calls, video calls, streaming and AI agents will hold up. On a metered network it offers a 10 MB light test first.
- **Keep Awake**: the same choices as Kilobat's teacup: for 1 to 8 hours or until you turn it off, until downloads finish (for everything or one app), while an app is in front, while plugged in, and with the screen or the lid closed.

## Raycast AI

Ask `@kilobat` things like "why can't I reach api.openai.com?", "what's using my bandwidth?" or "is my Wi-Fi the problem?".

## The Kilobat app

The [Kilobat app](https://kilobat.app) adds a live menu bar, usage history, alerts, data budgets for hotspots, and per-app blocking. With it installed, the extension's actions open the matching tab, or the share card for your speed test.
