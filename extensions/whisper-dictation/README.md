# 🎤 Whisper Dictation for Raycast

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Effortlessly convert your speech to text directly within Raycast using the power of [`whisper.cpp`](https://github.com/ggerganov/whisper.cpp). This extension provides a simple interface to record audio, transcribe and refine it locally, privately on your machine. Refine the text with custom prompts privately using ollama, or additionally with Raycast AI or any v1 (OpenAI) compatible API.
## ✨ Features

*   **Local Transcription:** Uses `whisper.cpp` running locally on your machine through Raycast.
*   **Refine with AI** Optionally refine the transcribed text using Raycast AI or any OpenAI (v1) compatible API, such as Anthropic, OpenAI, a local Ollama server.
    **Download Models** Download a variety of whisper models from right within the extension.
    **Dictation History** Saves all transcriptions locally with timestamps which can be browsed, copied and pasted using the Dictation History command.
*   **Simple Interface:** Start recording, press Enter to stop, copy or paste directly into your active window.
*   **Configurable Output:** Choose to choose, or automatically paste/copy to clipboard. 

## ⚠️ Requirements

Before installing the extension, you need the following installed and configured on your system:

1.  **Raycast:** You need the Raycast app installed.
2.  **`whisper.cpp`:** You must install whisper-cpp. 
    * The easiest way is to use [Homebrew](https://brew.sh/): `brew install whisper-cpp`
    * If installed another way make sure to update the path to your whisper-cli executable in the extension's preferences.
3.  **Whisper Model File:** 
    * Download a model using the `Download Whisper Model` extension command. This will configure the model's path automatically. 
    * Alternatively, download a model yourself (`ggml-{model}.bin`) and point the extension to it's path in preferences.
4.  **`sox`:** This extension uses the SoX (Sound eXchange) utility for audio recording.
    *   The easiest way to install it on macOS is with [Homebrew](https://brew.sh/): `brew install sox`
    *The extension currently default for `sox` to be at `/opt/homebrew/bin/sox`. If yours is installed somewhere else, point the extension to it's executable in preferences.

## 🚀 Installation

**This ectension is now available to download from the [Raycast Store](https://www.raycast.com/finjo/whisper-dictation). However if you'd prefer to build from source see below**

## ⚙️ Configuration

After installing, you have to configure the extension preferences in Raycast, if you installed both SoX and whisper-cpp using homebrew, and download a model using the extension this should all be pre-configured for you, the extension will also confirm both SoX and whisper-cli path on first launch which will allow you to immediately start using simple dictation once configured:

1.  Open Raycast Preferences (`⌘ + ,`).
2.  Navigate to `Extensions`.
3.  Find "Whisper Dictation" in the list.
4.  Set the following required preferences:
    *   **Whisper Executable Path:** Enter the *full, absolute path* to your compiled `whisper.cpp` executable (e.g., `/path/to/your/whisper.cpp/build/bin/whisper-cli`).
    * Or if you installed via homebrew on an intel mac: `/usr/local/bin/whisper-cpp`
    *   **Whisper Model Path:** Enter the *full, absolute path* to your downloaded `.bin` model file (e.g., `/path/to/your/whisper.cpp/models/ggml-base.en.bin`).
    * **SoX executable path** Enter the *full, absolute path* to your sox executable
    * For example if you installed SoX using homebrew on an Intel mac you would use:
    * `/usr/local/bin/sox`
    *   **Default Action After Transcription (Optional):** Choose what happens automatically when transcription finishes:
        *   `Paste Text`: Pastes the text into the active application.
        *   `Copy to Clipboard`: Copies the text to the clipboard.
        *   `None (Show Options)`: Shows the transcribed text in Raycast with manual Paste/Copy actions (Default).
5. Configure other preferences such as wether to be asked which refinement prompt to use before each transcription, or use the prompt chosen in `Configure AI Refinement` by default.

## 💡 Usage

1.  **Launch:** Open Raycast and search for the "Dictate Text" command. Press Enter.
2.  **Download a Model** 
    * Choose the `Download Whisper Model` command and choose the model you would like to download with `Enter`.
    * You can choose your active model with `Enter` if you have multiple models downloaded.
    * Larger models are more accurate, but also slower and require more ram/processing power
    * Delete models you no longer need using `Ctrl+X`
3.  **Record:** Open the `Dictate Text` command. The extension window will appear, showing a "RECORDING AUDIO..." message and a waveform animation. Start speaking clearly.
    *   Press `Enter` when you are finished speaking.
    *   Press `⌘ + .` or click "Cancel Recording" to abort.
4.  **Transcribe:** The view will change to show a loading indicator while `whisper.cpp` processes the audio. This may take a few seconds depending on the audio length and model size.
5.  **Result:**
    *   If transcription is successful, the text area will populate with the dictated text.
    * If there are any mistakes you can modify the text directly within the text box (as long as auto copy/paste isn't active)
    *   Based on your "Default Action" preference:
        *   It might automatically paste or copy, and close Raycast.
        *   Or, it will display the text with actions:
            *   `Paste Text`: Pastes the content.
            *   `Copy Text` (`⌘ + Enter`): Copies the content.
            *   Or automate the process in `Preferences`
            *   `Close` (`Esc`): Closes the Raycast window.
    *   If an error occurs during recording or transcription, an error message will be displayed.
6. **History:** Check back in your `Dictation History` anytime you need a past transcription. It currently stores up to 100. 
    * Delete transcriptions as needed with `Ctrl+X` 
    * Or delete all with `Ctrl+Shift+X` for a fresh start.

## 🖋️ Refine with AI

Automate the formatting/style of your transcriptions by refining them using AI. This feature can reformat text, correct grammar, or apply custom instructions based on your needs. 

**How it Works:**

1.  **Enable in Preferences:** Go to Raycast Preferences > Extensions > Whisper Dictation, or head to `Configure AI Refinement` and press `Enter`.
2.  **Choose Method:** Select your preferred AI service under "AI Refinement Method":
    *   **Disabled:** No AI refinement is applied (Default).
    *   **Raycast AI:** Uses Raycast's built-in AI capabilities (Requires Raycast Pro). Select your desired model (e.g., GPT-4o mini, Claude Haiku).
    *   **Ollama/v1:** Connects to a local Ollama instance running on your machine or a reachable server or any compatible API. You'll need to provide:
        *   **Endpoint:** The URL of your Ollama server or external API (e.g. `http://localhost:11434`, `https://api.openai.com`).
        *   **Model:** The name of the model you want to use (e.g., `llama3.2:latest`, `gpt-4o-latest`). If using Ollama, make sure this model is pulled and available: `ollama ls`.
        * If applicable enter the API key for your chosen provider
3.  **Configure Prompts (Optional):** Use the `Configure AI Refinement` command to manage how the AI refines your text.

**Using the `Configure AI Refinement` Command:**

This command allows you to customize the instructions given to the AI:

*   **View Status:** See if AI refinement is enabled and check the connection status if using Ollama.
*   **Manage Prompts:**
    *   View a list of available prompts (includes defaults like "Email Format", "Bullet Points").
    *   **Add New Prompts:** Create your own custom instructions (e.g., "Summarize this into one sentence", "Format as meeting notes").
    *   **Edit Prompts:** Modify existing prompts (`Ctrl-E`).
    *   **Delete Prompts:** Remove prompts you no longer need (`Ctrl + X`).
    *   **Set Active Prompt:** Choose which prompt will be used for refinement by selecting it and using the "Set as Active Prompt" action. The active prompt is marked with a green checkmark.
*   **Quick Access to Preferences:** Easily jump to the extension preferences to change the AI method or models.

When AI refinement is enabled, after the initial transcription, the text will be sent to your chosen AI along with the *active prompt*. The refined text will then be handled the same as regularly transcribed text, and stored in your dictation history. 

## 🤖 Models

The extension downloader currently supports the following whisper models, however you can download any model you might need from [ggervanov/whisper.cpp](https://huggingface.co/ggerganov/whisper.cpp/tree/main) and configure it's path in the extension's preferences:

* **Tiny, English Language** (`tiny.en`, 78 MB) - Smallest, speediest, least accurate however optimised for english language
* **Base, English Language** (`base.en`, 148 MB) - Small and speedy, same size as `base` but more accurate if just transcribing in english
* **Small, English Language** (`small.en`, 488MB) - Optimised for english, slightly larger and more accurate than base while not consuming too many resources
* **Medium, English Language** (`medium.en`, 1.53 GB - Slightly larger again, optimised for english, transcriptions will be slower than above and consume more resources, but will be more accurate
* **Tiny, Multilingual** (`tiny`, 78 MB) - Smallest, speediest, least accurate
* **Base, Multilingual** (`base`, 148 MB) - Small, speedy and multilingual
* **Small, Multilingual** (`small`, 488 MB) - Still pretty speedy and multilingual
* **Medium, Multilingual** (`medium`, 1.53 GB) - Slower, more accurate and multilingual.
* **Large, Multilingual** (`large-v3`, 3.1 GB) - The largest, slowest, most accurate model available. Use only if you have a powerful computer or a lot o time on your hands, especially for longer transcriptions.
* **Turbo Multilingual** (`large-v3-turbo`, 1.62GB) - Based on the large model but much faster at the cost of accuracy. Has a chance to begin repeating itself on longer transcriptions.

## 🐛 Troubleshooting

*   **"Command failed to start" / Sox Errors:**
    *   Verify `sox` is installed correctly (`brew install sox`).
    *   Check if the path `/opt/homebrew/bin/sox` is correct for your installation. If not, you may need to edit `dictate.tsx` or create a symlink.
    *   Ensure Raycast (or your terminal if running `sox` manually) has microphone permissions in System Settings > Privacy & Security > Microphone.
*   **"Transcription failed" / Whisper Errors:**
    *   Double-check the "Whisper Executable Path" in preferences. Ensure it's the correct, full path to the *executable file* (not just the directory).
    *   Double-check the "Whisper Model Path" in preferences. Ensure it's the correct, full path to the `.bin` file.
    *   Verify file permissions for both the executable and the model file. They need to be readable and executable (for the `main` binary).
    *   Ensure the model file is compatible with your compiled version of `whisper.cpp`.
    *   Check the Raycast Console for more detailed error messages (Open Raycast > `Developer Tools` > `Show Extension Logs`).
*   **No Audio Recorded / Poor Quality:**
    *   Check your microphone input level in System Settings > Sound > Input.
    *   Ensure the correct microphone is selected as the default input device.
*   **Extension doesn't appear:**
    *   Ensure you ran `npm install` and `npm run build` in the extension directory.
    *   Try removing and re-importing the extension in Raycast preferences.
*   **Refining Errors:** 
    *   If using Ollama/External API:
        * Double check your model code, use `ollama ls` to check installed models with ollama, or find external API models in their documentation
        * Double check your API key is correct, or if you don't need one that it is empty
        * Double check your endpoint. Only include the base URL in the endpoint e.g.:
            *   **Ollama:** http://localhost:11434
            *   **External API:** https://api.anthropic.com
    *   If using Raycast AI make sure that you have paid for Raycast Pro

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details (or state MIT directly if no file exists).

## ❤️ Acknowledgements

*   [Georgi Gerganov](https://github.com/ggerganov) for the amazing [`whisper.cpp`](https://github.com/ggerganov/whisper.cpp) project.
*   The [Raycast](https://raycast.com/) team for the fantastic platform and API.
*   [SoX - Sound eXchange](https://github.com/chirlu/sox) developers.

---
