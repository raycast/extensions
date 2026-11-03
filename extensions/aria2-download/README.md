# Aria2 Download

Manage a local aria2 queue from Raycast.

- **Aria2 Tasks** — active, waiting, and stopped downloads with progress, speed, ETA, peers, pause/resume/remove, and a chunk heatmap or native mosaic view.
- **Toggle Aria2** — start or stop the local aria2 RPC daemon. When downloads are running, a confirmation is required before force-stopping it.
- **Add Download** — add direct URLs, magnet links, `.torrent` files, or remote `.torrent` URLs. aria2 can be started automatically and the task list opens after a successful add.
- **Aria2 Configuration** — tune HTTP, BitTorrent, RPC, notification, and auto-start/auto-stop settings. The generated RPC secret can be copied for LinkSwift.

## Requirements

aria2 must be installed separately and available as `aria2c.exe` in `PATH` or a common install location.

If aria2 is missing, the extension prompts to open the official aria2 website instead of trying to install it automatically.

## First Use

1. Install aria2.
2. Run **Aria2 Tasks**, **Toggle Aria2**, or **Add Download**.
3. The extension creates its settings, RPC secret, and runtime configuration automatically.

No manual engine initialization is required.

## LinkSwift

LinkSwift can push supported netdisk links to the same local RPC endpoint. Copy the RPC secret from **Aria2 Configuration → Actions → Copy RPC Secret** and enter it in LinkSwift's aria2 settings.

Netdisk direct links should be added through LinkSwift, not pasted directly into Add Download, because those URLs require LinkSwift's Cookie, Referer, and User-Agent.

## Notes

- The extension is Windows-only.
- The RPC endpoint listens on loopback only.
- BitTorrent downloads still upload while downloading; only download and share content you have permission to use.
- Without a public inbound port or restrictive NAT, BitTorrent peer discovery may be limited.
- Magnets without `tr=` trackers depend on DHT. If peers stay at zero, add public trackers in **Configuration → Extra Trackers** or use a `.torrent` file.
