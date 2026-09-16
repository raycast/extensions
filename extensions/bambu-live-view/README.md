# Bambu Live View for Raycast

A tiny, borderless, always-on-top window showing your Bambu Lab printer's camera — one hotkey to open, the same hotkey to close. Streams straight from the printer over your local network using [mpv](https://mpv.io); no cloud, no Bambu Studio.

## Commands

| Command | What it does |
| --- | --- |
| **Printer Setup** | A step-by-step checklist: enable LAN liveview on the printer, install mpv, save the IP address and access code, and test the connection. Each step shows a live ✓ / ✗. |
| **Toggle Live View** | Opens the camera window, or closes it if it's already open. Assign it a hotkey in Raycast for one-key access. |

## Supported printers

| Works | Doesn't work |
| --- | --- |
| X1 / X1 Carbon / X1E, P2S, H2D and other newer models that stream **RTSPS on port 322** | P1P, P1S, A1, A1 mini — these use a proprietary JPEG stream on port 6000 that mpv can't play |

## Setup

Run **Printer Setup** in Raycast and follow the checklist, or do it by hand:

1. **On the printer:** Settings → **LAN Only** → turn on **LAN Only Liveview**.
   The separate **LAN Only** mode switch can stay **off**, so Bambu Cloud and Bambu Handy keep working.
2. On the same screen, note the printer's **IP address** (e.g. `192.168.1.50`) and 8-character **Access Code** (e.g. `12345678`).
   Pressing the refresh arrow next to the code generates a new one; if you do, update it in Raycast too.
3. *(Recommended)* In your router, create a **DHCP reservation** for the printer so its IP address never changes.
4. **Install mpv:** `brew install mpv`. The setup command detects mpv in `/opt/homebrew/bin`, `/usr/local/bin` or your `PATH`, and can open Terminal with the install command for you.
5. Enter the IP address and access code in **Printer Setup → Enter Printer Details**, then **Test Connection**.
6. Run **Toggle Live View**.

The IP address and access code are kept in Raycast's encrypted local storage for this extension. The access code is never shown or logged.

## Using the window

- The window has no title bar: **⌘-drag** to move it.
- Press **q** in the window to close it, or run **Toggle Live View** again.
- Size (small 320×180, medium 480×270, large 640×360), screen corner and window title are in the extension's preferences (Raycast Settings → Extensions → Bambu Live View, or **Window Size & Position…** in the setup command's action panel).

Under the hood it runs roughly:

```sh
echo "rtsps://bblp:ACCESS_CODE@PRINTER_IP:322/streaming/live/1" | \
  mpv --ontop --no-border --no-audio --rtsp-transport=tcp --profile=low-latency \
      --autofit=480x270 --geometry=99%:2% \
      --input-ipc-server="$TMPDIR/raycast-bambu-live-view.sock" --playlist=-
```

- The stream URL (which contains the access code) is piped in on stdin, so it never appears in the process list.
- "Live view opened" is only shown once mpv reports the stream actually loaded. A wrong access code shows **Access code rejected** instead.
- The extension only ever closes an mpv it started itself (identified by its private IPC socket), and closes it by asking mpv to quit over that socket.
- Starting twice at once (e.g. a double-pressed hotkey) opens one window, not two.

## Troubleshooting

- **Nothing happens / "Printer not responding"** — the printer is off or asleep, its IP address changed, or your Mac is on a different network (guest Wi-Fi, VPN). Check from Terminal:
  ```sh
  nc -zv 192.168.1.50 322
  ```
  If `nc` succeeds but Raycast can't connect, allow Raycast under System Settings → Privacy & Security → **Local Network**.
- **"Port 322 is closed"** — LAN Only Liveview is off, or the printer is a P1/A1-series model (unsupported, see above).
- **Window opens but stays black** — the access code is probably wrong or was regenerated. Re-enter it in Printer Setup.
- **Why not VLC?** The printer uses a self-signed TLS certificate, which VLC on macOS refuses. mpv plays it fine.
- **`No video PTS! Making something up`** in mpv's output is harmless.

## Development

```sh
npm install
npm run dev      # ray develop — loads the extension into Raycast in development mode
npm run build    # ray build -e dist -o dist
npm run lint
```

## License

[MIT](LICENSE)
