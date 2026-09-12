# Image Atelier

Generate and edit images in Raycast with your own OpenAI-compatible image API. Discover image models, save results locally, and continue editing through a form or Raycast AI tools.

## Setup

1. Open **Generate or Edit Image** and enter your **API Base URL** and **API Key** in extension preferences. Include your provider's version path, for example `https://your-provider.example/v1`.
2. Open the action menu (`⌘K`) and choose **Choose Default Model**. The extension fetches the provider's model list automatically. Select a model and save it, or enter a model ID manually.
3. Enter a prompt and create an image. Add a PNG, JPEG, or WebP reference file to edit an existing image instead.

No provider, API Base URL, API key, or image model is preconfigured. Each user supplies their own provider account and key. Provider usage charges may apply. There is no bundled API service or shared key.

Image candidates are identified from output-modality metadata where available, or suggested from model names. Discovery does not verify Images API compatibility or generate a test image. Use **Show all models** for unrecognized models; manual entry remains available if `/models` is unsupported.

The default model is remembered separately for each API address and key. After changing providers or keys in preferences, reopen the model picker and choose a model again.

## Save and reuse images

Images are saved to `~/Pictures/Image Atelier/` by default. Change **Save Images To** in extension preferences to use another folder.

The result view provides **Open Image**, **Show in Finder**, **Save as…**, **Copy Image**, and **Edit This Image**. Save As creates a copy without replacing existing files or converting image formats. Original images remain in the output folder; the extension does not automatically delete them.

## Raycast AI

Mention `@image-atelier` in Raycast AI Chat to generate an image, then ask for changes in the same conversation. AI tools use the same saved model as the form. This requires access to Raycast AI tools; the standalone form calls your provider directly.

Example: `@image-atelier Generate a watercolor illustration of a mountain cabin at sunrise.`

Before an AI edit, a tool confirmation identifies the selected photo, destination, model, and instructions. The editing tool requires an absolute local image path supplied by the user or returned by a previous tool call. If a chat attachment does not expose a local path, save it first or use the form's file picker. Local image rendering in AI Chat depends on Raycast; tool results also include the saved file path.

## Provider compatibility

The provider must support Bearer authentication and the following OpenAI-style Images API:

- `GET /models`: optional model discovery returning `data[]` with model IDs.
- `POST /images/generations`: JSON with `model`, `prompt`, and `n: 1`.
- `POST /images/edits`: multipart form data with the same fields and one `image` file.
- Image response: `data[0].b64_json` or an HTTPS `data[0].url` that can be downloaded without authentication or redirects.

Base URLs may include a version prefix or end in `/images/generations` or `/images/edits`. HTTPS is required except for localhost services. Size and quality are omitted when **Provider Default** is selected; other values must be supported by the selected model.

PNG, JPEG, and WebP are supported. Editing accepts one reference image under 50 MB. Masks, multiple reference images, streaming, and Responses/Chat Completions image protocols are not supported. Model discovery may list models that require one of those other protocols.

Downloaded and decoded images are limited to 50 MiB. JSON responses have a separate bounded limit to allow base64 overhead; oversized bodies are canceled during reading.

Requests time out after five minutes; image downloads after one minute. Failed generation is not retried automatically because a provider may already have processed a request. Check provider activity before retrying.

## Privacy

Prompts and reference images are sent to the configured provider. The API key is stored through Raycast's password preference and sent only to the configured API. Image download requests do not include the API key. The extension does not add analytics or send images to an Image Atelier backend. Provider privacy policies apply to API requests.

## Development

```sh
npm ci
npm run dev
```

Use `npm run check` for type checking, linting, formatting, and mock API tests. Use `npm run check:store` for the additional online Raycast validation and distribution build. Tests do not call a paid image API.

See [the maintenance guide](docs/MAINTENANCE.md) for release steps and the current verification status. A [Chinese guide](docs/README.zh-CN.md) is also available.
