# LM Studio for Raycast

Use your local AI models from [LM Studio](https://lmstudio.ai) directly inside Raycast — no cloud, no API key, fully private.

## Features

- **Ask local AI** — Send a prompt to the currently loaded model and get a response, with full multi-turn conversation support
- **Start LM Studio Server** — Launch the LM Studio local server and load a model, all from Raycast

## Requirements

- [LM Studio](https://lmstudio.ai) installed and launched at least once
- The `lms` CLI available at `%USERPROFILE%\.lmstudio\bin\lms.exe` (bundled with LM Studio)
- A model downloaded in LM Studio

## Commands

### Ask local AI

Send a prompt to the currently loaded model on your LM Studio server.

- **Argument:** `prompt` — the question or message to send
- Automatically detects the currently loaded model
- Supports multi-turn conversations — press `Enter` to reply after each response
- Filters out `<think>` reasoning blocks for cleaner output

> Make sure the LM Studio server is running and a model is loaded before using this command. Use **Start LM Studio Server** first if needed.

### Start LM Studio Server

Start the LM Studio local server and load a specific model from Raycast.

- **Argument:** `model` — the model identifier (e.g. `qwen/qwen3-4b`)
- Checks if the server is already running before starting it
- Loads the specified model automatically
- Displays real-time status steps and metadata on success

To find your model's identifier, run `lms ls` in a terminal.

## Usage

1. Open Raycast and run **Start LM Studio Server**
2. Enter the model ID you want to load (e.g. `qwen/qwen3-4b`)
3. Wait for the server and model to be ready
4. Run **Ask local AI** and start chatting

## Privacy

All inference runs locally on your machine. No data is sent to any external server.
