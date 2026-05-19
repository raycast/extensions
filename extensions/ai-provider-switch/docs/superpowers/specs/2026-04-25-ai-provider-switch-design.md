# AI Provider Switch - Raycast Extension Design Spec

## Overview

A Raycast extension for managing AI provider configurations (`providers.yaml`) through a GUI, replacing manual YAML file editing. Users can browse, add, edit, delete providers and models, test connections, and query remote model lists.

All providers are assumed to be OpenAI API-compatible (using `/v1/models` endpoint and `data` array response format). Non-conforming APIs are not supported.

This extension is intended for publication to the Raycast Store. All code must strictly follow the official Raycast extension development guidelines, including project structure, manifest format (`package.json` with Raycast-specific fields), API usage, TypeScript conventions, linting rules, icon specifications, and any other requirements defined by Raycast's extension review process. Refer to the latest Raycast Developer documentation for authoritative guidance.

## Data Model

### Provider

```typescript
interface Provider {
  id: string;
  name: string;
  base_url: string;
  api_keys?: Record<string, string>;
  additional_parameters?: {
    return_images?: boolean;
    web_search_options?: {
      search_context_size?: "low" | "medium" | "high";
    };
  };
  models: Model[];
}
```

### Model

```typescript
interface Model {
  id: string;
  name: string;
  provider?: string;
  description?: string;
  context: number;
  abilities?: {
    temperature?: { supported: boolean };
    vision?: { supported: boolean };
    system_message?: { supported: boolean };
    tools?: { supported: boolean };
    reasoning_effort?: { supported: boolean };
  };
}
```

## Field Semantics

- **Provider `id`**: user-supplied, must be unique across all providers, used as internal identifier (e.g., `perplexity`, `siliconflow`)
- **Model `provider`**: optional string that maps to a key in the parent Provider's `api_keys`. Used when a Provider has multiple API keys and different models need different keys (e.g., `openai` key vs `anthropic` key under the same Provider). If the Provider has only one api_key, this field can be omitted.

## Validation Rules

- Provider `id`: required, must be unique, alphanumeric + hyphens only
- Provider `name`: required
- Provider `base_url`: required, must be a valid URL. Expected to already include the version path if needed (e.g., `https://api.perplexity.ai` or `http://localhost:4000`). The extension appends `/models` directly to `base_url` for API calls.
- Model `id`: required, must be unique within the same Provider
- Model `name`: required
- Model `context`: required, must be a positive integer

## File Path Strategy

- Default: `~/.config/raycast/ai/providers.yaml`
- User can override via extension Preferences (`providersYamlPath`)
- Write operations create a backup (`.providers.yaml.bak`) before saving. Only one backup is retained; each save overwrites the previous backup.

## Navigation Structure

```
Provider List (main page)
├── [Action] Add Provider
├── [Action] Duplicate Provider config (opens Provider Form with copied values before save)
└── Select a Provider →
    Provider Detail (Model List)
    ├── [Action] Edit Provider (id, name, base_url, api_keys, additional_parameters)
    ├── [Action] Test Connection
    ├── [Action] Query Remote Models
    ├── [Action] Add Model
    ├── [Action] Duplicate Model config (opens Model Form with copied values before save)
    ├── [Action] Delete Provider (with confirmation)
    └── Select a Model →
        Model Edit Form
        ├── Basic info: id, name, provider, description, context
        ├── Abilities: preset template + per-item toggles
        └── [Action] Delete Model (with confirmation)
```

## Page Details

### Provider List

- Each item shows: Provider name, base_url, model count
- No API Key display
- Supports search filtering

### Provider Detail (Model List)

- Header shows Provider basic info
- Lists all models under the Provider
- Each model shows: name, id, abilities summary (icons for vision/tools etc.)

### Provider Form (Add/Edit)

- Fields: id (add only, not editable after creation), name, base_url
- API Keys: dynamic key-value pair list. Each row has a "key name" text field (e.g., `openai`, `anthropic`) and a "key value" text field. Users can add/remove rows. The key name maps to the YAML `api_keys` key, which models reference via their `provider` field.
- Additional Parameters: structured fields (see below)

### Model Edit Form

- Basic fields: id, name, provider, description, context
- Abilities section: preset template dropdown + individual toggles
- Preset templates:
  - **Full**: temperature Y, vision Y, system_message Y, tools Y, reasoning_effort Y
  - **Basic**: temperature Y, vision N, system_message Y, tools N, reasoning_effort N
  - **Tools**: temperature Y, vision Y, system_message Y, tools Y, reasoning_effort N

### Additional Parameters (structured editing)

- `return_images`: boolean toggle
- `web_search_options.search_context_size`: dropdown (low / medium / high)

## API Features

### Test Connection

- GET `{base_url}/models` with first api_key as Bearer Token
- Timeout: 5 seconds
- Success: Toast "Connection successful"
- Failure: Toast with error details (timeout, 401, unreachable, etc.)

### Query Remote Models

- GET `{base_url}/models`, parse `data` array
- Display as multi-select list, each item shows model id
- Selected models are batch-added with "Basic" abilities template, context defaults to 128000
- Models already in the Provider are marked "Added" and cannot be re-added

### API Key Selection

- Single api_key: use directly
- Multiple api_keys: use the first one in the key-value list as displayed in the form (insertion order)

## API Key Masking

- Display: show only last few characters (e.g., `sk-****jvjxz`)
- Edit form: show full value

## Tech Stack

- Raycast Extension API (React + TypeScript)
- `js-yaml`: YAML read/write
- Raycast built-in `fetch`: API requests

## Project Structure

```
ai-provider-switch/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.tsx                # Main command entry: Provider list
│   ├── components/
│   │   ├── ProviderList.tsx      # Provider list
│   │   ├── ProviderDetail.tsx    # Provider detail (Model list)
│   │   ├── ProviderForm.tsx      # Add/Edit Provider form
│   │   ├── ModelForm.tsx         # Add/Edit Model form
│   │   └── RemoteModelList.tsx   # Remote model query list
│   ├── utils/
│   │   ├── yaml.ts              # YAML read/write, backup
│   │   ├── api.ts               # Test connection, query remote models
│   │   └── mask.ts              # API Key masking
│   └── types/
│       └── provider.ts          # Provider, Model type definitions
├── assets/
│   └── icon.png
└── README.md
```

## Extension Preferences

- `providersYamlPath` (optional): custom providers.yaml path, defaults to `~/.config/raycast/ai/providers.yaml`

## Error Handling

- File not found: prompt user to create, or auto-create empty providers.yaml
- YAML parse failure: Toast with format error, do not overwrite original file
- Write failure: Toast with error, backup file available for recovery
