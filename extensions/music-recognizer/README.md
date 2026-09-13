# Music Recognizer

Identify the song playing on your PC — right from Raycast.

Music Recognizer records a few seconds of your **system audio** ("what you hear"), fingerprints it locally, and identifies the track using Shazam's recognition service. It works with any audio source: Spotify, YouTube, games, livestreams, anything coming out of your speakers.

## Commands

- **Recognize Song** — records a few seconds of system audio and shows the matched track with cover art, album, and release year. Jump straight to the song on Spotify, YouTube Music, Apple Music, or Shazam, or copy the song info.
- **Recognition History** — every match is saved locally; browse, search, and reopen past finds.

## How it works

1. A bundled PowerShell script captures your default output device via **WASAPI loopback** — plain source code, no drivers, no ffmpeg.
2. The recording is converted to an audio **fingerprint** on your machine by [shazamio-core](https://github.com/shazamio/shazamio-core) (MIT), which is bundled as a WebAssembly module (`assets/shazamio-core_bg.wasm`, copied verbatim from the [`shazamio-core@1.3.1`](https://www.npmjs.com/package/shazamio-core) npm package, SHA-256 `cf0d9f5fc10a6dc3e117e26d9de6c3dfb6f64ab3dc89f6c009a4af1fdb577552`).
3. Only the fingerprint is sent to Shazam's song recognition endpoint — **raw audio never leaves your PC**. Shazam does not offer a public API, so the extension talks to the same endpoint the official Shazam apps use (an unofficial integration, the same approach used by open-source projects like [shazamio](https://github.com/shazamio/ShazamIO)). Requests are sent directly from your machine; there is no middleman server.

## Disclaimer

This project is **not affiliated with, endorsed by, or connected to Shazam or Apple Inc.** in any way. "Shazam" is a trademark of Apple Inc., used here only to describe which service performs the recognition. The official Shazam website is [shazam.com](https://www.shazam.com).

## Requirements

- Windows
- Music playing on your **default output device**

## Preferences

- **Recording Duration** — 3 / 5 / 8 / 10 / 12 seconds (5 by default; Shazam's fingerprint uses at most 8 seconds of audio).
- **Primary Music Service** — Spotify, YouTube Music, Apple Music, or Shazam. The chosen service is listed first after a match, so pressing Enter opens the song there.
