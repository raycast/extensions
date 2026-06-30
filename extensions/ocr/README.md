# Extract Screenshot Text

Capture any part of your screen and turn it into text using an OpenRouter vision model.

## Setup

The extension needs an OpenRouter API key and an image-reading model before you can run it. When you first launch **Extract Screenshot Text**, the extension opens a guided setup flow.

1. Create an OpenRouter account and API key at [openrouter.ai/keys](https://openrouter.ai/keys).
2. Add your OpenRouter API key in the extension preferences.
3. Continue to the model picker. OCR uses your API key to load models available to your OpenRouter account.
4. Pick a model that can read images and return text.
5. Use the **Edit OCR Instructions** action if you want to customize how the AI reads and formats screenshots.

You can change **Default Copy Behavior** anytime in extension preferences to choose whether **Copy** uses plain text or Markdown.

The model picker always filters for models that accept image input and return text. You can search models and sort them by recommended order, name, price, release date, or context window.

OpenRouter usage is billed to your account based on the model you choose.

## What It Does

This extension adds two Raycast commands: **Extract Screenshot Text** for capture and **Change Model** for switching your OpenRouter model. **Edit OCR Instructions** is available as an action from the extraction flow when you want to customize how the AI reads and formats screenshots. When you launch Extract Screenshot Text, macOS opens selected-area screenshot capture. After you select an area, the extension sends the screenshot to OpenRouter, displays the extracted text in Raycast, and gives you a primary copy action.

The MVP does not keep extraction history, screenshot history, analytics, or a hosted backend.

## Usage

1. Run **Extract Screenshot Text** from Raycast.
2. Drag to select the screen area that contains text.
3. Wait for the result.
4. Use **Copy** to copy the extracted text.
5. Use **Copy as Plain Text** or **Copy with Formatting (Markdown)** if you want the other copy format.
6. Use **Try Again** if capture fails, the result is empty, or you want to capture a different area.

You can choose whether **Copy** uses plain text or Markdown by changing **Default Copy Behavior** in extension preferences.

To switch models later, run **Change Model** from Raycast or open it from extension settings.

## Privacy

Selected screenshots are sent directly from your Mac to OpenRouter for processing. The configured OCR instructions and a short OCR prompt are sent with each screenshot.

The extension:

- Does not store screenshots after processing.
- Does not store extracted text after the Raycast view is closed.
- Does not collect analytics.
- Does not send data to any service other than OpenRouter.
- Does not run a hosted backend.

Your OpenRouter API key is stored as a Raycast password preference. OpenRouter usage is billed according to your OpenRouter account, selected model, and provider routing.

## Troubleshooting

If capture does not start or fails, check macOS Screen Recording permissions for Raycast in **System Settings > Privacy & Security > Screen Recording**.

If OpenRouter rejects the request, run setup again and confirm that your API key is valid and that the selected model supports image input. Some text-only models cannot process screenshots.

If no text is found, try selecting a larger or clearer area, pick a different model in extension preferences, or adjust the instructions with the **Edit OCR Instructions** action.

## Development

Install dependencies:

```sh
npm install
```

Run the extension locally:

```sh
npm run dev
```

Run checks:

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

## Store Notes

Store screenshots live in `metadata/`. The extension icon is in `assets/icon.png`.
