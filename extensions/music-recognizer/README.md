# Music Recognizer

Identify the song playing on your PC — right from Raycast.

Music Recognizer records a few seconds of your **system audio** ("what you hear") and identifies it with [AudD](https://audd.io)'s music recognition API. It works with any audio source: Spotify, YouTube, games, livestreams, anything coming out of your speakers — nothing needs to be playing in a supported app.

## Setup

The extension uses your own AudD account, so you need an API token before the first run:

1. Create a free account at [dashboard.audd.io](https://dashboard.audd.io/).
2. Copy the API token shown there.
3. Paste it into the extension's **AudD API Token** preference.

AudD advertises 300 free requests on signup with no card needed. Note that the trial also expires by date: on the account this was built with it stopped working after about two weeks, well before those requests were used. Once the trial ends their API needs a paid plan — at the time of writing, Indie is $5/month with 1000 recognitions included. Check [dashboard.audd.io](https://dashboard.audd.io/) for current terms before you install. The extension always uses your own token, so usage and billing stay on your own account and never go through anyone else's.

## Commands

- **Recognize** — records a few seconds of system audio and shows the matched track with cover art, album and release year. Jump straight to the song on Spotify, YouTube Music or Apple Music, open its AudD page, or copy the song info.
- **History** — every match is saved locally; browse, search and reopen past finds.

## How it works

1. A bundled PowerShell script captures your default output device via **WASAPI loopback** and writes a short 16 kHz mono clip — plain, readable source, no drivers, no ffmpeg, no bundled binaries.
2. The clip is uploaded to AudD's recognition API from your own machine, using your own token. There is no server in between.
3. The recording is deleted right after each attempt, whether it matched or not.

## Privacy

The recording is a few seconds of whatever is playing on your speakers, and it **is uploaded to AudD** so they can identify it — that is how their API works. Nothing else leaves your machine: no history, no telemetry, and the local clip is removed after every recognition. AudD's handling of uploads is covered by [their privacy policy](https://audd.io/privacy/).

This project is not affiliated with AudD; it is simply a client for their public API.

Apple and Apple Music are trademarks of Apple Inc., registered in the U.S. and other countries. Spotify is a trademark of Spotify AB. YouTube and YouTube Music are trademarks of Google LLC. Their icons are bundled unmodified and used only to link to each service, as their brand guidelines allow.

## Requirements

- Windows
- An AudD API token (see Setup)
- Music playing on your **default output device**

## Preferences

- **AudD API Token** — required; see Setup.
- **Recording Duration** — 3 / 5 / 8 / 10 / 12 seconds (5 by default).
- **Primary Music Service** — Spotify, YouTube Music or Apple Music. The chosen service is listed first after a match, so pressing Enter opens the song there.
