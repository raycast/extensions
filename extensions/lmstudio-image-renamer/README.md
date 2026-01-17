# LM Studio Image Renamer

A Raycast extension that renames image files using AI-generated descriptive names via LM Studio's vision models.

## Requirements

- [Raycast](https://raycast.com)
- [LM Studio](https://lmstudio.ai) with a vision-capable model loaded
- Node.js 18+

## Installation

```bash
npm install
npm run dev
```

## Usage

1. Start LM Studio and load a vision model (e.g., LLaVA, BakLLaVA)
2. Enable the local server in LM Studio (default: `http://localhost:1234`)
3. Select one or more images in Finder
4. Run the "Rename Selected Images" command in Raycast
5. Select a model and confirm

## Configuration

| Preference | Default | Description |
|------------|---------|-------------|
| `lmstudioUrl` | `http://localhost:1234` | LM Studio server URL |

## Supported Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)
- BMP (.bmp)
- TIFF (.tiff)

## API

The extension uses LM Studio's OpenAI-compatible API:

- `GET /v1/models` - List available models
- `POST /v1/chat/completions` - Generate image descriptions

## Project Structure

```
src/
  lib/
    lmstudio.ts    # LM Studio API client and file operations
  rename-images.tsx # Raycast UI components
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development mode |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix linting errors |

## License

MIT
