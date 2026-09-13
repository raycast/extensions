# Developing Fenn Search

Use macOS, Raycast, Node.js **22.22.2 or newer**, and npm. Search requires a running, activated Fenn **1.3.3 or newer** with indexed files, or a compatible development backend.

## Run locally

From the extension directory:

```sh
npm ci
npm run dev
```

Open **Search Fenn** in Raycast. Development mode reloads the extension when its source changes. It does not submit anything to the Store.

## Validate

```sh
npm run typecheck
npm test
npm run lint
npm run build
```

The build command installs a local compiled copy through Raycast's SDK and needs access to Raycast's configuration folder. Tests cover response parsing, file-type payloads, matching locations, canceled requests, recovery states, and safe rendering of indexed text.

With a compatible, licensed Fenn backend running:

```sh
npm run smoke -- "your query"
```

This exercises all six modes with a combined PDF/Audio filter. It checks returned file types and prints result counts and timings without filenames, excerpts, or credentials.

The client connects to `http://127.0.0.1:5001` and reads Fenn's token from `~/.fenn/user_preferences/mcp_token` for each request. The optional password preference overrides that token. Fenn's license and authentication checks remain in effect.

## Listing assets

The Store publisher is `thoddnn`. The listing title, descriptions, categories, and search keywords live in `package.json`; the public guide and examples live in `README.md`.

Store screenshots are in `metadata/`, in this order:

1. `fenn-search-1.png`: text visible in a video, with a matching timestamp.
2. `fenn-search-2.png`: spoken words in audio, with transcript excerpts and time ranges.
3. `fenn-search-3.png`: visual text inside a Sketch file.

All three are 2000 × 1250 PNGs. Copies in `media/` support the README. They were resized proportionally from the supplied screenshots, with only background padding added; the search results and interface were not edited.

The extension icon is `assets/icon.png`, a 512 × 512 PNG. Keep the changelog's `{PR_MERGE_DATE}` placeholder; Raycast replaces it when the submission is merged.

Only the extension directory is intended for the public Raycast repository. Its MIT license does not apply to the Fenn application or backend. Publishing and the packaged-app release check are separate steps from preparing this listing.
