# deAPI

Generate images, videos and speech, transcribe videos and edit images from Raycast with open-source models such as FLUX, Z-Image, LTX, Kokoro and Whisper, running on [deAPI](https://deapi.ai/?utm_source=raycast&utm_medium=extension).

## Setup

1. Create a deAPI account at [app.deapi.ai](https://app.deapi.ai/register?utm_source=raycast&utm_medium=extension) and an API key under **Settings → API Keys**.
2. Run any deAPI command and paste the key when Raycast asks for it.

deAPI charges per request, with no subscription. Prices for each model are on [deapi.ai/pricing](https://deapi.ai/pricing?utm_source=raycast&utm_medium=extension).

## Commands

| Command | What it does |
| --- | --- |
| Generate Image | Image from a text prompt, in square, landscape or portrait. |
| Edit Image | Changes an image with a text instruction. Add up to two more images as references. Uses the image selected in Finder or File Explorer. |
| Generate Video | Short video from a prompt, or from a first-frame image. |
| Text to Speech | MP3 from the selected text or text you type, with 41 Kokoro voices in 7 languages. |
| Transcribe | Transcript of a YouTube, X, TikTok, Twitch or Kick link (taken from the selection or clipboard), or of an audio or video file. |
| Remove Background | Transparent PNG from an image. |
| Upscale Image | The image at four times the size. |
| Generation History | Every result, with jobs that are still running and your balance. |

Results are saved to your Downloads folder, or the folder set in the extension preferences. From an image result you can go straight to editing, animating, removing the background or upscaling it.

## Raycast AI

Mention `@deapi` in Raycast AI to generate an image, transcribe a video link or read text aloud, for example:

- `@deapi draw a watercolor fox under a maple tree`
- `@deapi summarize https://www.youtube.com/watch?v=…`

## Privacy

The extension sends your prompts, text, links and the files you choose to deAPI to run the request. The API key is stored in Raycast's encrypted preferences and is only sent to `api.deapi.ai`.
