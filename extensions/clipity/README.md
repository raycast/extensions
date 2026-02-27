# ✂️ clipity. — Raycast Extension

Trim & download videos from any URL, right from Raycast.

## Commands

| Command | What it does |
|---|---|
| **Download Video** | Paste a URL → set trim points → download |
| **Setup clipity** | Install yt-dlp and ffmpeg with one click |

---

## Getting started

### 1. Install the extension in dev mode

```bash
cd clipity-raycast
npm install
npm run dev
```

Raycast will open and add the extension automatically.

### 2. Run Setup

Open Raycast → type **"Setup clipity"** → press **Install Everything**.

This installs:
- **Homebrew** (if needed)
- **yt-dlp** — downloads from YouTube, TikTok, Vimeo, 1000+ sites
- **ffmpeg** — handles video trimming

Each dependency has its own **Install** button if you want to install them separately.

### 3. Download a video

Open Raycast → type **"Download Video"** → paste a URL → set start/end times → pick format → Download.

Files save to `~/Downloads/clipity/`.

---

## How installation works

The Setup command shells out to `brew install yt-dlp ffmpeg` using `execa` — the same way Raycast's own Homebrew extension works. Progress streams live into the list rows as each package installs. No Terminal needed.

---

## Project structure

```
clipity-raycast/
├── src/
│   ├── download.tsx   ← Main download command
│   ├── setup.tsx      ← Dependency installer
│   └── utils.ts       ← Shell helpers, yt-dlp wrapper
├── package.json       ← Extension manifest + deps
└── tsconfig.json
```

---

## Publishing to the Raycast Store

Once you're happy with it:

```bash
npm run publish
```

Raycast will guide you through the submission process.
