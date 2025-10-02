# Screenshot OCR - COPY/PASTE

This Raycast extension lets you capture a screen region, run OCR on the captured image, and copy the recognized text to your clipboard so you can paste it immediately.

## Features

- Capture a region of the screen interactively
- OCR the image using OCR.Space (no key required, optional API key for higher limits)
- Copy recognized text to the clipboard automatically; optional auto-paste
- Optional preference to include the mouse cursor in the screenshot
- Demo gallery with real-world scenarios (web, chat, video captions, tables, desktop UI, receipts)

## Requirements

- macOS (uses the system `screencapture` CLI)
- Raycast 1.26.0+

## Commands & Tools

- `Copy OCR Text` (`copy`, no-view): Capture, OCR, and copy recognized text to the clipboard.
- `Copy OCR Text and Paste` (`copyAndPaste`, no-view): Capture, OCR, copy, and immediately paste into the frontmost app.
- `Open OCR Preferences` (`openPreferences`, no-view): Open the extension preferences.
- `Toggle Auto Paste (⌘V after OCR)` (`toggleAutoPaste`, no-view): Toggle persisted auto-paste setting.
- `Copy Last OCR Result` (`copyLastResult`, no-view): Copy the last recognized OCR text and show a HUD snippet.
- `Demo Gallery` (`demoGallery`, view): Browse demo scenarios that illustrate typical OCR screenshot use cases.
- `Last OCR Result` (`lastOcrResult`, view): View the last OCR result with metadata and copy options.

- Tool: `Screenshot OCR` (`screenshot`): Takes screenshots, applies OCR, and provides AI-powered analysis of extracted text in Raycast AI.

## Preferences

- `OCR Provider` (dropdown): Choose between `OCR.Space (Cloud)` and `Tesseract (Local)`.
- `OCR.Space API Key` (password, optional): If empty, the demo key is used and is heavily rate-limited.
- `Include Cursor in Screenshot` (checkbox): Shows/hides the mouse cursor in the captured image.
- `OCR Language` (textfield): Three-letter ISO 639-2 code, e.g., `eng` for English. Defaults to `eng`.
- `After Copy → Paste immediately after OCR` (checkbox): If enabled, automatically pastes the recognized text into the frontmost app. Defaults to ON.
- `Post-Processing → Apply heuristic cleanup` (checkbox): Normalizes quotes/dashes, fixes ligatures, and cleans whitespace. Defaults to ON.
- `Post-Processing (AI) → Use Raycast AI to refine text` (checkbox): If you have Raycast Pro, you can use Quick AI to improve OCR text.
- `AI Refinement Prompt` (textfield): Optional custom prompt for AI post-processing.
- `Ollama (Local AI)` (checkbox + fields): Optionally use a local Ollama model (default `llama3.2:3b` at `http://localhost:11434`) to refine the text instead of Raycast AI.

## How it works

1. The command (or tool) invokes the macOS `screencapture` utility in interactive mode to let you select a region.
2. The captured image is saved temporarily to the Raycast support directory.
3. The image is encoded as a base64 Data URL and posted to `https://api.ocr.space/parse/image`.
4. The recognized text is copied to the clipboard and the temp file is deleted.

 

## Getting Started

1. Install "Screenshot OCR" from the Raycast Store.
2. Open Raycast and run one of the commands:
   - "Copy OCR Text" to copy recognized text
   - "Copy OCR Text and Paste" to copy and immediately paste
   - "Demo Gallery" to preview common OCR use cases and results
3. Optional setup in the command preferences:
   - Add your OCR.Space API Key to avoid demo-key rate limits
   - Switch "OCR Provider" to "Tesseract (Local)" if you prefer local OCR
4. Capture a region on screen; recognized text goes to your clipboard (and is pasted if enabled).

If you run into rate limits or need higher accuracy, get a free API key from [OCR.Space](https://ocr.space/ocrapi) and add it to the extension preferences.

## Notes & Limitations

- Cancelling the selection exits quietly without an error.
- The demo OCR key (`helloworld`) is rate-limited and for testing only.
- If you select `Tesseract (Local)` as provider, ensure Tesseract is installed and on your PATH, e.g.: `brew install tesseract`.
- If you enable Ollama post-processing, ensure Ollama is installed and running with your chosen model pulled.
- Accuracy varies with font, size, contrast, and image quality. Consider zooming in before capturing for better results.
- Only `png` images are used in the current flow.

## Troubleshooting

- Screen Recording permission: On first use, macOS may ask Raycast for Screen Recording permission. Approve it in System Settings → Privacy & Security → Screen Recording.
- OCR.Space rate limits: Without an API key, the demo key is rate-limited. Add your own key in the extension preferences.
- Tesseract (Local) provider: Install via Homebrew `brew install tesseract` and select the provider in preferences.
- No text recognized: Zoom in before capturing, ensure good contrast, and try recapturing a slightly larger region.

## Future enhancements

- Additional OCR providers (e.g., Tesseract via native binary, Vision API, etc.)
- Language dropdown with common presets
- Post-processing heuristics by font family or domain-specific patterns
- Persist recent OCR results and offer quick paste history