# RameCast

Cast your screen to Chromecast, smart TVs, Roku and AirPlay or Miracast displays straight from Raycast.

## Commands

- **Cast Screen** – finds devices on your network and mirrors your main display to the one you pick.
- **Stop Casting** – stops the stream and closes the player on the device.

## Supported devices

| Type        | Devices                                                         | How                            |
| ----------- | --------------------------------------------------------------- | ------------------------------ |
| Google Cast | Chromecast, Google TV, Android TV, TVs with Chromecast built in | Streamed by RameCast (HLS)     |
| DLNA / UPnP | Most Samsung, LG, Sony and Philips smart TVs                    | Streamed by RameCast (MPEG-TS) |
| Roku        | Roku players and Roku TVs                                       | Streamed by RameCast (HLS)     |
| AirPlay     | Apple TV, AirPlay 2 TVs (macOS)                                 | Opens macOS screen mirroring   |
| Miracast    | Wireless displays, Fire TV, many TVs (Windows)                  | Opens the Windows Cast panel   |

AirPlay mirroring uses a closed, encrypted protocol, and Miracast is built into Windows, so for those RameCast hands
off to the operating system, which also gives lower latency. If a TV supports several types, RameCast lists it once,
using the first type in the table.

**Roku:** set **Settings → System → Advanced system settings → Control by mobile apps** to _Default_ or _Permissive_.

## Requirements

There is nothing to install. RameCast runs on macOS (Apple silicon and Intel) and Windows.

- On macOS, grant Raycast **Screen Recording** permission (System Settings → Privacy & Security).
- Your computer and the Cast device must be on the same network.

## Screen encoder (ffmpeg)

The first time you cast, RameCast downloads a pinned ffmpeg build (~20–30 MB) for your platform and stores it in the
extension's support folder. It is not downloaded again.

- **Source:** [eugeneware/ffmpeg-static](https://github.com/eugeneware/ffmpeg-static) release `b6.1.1`,
  `ffmpeg-<platform>-<arch>.gz` (darwin-arm64, darwin-x64, win32-x64).
- **Integrity:** each download is checked against a SHA-256 hash hard-coded in `src/lib/ffmpeg.ts`. If the hash does
  not match, the file is discarded and casting stops.
- **License:** this ffmpeg build includes libx264, so it is licensed under the
  [GNU GPL v2 or later](https://www.ffmpeg.org/legal.html). RameCast downloads and runs it as a separate program; it
  is not bundled with or linked into the extension.
- **Using your own ffmpeg:** set **Custom ffmpeg Path** in the extension preferences, and RameCast will skip the
  download.

## Privacy and security

Your screen is streamed only on your local network, and only to the device you picked.

- The stream server listens only on the network interface that faces the device, on a random port.
- It answers requests only from the device's IP address. Any other computer on the network gets a 404.
- Every stream URL contains a new random 192-bit token, and only the generated stream files can be requested.
- Screen mirroring to Google Cast devices goes straight to the device over UDP, encrypted with a new AES-128 key
  for each session.
- Nothing is sent to the internet, apart from the one-time encoder download from GitHub.
- **Stop Casting** stops the encoder and the server, and closes the player on the device.

## How it works

Devices are found through mDNS (Google Cast, AirPlay) and SSDP (DLNA, Roku). ffmpeg captures the screen (AVFoundation
on macOS, GDI on Windows) and encodes it.

**Google Cast – screen mirroring.** RameCast uses Cast Streaming, the protocol Chrome uses for tab and screen casting:

1. It launches the device's mirroring receiver and negotiates a stream (H.264 or VP8).
2. Each encoded frame is encrypted with AES-128 using a per-session key, split into RTP packets and sent over UDP.
3. The device reports lost packets and RameCast re-sends them, so Wi-Fi drops don't corrupt the picture.

The device shows your screen full-screen. On macOS, frames are encoded with the hardware H.264 encoder (falling back to
software if it isn't available) and sent the moment each one is encoded.

The **Latency** preference sets how long the device buffers frames before showing them:

| Setting        | Device buffer             | Frame rate | Best for                                               |
| -------------- | ------------------------- | ---------- | ------------------------------------------------------ |
| Auto (default) | 0.08–0.6 s, adjusted live | 30 fps     | Any network                                            |
| Lowest         | ~0.1 s                    | 60 fps     | Strong Wi-Fi or wired; may stutter if packets are lost |
| Balanced       | ~0.2 s                    | 30 fps     | Most networks                                          |
| Smooth         | ~0.4 s                    | 30 fps     | Weak or busy Wi-Fi                                     |

**Auto** starts at 0.2 s. Every second it checks what the device reports: lost packets, and how long frames take to be
acknowledged. When packets are lost or acknowledgements are slow, it raises the buffer by 50% straight away. After 10
seconds without problems, it lowers the buffer by 20%. Changes are sent to the device mid-stream, using the same
adaptive playout delay mechanism Chrome uses, so the cast never restarts. Each change is logged in `cast.log`.

For the lowest delay, also turn on your TV's **Game mode**. TVs often add 50–100 ms of picture processing otherwise.

If a device can't mirror, RameCast falls back to the video stream below.

**DLNA, Roku, and Google Cast fallback – video stream.** The screen is encoded as a live HLS stream (and continuous
MPEG-TS for DLNA TVs), served by a small local HTTP server, and the device plays it like a video. Expect a few seconds
of delay.

If casting fails, `cast.log` and `ffmpeg.log` in the extension's support folder show what happened.

## Development

```sh
npm install
npm run dev
```
