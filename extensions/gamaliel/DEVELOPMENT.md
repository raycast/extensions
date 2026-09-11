# Development

Local setup, API notes, and scripts for the Bible Q&A Raycast extension.

Repository: [gamaliel-ai/gamaliel-raycast](https://github.com/gamaliel-ai/gamaliel-raycast)

## Install locally

1. Install [Raycast](https://www.raycast.com) and [Node.js 22.22.2+](https://nodejs.org).
2. Clone this repo and install dependencies:

```bash
git clone https://github.com/gamaliel-ai/gamaliel-raycast.git
cd gamaliel-raycast
npm install
npm run dev
```

3. Open Raycast and run **Bible Q&A**.

`npm run dev` registers the extension in development mode with hot reload. Stop the process with `Ctrl+C`; the command stays installed until you remove the extension from Raycast preferences.

## Scripts

```bash
npm run dev      # hot reload in Raycast
npm run lint     # eslint
npm run build    # production build
npm run publish  # open a Store pull request
```

`npm run build` produces the distribution build. Open the command in Raycast after that build and confirm it still works before publishing.

## API

Answers come from `POST https://api.gamaliel.ai/v1/chat/completions`, an OpenAI-compatible chat endpoint. Preferences are sent as `theology`, `profile`, `bible_id`, and `max_words`.

Gamaliel converts scripture references to markdown links such as `[Matthew 5:1–16](/read/MAT/5?verse=1-16)`. This extension rewrites those paths to `https://gamaliel.ai/read/...` so Raycast can open them in a browser.

Hosted access is rate-limited (3 requests/minute/IP). Conversations stop after 20 user messages.

See [developer.gamaliel.ai](https://developer.gamaliel.ai) for models, theologies, profiles, and rate limits.
