# Doubao TTS — Raycast Extension

<p align="center">
  <img src="assets/command-icon.png" width="128" height="128" alt="Doubao TTS Icon" />
</p>

<p align="center">
  Select any text on macOS and read it aloud with <a href="https://www.raycast.com/">Raycast</a>, powered by <a href="https://www.volcengine.com/docs/6561/1329505">Volcengine Doubao TTS V3 WebSocket streaming</a>.
</p>

---

## Why Doubao TTS?

Doubao TTS is a high-quality Chinese AI speech synthesis engine with natural voices, emotional expression, and broad Chinese/English voice coverage. This extension makes it practical to listen to papers, articles, notes, documentation, and everyday selected text directly from Raycast.

## Features

- **Quick Read**: select text and read it aloud instantly without opening a view.
- **Voice Selection**: browse 160+ voices organized by category, including the official Doubao TTS 2.0 voice catalog.
- **Select Quick Read Voice**: choose and preview the voice used by Quick Read.
- **Stop Reading**: stop playback anytime, or trigger Quick Read again to toggle playback off.
- **Smart Chunking**: split long text by sentence and punctuation.
- **Pipelined Playback**: synthesize the next text chunk while the current chunk is playing.
- **Model Switching**: supports Doubao TTS 2.0, TTS 1.0, and voice clone resource IDs.
- **Flexible Auth**: uses the current Volcengine `X-Api-Key` flow, with legacy App ID and Access Key fallback.

## Screenshots

![Doubao TTS Screenshot](metadata/doubao-tts-1.png)

## Installation

### Prerequisites

- [Raycast](https://www.raycast.com/) installed
- A Volcengine account with Doubao TTS enabled

### Setup

1. Install **Doubao TTS** from the Raycast Store.
2. Open the extension preferences.
3. Fill **API Key** from the current Volcengine Doubao Speech console, or keep using your existing App ID and Access Key.
4. Bind a hotkey to **Quick Read Selected Text** for the fastest workflow.

## Configuration

| Setting | Description | Required |
| --- | --- | :---: |
| API Key | Volcengine Doubao Speech API Key. Preferred for new users. | Optional |
| App ID | Legacy Volcengine TTS App ID, used only when API Key is empty. | Optional |
| Access Key | Legacy Volcengine TTS Access Key, used only when API Key is empty. | Optional |
| Model Version | TTS model/resource ID. Defaults to Doubao TTS 2.0. | Optional |
| Default Voice | Voice used by Quick Read when no override is selected. | Optional |
| Speech Rate | Playback speed from 0.5x to 2.0x. | Optional |

## Usage

### Quick Read

1. Select text in any macOS app.
2. Open Raycast and run **Quick Read Selected Text**.
3. Trigger the command again to stop playback.

### Select the Quick Read Voice

1. Run **Select Quick Read Voice**.
2. Search or browse voices compatible with the selected model.
3. Press Enter to set the selected voice.
4. Use **Preview Voice** to audition a voice with selected or clipboard text.

### Read with a Specific Voice

1. Select text.
2. Run **Read with Voice Selection**.
3. Pick a voice and press Enter to read.

## Technical Details

- **API**: Volcengine Doubao TTS V3 WebSocket bidirectional streaming
- **Auth**: `X-Api-Key` or legacy `X-Api-App-Id` + `X-Api-Access-Key`, plus `X-Api-Resource-Id` and per-connection `X-Api-Connect-Id`
- **Response**: binary V3 WebSocket frames with streamed MP3 audio payloads
- **Audio**: MP3, 24000 Hz
- **Chunking**: smart split by punctuation, up to 4096 UTF-8 bytes per chunk
- **Playback**: macOS built-in `afplay`
- **Stop Control**: shared PID file at `$TMPDIR/doubao-tts.pid`

## References

- [Raycast Extension Docs](https://developers.raycast.com/)
- [Doubao TTS V3 WebSocket Bidirectional API](https://www.volcengine.com/docs/6561/1329505)
- [Doubao Voice Catalog](https://www.volcengine.com/docs/6561/1257544)
- [Volcengine Console FAQ](https://www.volcengine.com/docs/6561/196768)

## Acknowledgements

- [Bob Plugin - Doubao TTS](https://github.com/Littlecowherd/bob-plugin-doubao-tts) inspired the configuration approach.
- [Volcengine](https://www.volcengine.com/) provides the Doubao TTS API.

## License

[MIT](LICENSE)

---

**中文文档**: [README.zh.md](README.zh.md)
