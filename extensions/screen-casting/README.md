# Screen Casting

Cast your screen to Chromecast, smart TVs, Roku and AirPlay or Miracast displays straight from Raycast.

## Commands

- **Cast Screen** – finds devices on your network and mirrors your main display to the one you pick.
- **Stop Casting** – stops the stream and closes the player on the device.

## Supported devices

| Type        | Devices                                                         | How                                                                     |
| ----------- | --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Google Cast | Chromecast, Google TV, Android TV, TVs with Chromecast built in | Screen mirroring like Chrome (Cast Streaming); HLS stream as a fallback |
| Roku        | Roku players and Roku TVs                                       | Streamed by this extension (HLS)                                        |
| DLNA / UPnP | Most Samsung, LG, Sony and Philips smart TVs                    | Streamed by this extension (MPEG-TS)                                    |
| AirPlay     | Apple TV, AirPlay 2 TVs (macOS)                                 | Opens macOS screen mirroring                                            |
| Miracast    | Wireless displays, Fire TV, many TVs (Windows)                  | Opens the Windows Cast panel                                            |

AirPlay mirroring uses a closed, encrypted protocol, and Miracast is built into Windows, so for those the extension hands
off to the operating system, which also gives lower latency.

If a TV answers on more than one of the types the extension streams to itself, it's listed once under **Cast Devices**,
preferring Google Cast, then Roku, then DLNA. AirPlay receivers are listed separately under **System Mirroring**, so a
TV that supports both Google Cast and AirPlay appears in both sections.

**Roku:** set **Settings → System → Advanced system settings → Control by mobile apps** to _Default_ or _Permissive_.

## Requirements

There is nothing to install. It runs on macOS (Apple silicon and Intel). Windows code paths exist but are untested, so the Store listing is macOS-only for now.

- On macOS, grant Raycast **Screen Recording** permission (System Settings → Privacy & Security).
- Your computer and the Cast device must be on the same network.

## Screen encoder (ffmpeg)

The first time you cast, the extension downloads a pinned ffmpeg 9.0.2 build (~30–35 MB on macOS, ~65 MB on Windows) for
your platform and stores it in the extension's support folder. It is not downloaded again.

- **Source:**
  - macOS (Apple silicon and Intel): [Martin Riedl's ffmpeg builds](https://ffmpeg.martin-riedl.de), release 9.0.2.
  - Windows (x64; Windows on ARM runs it through emulation):
    [FFmpeg-Builds](https://github.com/FFmpeg-Builds/FFmpeg-Builds) (BtbN) release
    [`autobuild-2026-10-31-12-59`](https://github.com/FFmpeg-Builds/FFmpeg-Builds/releases/tag/autobuild-2026-10-31-12-59),
    `ffmpeg-n9.0.2-39-g7adfbe40dc-win64-gpl-9.0.zip` (the 9.0.2 release plus later fixes from the 9.0 branch).

  Both are zip files. The extension reads only the `ffmpeg` binary out of the zip (using HTTP range requests), so ffprobe,
  ffplay and the docs are not downloaded.

- **Integrity:** the extracted binary is checked against a SHA-256 hash hard-coded in `src/lib/ffmpeg.ts`. If the
  hash does not match, the file is discarded and casting stops.
- **License:** these ffmpeg builds include libx264 and are built with `--enable-version3`, so they are licensed under
  the [GNU GPL v3](https://www.ffmpeg.org/legal.html). The extension downloads and runs it as a separate program; it
  is not bundled with or linked into the extension.
- **Using your own ffmpeg:** set **Custom ffmpeg Path** in the extension preferences, and the extension will skip the
  download.

## Privacy and security

Your screen is streamed only on your local network, and only to the device you picked.

- The stream server listens only on the network interface that faces the device, on a random port.
- It answers requests only from the device's IP address. Any other computer on the network gets a 404.
- Every stream URL contains a new random 192-bit token, and only the generated stream files can be requested.
- Screen mirroring to Google Cast devices goes straight to the device over UDP, encrypted with a new AES-128 key
  for each session.
- Nothing is sent to the internet, apart from the one-time encoder download (from ffmpeg.martin-riedl.de on macOS and
  GitHub on Windows; see [Screen encoder](#screen-encoder-ffmpeg)).
- **Stop Casting** stops the encoder and the server, deletes the temporary stream files, and closes the player on the
  device. It only stops what the extension started: if you've since opened another app on the TV, it's left alone.

## How it works

Devices are found through mDNS (Google Cast, AirPlay) and SSDP (DLNA, Roku). ffmpeg captures the screen (AVFoundation
on macOS, GDI on Windows) and encodes it.

**Google Cast – screen mirroring.** It uses Cast Streaming, the protocol Chrome uses for tab and screen casting:

1. It launches the device's mirroring receiver and negotiates a stream (H.264 or VP8).
2. Each encoded frame is encrypted with AES-128 using a per-session key, split into RTP packets and sent over UDP.
3. The device reports lost packets and the extension re-sends them, so Wi-Fi drops don't corrupt the picture.

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

If a device can't mirror, the extension falls back to the video stream below.

**DLNA, Roku, and Google Cast fallback – video stream.** The screen is encoded as a live HLS stream (and continuous
MPEG-TS for DLNA TVs), served by a small local HTTP server, and the device plays it like a video. Expect a few seconds
of delay.

If casting fails, `cast.log` and `ffmpeg.log` in the extension's support folder show what happened.
