# FlowSpeech TTS for Raycast

Turn selected or copied text into natural speech without leaving your current app. The extension uses the public [FlowSpeech](https://flowspeech.io/) text-to-speech API and plays the generated audio directly on macOS.

## Features

- Speak text selected in any macOS application
- Speak text currently stored in the clipboard
- Choose from Kore, Puck, Charon, Aoede, and Fenrir voices
- Keep your API key in Raycast's encrypted preferences
- Play generated audio locally with the built-in macOS audio player

## Setup

1. Create a developer API key in [FlowSpeech API settings](https://flowspeech.io/settings/apikeys). Generation requires an active paid Basic, Pro or Scale subscription; trials do not include API access.
2. Open either extension command in Raycast.
3. Paste the API key into the required preference and choose a voice.

## Usage

### Speak Selected Text

Select text in another application, open Raycast, and run **Speak Selected Text**.

### Speak Copied Text

Copy text to the clipboard, open Raycast, and run **Speak Copied Text**.

The extension supports up to 10,000 characters per request. Speech generation consumes FlowSpeech account credits.

## API v1 migration

The extension now creates an asynchronous public API v1 job, polls until it completes and downloads the resulting 24 kHz mono 16-bit WAV. The API key is sent only to the FlowSpeech API, never to the audio download host. API and download redirects are rejected.

Transient API retries reuse the same UUID and unchanged input. Polling waits at least five seconds and honors a longer Retry-After. Waiting stops after two minutes; it does not cancel the server-side job. Error messages include request/job IDs for recovery through the [public API](https://flowspeech.io/docs/public-api). Do not start another recording just to retry a download.

## Cancellation and Recovery

Before submitting, the extension saves a fresh request UUID in Raycast LocalStorage
and displays it in the generation toast. Storage or output-file preflight failure
prevents submission. The **Stop Waiting** action aborts local HTTP work; **Stop
Playback** stops the local player. Neither action cancels a paid server job.

Run **Show Speech Recovery** after a timeout, interrupted command, or host restart.
It shows the newest saved request UUID and offers **Copy All Recovery IDs**.
This command uses only local storage and never creates a recording. Records contain
UUIDs, timestamps, and local completion/interruption state, not text, API keys,
audio, or download links. Local state is not the current server job status.

Use the saved UUID with `GET /api/v1/tts/jobs?requestId=<UUID>`, or a known job ID
with `GET /api/v1/tts/jobs/<job-id>`. Pending jobs should be checked no faster than
every five seconds, respecting longer Retry-After values. On success, download
the existing result URL without credentials. Deleted results cannot be recovered.
Do not run a speak command again merely to recover: a new invocation creates a new
UUID and may charge for another recording.

Raycast's documented [command lifecycle](https://developers.raycast.com/information/lifecycle)
allows commands to be unloaded; no generic cancellation signal is exposed in
no-view launch props. Recovery therefore relies on an awaited write to
[LocalStorage](https://developers.raycast.com/api-reference/storage) before submission,
not a shutdown callback. Graceful cancellation shows the UUID immediately.
Abrupt termination may prevent a final toast or temporary-file cleanup, but the
already saved UUID remains available through Show Speech Recovery.

The client validates all required result metadata, correlated normalized UUIDs,
and complete nonempty, frame-aligned PCM WAV chunks. Retry-After remains effective
even when reading a response body fails. Unsupported input fields are rejected.

## Development

Run `npm test`, `npm run lint`, and `npm run test:build` with Node 24.
`npm run build` writes a distribution build to local `.build/` without installing
or launching the extension. Contract and wrapper tests mock HTTP, Raycast APIs,
and playback. A child-process test simulates abrupt host termination; it is not
an actual Raycast UI test. Built-command tests exercise the generated JavaScript.
No production credits are used. Application testing in Raycast is still required
before store approval.
