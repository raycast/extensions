# API Code Generation

This project uses OpenAPI Generator to automatically generate TypeScript API clients from the OpenHue API specification.

## Updating Generated Code

To regenerate the API client with the latest OpenHue API specification:

```bash
npm run generate-code
```

This command will:
1. Download the latest OpenAPI spec from `https://api.redocly.com/registry/bundle/openhue/openhue/v2/openapi.yaml?branch=main`
2. Generate TypeScript API clients and models using `openapi-generator-cli`
3. Create index files for easy imports
4. Auto-format the generated code with Prettier

## Generated Structure

```
src/api/generated/
└── src/
    ├── apis/           # 16 API classes (LightApi, RoomApi, SceneApi, etc.)
    ├── models/         # 130+ TypeScript models
    ├── runtime.ts      # Fetch runtime for API calls
    └── index.ts        # Main export file
```

## Configuration

- **OpenAPI Spec**: `openapi.yaml` (downloaded automatically)
- **Generator Config**: `openapi-generator-config.yaml`
- **Generator**: `typescript-fetch` (v7.18.0)
- **Ignore Rules**: `src/api/generated/.openapi-generator-ignore`

## Manual Generation

If you need more control, you can run the steps individually:

```bash
# Download spec
curl -s https://api.redocly.com/registry/bundle/openhue/openhue/v2/openapi.yaml?branch=main -o openapi.yaml

# Generate code
npm run generate:api

# Create index files
npm run generate-code:indexes

# Format code
npm run fix-lint
```

## What Gets Generated

- ✅ API classes (`src/api/generated/src/apis/`)
- ✅ Model types (`src/api/generated/src/models/`)
- ✅ Runtime configuration (`src/api/generated/src/runtime.ts`)
- ❌ Documentation (skipped via `.openapi-generator-ignore`)
- ❌ Package files (skipped)
- ❌ Config files (skipped)

## Integration

The generated code is integrated via a custom fetch adapter (`src/api/fetch-adapter.ts`) that bridges the generated fetch-based code with the existing HTTPS client, preserving:
- Credential loading from Raycast preferences or `~/.openhue/config.yaml`
- Self-signed certificate acceptance
- Custom error handling
