# fal Browser for Raycast

Raycast extension to browse fal models and run them quickly.

## Features

- Browse and search available fal endpoints
- Open a model and render a dynamic input form from the model OpenAPI schema
- Run a model directly from hotkeys using default no-image and image-input endpoints
- Reopen the last used model automatically, with image-aware routing
- Pull selected Finder image paths into image-capable model fields
- Upload local image paths automatically before invoking fal

## Setup

1. Install dependencies:

```bash
npm install
```

2. Run Raycast in development mode:

```bash
npm run dev
```

3. Set extension preferences in Raycast:
   - `fal API Key`
   - optional `Default No-Image Endpoint ID`
   - optional `Default Image-Input Endpoint ID`

## Usage

- Use `Browse Fal Models` to find and launch any model.
- In browse results, run `Set As Default No-Image Model` or `Set As Default Image-Input Model`.
- Bind hotkeys to `Run Fal No-Image Model`, `Run Fal Image-Input Model`, and `Run Last Used Model`.
- Select an image in Finder before running a model to prefill image fields.
- After each run, review output + full response in a request-finished screen and jump back to the prompt in one action.
