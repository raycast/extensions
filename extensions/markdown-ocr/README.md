# Markdown OCR

Turn a screenshot into Markdown text using Mistral’s next-generation OCR.

## Setup

1. Create a Mistral API key.
2. In Raycast: `Extensions` → `Markdown OCR` → `Preferences`
3. Fill:
   - `Mistral API Key`
   - (optional) `Mistral OCR Model` (default: `mistral-ocr-latest`)

## Usage

1. Run the `OCR` command (default input is an interactive screenshot on macOS).
3. The extracted Markdown is copied to your clipboard (and optionally pasted into the frontmost app).

Tip: You can switch the input mode to `Clipboard (latest image)` in preferences.

## macOS permissions

- Screenshot mode requires **Screen Recording** permission for Raycast.
- If you enable “Paste result after copy”, Raycast may require **Accessibility** permission to paste into other apps.

Tip: The command now shows a one-time “Setup (macOS permissions)” toast with shortcuts to the right System Settings pages.
