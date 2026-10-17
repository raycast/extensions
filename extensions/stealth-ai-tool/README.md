# Stealth AI

In-line AI formatting using Raycast AI. Works on both macOS and Windows.

## 🚀 Getting Started

1. **Select Text**: Highlight any text in any app.
2. **Run Action**: Trigger a "Stealth Action" via Raycast search, hotkey, or alias.
3. **Pasted Result**: The AI processes the text and pastes the result directly over your selection.

## Demo:

https://github.com/user-attachments/assets/3072d252-adf8-4272-906c-02434c9817d6

# Installation:

- run this code from your terminal

`git clone https://github.com/ahmed-exov/Raycast--Stealth-AI.git && cd Raycast--Stealth-AI && npm install && npm run dev`

- Open Raycast settings > Extensions > Stealth AI and assign shortcuts and aliases
- Start using in your favorite text editor

## 🖥️ Platform Support

- **macOS**: Full support with improved focus management
- **Windows**: Full support via Raycast Windows public beta

## ⚙️ Configuration & Customization

### 1. AI Provider & Model

Run the **Configure AI Model** command to pick a provider and model. Everything is stored locally, per provider, so you can switch back and forth without re-entering keys.

| Provider | Needs API key | Notes |
| --- | --- | --- |
| Raycast AI (default) | No | Uses the model from Raycast Settings > AI. Requires Raycast Pro. |
| OpenAI | Yes | |
| Anthropic | Yes | |
| Gemini | Yes | |
| OpenRouter | Yes | |
| **LM Studio (local)** | No | Runs on your machine. Default `http://localhost:1234` |
| **Ollama (local)** | No | Runs on your machine. Default `http://localhost:11434` |

Press `Cmd + R` in the configure view to fetch the model list, then pick one and save.

### 1a. Running Local Models (LM Studio / Ollama)

Local providers keep your text on your own machine - nothing is sent to a cloud API.

**LM Studio**

1. Open LM Studio and go to the **Developer** tab.
2. Toggle the server to **Running** (default port `1234`) and load a model.
3. In Raycast, run **Configure AI Model**, choose **LM Studio (Local)**, press `Cmd + R`, select your model and save.

**Ollama**

1. Make sure Ollama is running (`ollama serve`) and you have a model pulled, e.g. `ollama pull gemma3:1b`.
2. In Raycast, run **Configure AI Model**, choose **Ollama (Local)**, press `Cmd + R`, select your model and save.

Notes:

- The **Server URL** field accepts any common shape - `localhost:1234`, `http://127.0.0.1:1234/v1/` and `http://localhost:1234` all work.
- Point it at another machine on your network (e.g. `http://192.168.1.20:11434`) to use a model hosted elsewhere.
- The **API Key** field is optional for local providers; fill it in only if you put your server behind auth.
- Local requests are given up to 180 seconds, since a cold model may need to load first.

### 2. Hotkeys & Aliases

To make these actions truly "stealth", it is highly recommended to set up custom hotkeys or aliases for your most used actions:

- Open **Raycast Settings** > **Extensions**
- Search for **Stealth AI**
- Set a **Hotkey** (e.g., `Control + F` for Fix Grammar) or an **Alias** (e.g., `fx`) for each command.

### 3. Custom Prompts

Each action's title and prompt are Raycast preferences:

- Open **Raycast Settings** > **Extensions** > **Stealth AI**
- Pick the action and edit its **Action Title** and **AI Prompt**

Actions 6-9 ship with empty prompts and are meant for your own.

> Note: the in-app multiline prompt editor described in earlier versions is not currently implemented - prompts are single-line preference fields for now.

## 🛠️ Included Actions

- **Stealth Action 1 (Fix Grammar)**: Fixes typos and grammar errors.
- **Stealth Action 2 (Make Concise)**: Shortens text while preserving meaning.
- **Stealth Action 3 (Create List)**: Converts text into a bullet point list.
- **Stealth Action 4 (Make Professional)**: Rewrites text for business communication.
- **Stealth Action 5 (Simplify)**: Makes complex text easier to understand.
- **Actions 6-9**: Fully customizable slots for your own custom AI prompts.
