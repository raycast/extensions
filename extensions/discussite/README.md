# Discussite Raycast Extension

Open the current HTTPS site as a Discussite Site from Raycast.

## Command

| Command | Description |
| --- | --- |
| `Open in Discussite` | Open the current HTTPS browser tab or a pasted HTTPS URL as a Discussite Site |

## Current Behavior

- Uses the active browser tab when Raycast's Browser Extension can read it
- Accepts a URL argument when you want to pass one explicitly
- Normalizes URL input and enforces HTTPS client-side before opening Discussite
- Opens the matching Discussite Site in the production web app at `https://discuss.site`
- Makes no direct API calls

## Development

```bash
# from the repo root
npm install
npm run dev -w apps/raycast
```

## Build And Publish

```bash
npm run build -w apps/raycast
npm run lint -w apps/raycast
npm run typecheck -w apps/raycast
npm run publish -w apps/raycast
```

## Notes

- This extension is currently macOS-only because active-tab autofill depends on
  Raycast's Browser Extension API.
- Active-tab autofill depends on Raycast's Browser Extension permissions.
- The extension is intentionally thin: Discussite handles slug resolution, Site creation, and the actual product flow.
