# Doubao TTS — Raycast Extension

<p align="center">
  <img src="assets/command-icon.png" width="128" height="128" alt="Doubao TTS Icon" />
</p>

<p align="center">
  Select any text on macOS, read it aloud via <a href="https://www.raycast.com/">Raycast</a> — powered by <a href="https://www.volcengine.com/docs/6561/1598757">Volcengine Doubao TTS V3</a>.
</p>

---

## Why Doubao TTS?

**Doubao TTS is the leading Chinese AI speech synthesis engine.** It delivers unmatched naturalness, emotional expression, and voice diversity for Chinese text. Whether you're listening to research papers, long articles, or everyday text, Doubao TTS provides near-human-quality speech — no extra apps required.

### Who is this for?

- **Researchers** — Listen to papers and documents, free your eyes
- **Developers** — Review docs, READMEs, and comments by ear
- **Language learners** — Hear standard Chinese pronunciation
- **Content creators** — Preview how your text sounds
- **Anyone who needs TTS** — Select text, press a key, listen

## Features

- **Quick Read** — Select text, read aloud instantly (no UI)
- **Voice Selection** — Browse 90+ voices organized by category
- **Stop Reading** — Stop playback anytime
- **Toggle mode** — Trigger Quick Read again to stop
- **Smart chunking** — Auto-split long text by sentence
- **Model switching** — TTS 2.0 (recommended) and TTS 1.0
- **Chinese & English** — Built-in voices for both languages

## Screenshots

![Doubao TTS Screenshot](metadata/doubao-tts-1.png)

## Installation

### Prerequisites

- [Raycast](https://www.raycast.com/) installed
- A Volcengine account with **Doubao TTS** enabled ([guide below](#get-app-id--access-key))

### Steps

1. Search **"Doubao TTS"** in the [Raycast Store](https://www.raycast.com/store), install the extension
2. Configure your **App ID** and **Access Key** on first launch ([guide below](#get-app-id--access-key))
3. Bind a hotkey to **Quick Read Selected Text** ([how?](#bind-a-hotkey-highly-recommended))
4. Select any text, press the hotkey — done!

## Configuration

Raycast will prompt for preferences on first use.

| Setting        | Description                | Required |
| -------------- | -------------------------- | :------: |
| **App ID**     | Volcengine app identifier  |    ✅    |
| **Access Key** | Volcengine access key      |    ✅    |
| Model Version  | TTS model (default: 2.0)   |          |
| Default Voice  | Voice for Quick Read       |          |
| Speech Rate    | Playback speed (0.5x–2.0x) |          |

### Get App ID & Access Key

1. Sign up and log in to [Volcengine Console](https://console.volcengine.com/)
2. Go to [Speech → Doubao TTS](https://console.volcengine.com/speech/service/10007)
3. Enable the service if not already active
4. Find your credentials:
   - **App ID** = `X-Api-App-Id`
   - **Access Key** (Access Token) = `X-Api-Access-Key`
5. See also: [Console FAQ](https://www.volcengine.com/docs/6561/196768)

> **Tip**: New Volcengine users get a free quota. Check the console for details.

### Model Versions

| Model                             | Resource ID            | Description                |
| --------------------------------- | ---------------------- | -------------------------- |
| Doubao TTS 2.0 (Recommended)      | `seed-tts-2.0`         | Latest model, best quality |
| Doubao TTS 1.0                    | `seed-tts-1.0`         | Classic model, more voices |
| Doubao TTS 1.0 (High Concurrency) | `seed-tts-1.0-concurr` | Higher concurrency         |
| Voice Clone 2.0                   | `seed-icl-2.0`         | Voice cloning              |
| Voice Clone 1.0                   | `seed-icl-1.0`         | Voice cloning              |

> **Note**: Different models support different voices. TTS 2.0 shows only 2.0 voices; TTS 1.0 shows only 1.0 voices.

### Voice List

90+ built-in voices organized by category:

| Category                         | Examples                       | Model     |
| -------------------------------- | ------------------------------ | --------- |
| General Female                   | Vivi, Xiaohe, Cancan           | 1.0 / 2.0 |
| General Male                     | Yunzhou, Xiaotian, Qingcang    | 1.0 / 2.0 |
| Emotional Female                 | Emotional Cancan, Sweet Female | 1.0       |
| Emotional Male                   | Emotional Male                 | 1.0       |
| English                          | Tim, Adam, Amanda              | 1.0 / 2.0 |
| Japanese / Korean / Multilingual | Japanese Female, Korean Female | 1.0 / 2.0 |
| Fun Accents / Role Play          | Dongbei Bro, Beijing Accent    | 1.0       |

Full voice list: [Doubao Voice Catalog](https://www.volcengine.com/docs/6561/1257544)

## Usage

### Quick Read (Recommended)

1. Select text in any app
2. Open Raycast (`⌥ Space`)
3. Type `Quick Read` and press Enter
4. It reads aloud! Trigger again to stop

### Bind a Hotkey (Highly Recommended)

Bind a global hotkey to Quick Read for the ultimate workflow: **select text → press hotkey → instant reading**, no need to open Raycast every time.

1. Open Raycast → search `Extensions`
2. Find **Doubao TTS**
3. Click `Record Hotkey` next to **Quick Read Selected Text**
4. Press your desired key combo (e.g. `⌥ R`, `⌃ ⌥ S`)
5. Done! Select text anywhere and press the hotkey to read

> **Tip**: You can also bind a hotkey to Stop Reading for quick stopping.

### Read with Voice Selection

1. Select text
2. Open `Read with Voice Selection` in Raycast
3. Browse voices, pick one
4. Press Enter to start

### Stop Reading

- Run `Stop Reading` in Raycast
- Or trigger Quick Read again while playing

## Development

### Project Structure

```
raycast-doubao-tts/
├── src/
│   ├── api/
│   │   ├── volcengine-tts.ts   # V3 API client
│   │   └── types.ts            # TypeScript types
│   ├── constants/
│   │   └── voices.ts           # 90+ voice configs
│   ├── utils/
│   │   ├── audio-player.ts     # Audio player (afplay)
│   │   └── text-chunker.ts     # Smart text chunking
│   ├── quick-read.tsx          # Quick Read command
│   ├── read-with-voice.tsx     # Voice selection command
│   └── stop-reading.tsx        # Stop playback command
├── assets/
│   └── command-icon.png        # Extension icon
├── package.json
└── tsconfig.json
```

### Local Development

```bash
npm install    # Install dependencies
npm run dev    # Dev mode (hot reload)
npm run build  # Build
npm run lint   # Lint
```

### Technical Details

- **API**: Volcengine Doubao TTS V3 HTTP unidirectional streaming
- **Auth**: HTTP Headers (`X-Api-App-Id`, `X-Api-Access-Key`, `X-Api-Resource-Id`)
- **Response**: JSON Lines (NDJSON), one JSON object per line
- **Audio**: MP3, 24000 Hz
- **Chunking**: Smart split by punctuation, ≤1024 UTF-8 bytes per chunk
- **Playback**: macOS built-in `afplay`
- **Cross-command stop**: PID file (`$TMPDIR/doubao-tts.pid`)

## References

- [Raycast Extension Docs](https://developers.raycast.com/)
- [Doubao TTS V3 HTTP API](https://www.volcengine.com/docs/6561/1598757)
- [Doubao Voice Catalog](https://www.volcengine.com/docs/6561/1257544)
- [Volcengine Console FAQ](https://www.volcengine.com/docs/6561/196768)

## Acknowledgements

- [Bob Plugin - Doubao TTS](https://github.com/Littlecowherd/bob-plugin-doubao-tts) — Inspired the configuration approach
- [Volcengine](https://www.volcengine.com/) — Doubao TTS API provider

## License

[MIT](LICENSE)

---

**中文文档**: [README.zh.md](README.zh.md)
