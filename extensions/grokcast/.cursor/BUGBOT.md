# Bugbot

Review this repository as a Raycast extension that also runs in Tinycast. It signs in with the user's own Grok or X subscription through xAI OAuth and calls `api.x.ai`. It has no backend and must never use an xAI API key from the console.

Flag these:

- An access token, refresh token, ID token, or device code that can reach a log, a toast, a HUD, an error message, the clipboard (other than the short user code), or a file outside Raycast's token store.
- A request that sends the bearer token to a host other than `x.ai` or a subdomain of it.
- A refresh path that can spend the same refresh token twice, or that keeps an old refresh token after xAI returned a new one. xAI rotates the refresh token on every refresh.
- A change that clears the sign-in on a network error or a 5xx. Only `invalid_grant` means the sign-in is gone.
- Node APIs that Tinycast does not provide, such as `child_process.fork` or `worker_threads`.
- Audio or transcripts written to disk without the user asking for history.
- A recording path that can leave the Swift recorder running after the stream ends, the command closes, or an error. The extension stops the recorder with SIGTERM, not by closing stdin (Tinycast closes stdin at once).
- A real API key passed to `SpaceXAI`. The key in `src/lib/transcriber.ts` is a placeholder; `GrokSession.fetch` replaces the authorization header with the user's OAuth token.
- A change to `process.versions` that is not limited to Tinycast and put back after the SDK client starts.
- A live transcription path that can lose the user's words. When the live session fails, `dictateSpeech` must send the whole recording instead.
- A WebSocket URL with the bearer header that is not `wss://api.x.ai/...`.
- A committed binary under `assets/`. The recorder is built from `recorder/` by `ray build`.
