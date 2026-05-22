# Kokoro TTS

Read selected English text aloud with [Kokoro](https://github.com/hexgrad/kokoro), a fast open-source text-to-speech model. Everything runs locally on your Mac through Apple's [MLX](https://github.com/ml-explore/mlx) framework - Metal-accelerated, no PyTorch, no cloud, no API key.

Audio is streamed sentence-by-sentence, so playback starts within a fraction of a second instead of waiting for the whole selection to render.

## Requirements

- An Apple Silicon Mac (M1 or newer)
- Python 3.10-3.12

## Setup

The extension talks to a small local Python TTS server, so it needs Python with the `mlx-audio` packages installed.

1. Select some text in any app and run the **Speak English** command.
2. The first time, a toast reports the missing packages. Press **⌘** to **Copy Fix Command**, paste it into Terminal, and run it - it installs everything the server needs.
3. Run **Speak English** again.

The first successful run downloads the Kokoro model (~300 MB) once; afterwards it stays loaded in memory.

### Using a virtualenv (optional)

To keep the packages isolated from your system Python, create a virtualenv and point the extension at it **before** running the setup above:

```bash
python3 -m venv ~/kokoro-tts-venv
```

Then set the extension's **Python Path** preference to `~/kokoro-tts-venv/bin/python3`. The **Copy Fix Command** action will now install the packages into that virtualenv.

## Commands

| Command       | What it does                  |
| ------------- | ----------------------------- |
| Speak English | Reads the selected text aloud |
| Stop Speaking | Interrupts playback           |

## Preferences

| Setting     | Default        | Description                                                       |
| ----------- | -------------- | ----------------------------------------------------------------- |
| Voice       | Bella (Female) | One of 20 English voices                                          |
| Speed       | 1.0            | Speech speed multiplier (0.5 = slow, 2.0 = fast)                  |
| Python Path | `python3`      | Python 3 (3.10-3.12) with `mlx-audio` installed - or a virtualenv |

## Troubleshooting

| Error                        | Fix                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| **Python not found**         | Install Python 3 (`brew install python3`), or set the correct path in extension preferences |
| **MLX-Kokoro not installed** | Run the **Copy Fix Command** action from the toast in Terminal                              |
| **Server failed to start**   | Check the extension log: **⌘⇧,** → Extensions → Kokoro TTS → Script Command Log             |

## How it works

The extension runs a lightweight FastAPI server (`assets/kokoro_server.py`) that keeps the MLX Kokoro model loaded in memory. The server starts automatically on first use, preloads the model in the background, and shuts down after 15 minutes of inactivity.

Each **Speak English** run requests `/speak/stream`, which renders the text one sentence at a time and sends each as a self-contained WAV frame. A detached helper script (`assets/play_queue.sh`) plays each frame the moment it lands on disk, so audio for long selections starts while the rest is still being generated. Identical requests are served from an in-memory cache.

Inference runs on the GPU through MLX (Apple's Metal-backed array framework), with no PyTorch dependency.

## Development

```bash
npm install
npm run dev
```
