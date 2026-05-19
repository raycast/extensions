# AI Provider Switch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Raycast extension that provides a GUI for managing AI provider configurations (`providers.yaml`), supporting CRUD operations on providers and models, connection testing, and remote model discovery.

**Architecture:** Single-command extension using Raycast's `List` → `Action.Push` navigation pattern for hierarchical browsing (Providers → Models → Edit). Data is read/written from a YAML file using `js-yaml`. API features (test connection, query models) use Raycast's built-in `fetch` against OpenAI-compatible `/models` endpoints.

**Tech Stack:** Raycast Extension API, TypeScript, React, js-yaml, @raycast/utils

## Current Status (2026-05-03)

- Implementation tasks 1-9 are complete in the current codebase, and the repository has commits for scaffolding through provider/model duplication flow.
- Automated checks completed on 2026-05-03 under local Node.js `v22.22.2`: `npm run lint` passes, `npm run build` passes, and `npm audit --omit=dev && npm audit` reports 0 vulnerabilities.
- Raycast UI end-to-end workflow testing still requires manual verification inside Raycast; keep Task 10 Step 1 open until the checklist is run in the app.
- Store preparation is partially complete: manifest fields, README, lockfile presence, and 512x512 PNG icon are verified.
- This directory now pins Node.js with `.nvmrc` to `22.22.2`; the global `nvm default` remains `v20.14.0`.
- Raycast dependencies were upgraded on 2026-05-03: `@raycast/api@^1.104.15`, `@raycast/utils@^2.2.4`, and `@raycast/eslint-config@^2.1.1`.
- Store-prep sources checked on 2026-05-03:
  - `https://developers.raycast.com/basics/getting-started`
  - `https://developers.raycast.com/basics/prepare-an-extension-for-store`
  - `https://developers.raycast.com/information/manifest`

## Current Focus (2026-05-04)

Implement the first hardening and workflow-improvement batch:

- Safer `providers.yaml` writes with atomic replacement, external modification detection, and backup restore entry points.
- Stronger Provider form validation for named API keys, including duplicate names, half-filled rows, and per-row removal.
- Better remote model import workflows with Select All/Select Unadded and a Sync view that separates new, existing, and remote-missing models.

---

## File Structure

```
ai-provider-switch/
├── package.json              # Raycast manifest with commands, preferences
├── tsconfig.json             # TypeScript config (Raycast standard)
├── src/
│   ├── manage-providers.tsx  # Main command entry: ProviderList component
│   ├── types.ts              # Provider, Model, ProvidersConfig interfaces
│   ├── constants.ts          # Default path, ability templates
│   ├── yaml.ts               # YAML read/write/backup utilities
│   ├── api.ts                # Test connection, query remote models
│   ├── mask.ts               # API Key masking utility
│   ├── ProviderDetail.tsx    # Provider detail view (model list)
│   ├── ProviderForm.tsx      # Add/Edit Provider form
│   ├── ModelForm.tsx         # Add/Edit Model form
│   └── RemoteModelList.tsx   # Remote model query + batch add
├── assets/
│   └── extension-icon.png    # 512x512 extension icon
└── README.md
```

---

### Task 1: Project Scaffolding

**Files:**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `assets/extension-icon.png`
- Create: `README.md`

- [x] **Step 1: Create package.json with Raycast manifest**

```json
{
  "$schema": "https://www.raycast.com/schemas/extension.json",
  "name": "ai-provider-switch",
  "title": "AI Provider Switch",
  "description": "Manage Raycast AI provider configurations (providers.yaml) with a visual interface",
  "icon": "extension-icon.png",
  "author": "ruqing_wang",
  "categories": ["Productivity", "Developer Tools"],
  "license": "MIT",
  "preferences": [
    {
      "name": "providersYamlPath",
      "title": "Providers YAML Path",
      "description": "Custom path to providers.yaml. Leave empty to use default (~/.config/raycast/ai/providers.yaml)",
      "type": "textfield",
      "required": false,
      "placeholder": "~/.config/raycast/ai/providers.yaml"
    }
  ],
  "commands": [
    {
      "name": "manage-providers",
      "title": "Manage AI Providers",
      "description": "Browse, add, edit, and delete AI providers and models",
      "mode": "view"
    }
  ],
  "dependencies": {
    "@raycast/api": "^1.93.2",
    "@raycast/utils": "^1.19.1",
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "@raycast/eslint-config": "^1.0.11",
    "@types/js-yaml": "^4.0.9",
    "@types/node": "22.14.1",
    "@types/react": "19.1.2",
    "eslint": "^8.57.1",
    "prettier": "^3.5.3",
    "typescript": "^5.8.3"
  },
  "scripts": {
    "build": "ray build",
    "dev": "ray develop",
    "fix-lint": "ray lint --fix",
    "lint": "ray lint",
    "prepublishOnly": "echo \"Error: no publish script\" && exit 1",
    "publish": "npx @raycast/api@latest publish"
  }
}
```

- [x] **Step 2: Create tsconfig.json**

```json
{
  "$schema": "https://www.raycast.com/schemas/extension.json",
  "compilerOptions": {
    "lib": ["es2020"],
    "module": "commonjs",
    "target": "es2020",
    "strict": true,
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "moduleResolution": "node",
    "resolveJsonModule": true
  }
}
```

- [x] **Step 3: Create a placeholder extension icon**

Place a 512x512 PNG icon at `assets/extension-icon.png`. For now, use a simple placeholder. A proper icon should be designed before store submission.

- [x] **Step 4: Create README.md**

```markdown
# AI Provider Switch

Manage Raycast AI provider configurations (`providers.yaml`) with a visual interface.

## Features

- Browse all AI providers and their models
- Add, edit, and delete providers
- Add, edit, and delete models with ability preset templates
- Test provider API connections
- Query remote model lists and batch-add models
- Duplicate provider/model configs through prefilled edit forms before saving
- Automatic backup before each save

## Configuration

By default, the extension reads from `~/.config/raycast/ai/providers.yaml`. You can set a custom path in the extension preferences.
```

- [x] **Step 5: Install dependencies and verify build**

Run: `npm install && npm run build`
Expected: Build succeeds with no errors.

- [x] **Step 6: Commit**

```bash
git init
git add package.json tsconfig.json assets/ README.md
git commit -m "feat: scaffold Raycast extension project"
```

---

### Task 2: Type Definitions and Constants

**Files:**

- Create: `src/types.ts`
- Create: `src/constants.ts`

- [x] **Step 1: Create type definitions**

Create `src/types.ts`:

```typescript
export interface Abilities {
  temperature?: { supported: boolean };
  vision?: { supported: boolean };
  system_message?: { supported: boolean };
  tools?: { supported: boolean };
  reasoning_effort?: { supported: boolean };
}

export interface Model {
  id: string;
  name: string;
  provider?: string;
  description?: string;
  context: number;
  abilities?: Abilities;
}

export interface AdditionalParameters {
  return_images?: boolean;
  web_search_options?: {
    search_context_size?: "low" | "medium" | "high";
  };
}

export interface Provider {
  id: string;
  name: string;
  base_url: string;
  api_keys?: Record<string, string>;
  additional_parameters?: AdditionalParameters;
  models: Model[];
}

export interface ProvidersConfig {
  providers: Provider[];
}

export interface RemoteModel {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
}

export interface RemoteModelsResponse {
  data: RemoteModel[];
}
```

- [x] **Step 2: Create constants**

Create `src/constants.ts`:

```typescript
import { Abilities } from "./types";

export const DEFAULT_PROVIDERS_PATH = "~/.config/raycast/ai/providers.yaml";

export const ABILITY_TEMPLATES: Record<
  string,
  { label: string; abilities: Abilities }
> = {
  full: {
    label: "Full",
    abilities: {
      temperature: { supported: true },
      vision: { supported: true },
      system_message: { supported: true },
      tools: { supported: true },
      reasoning_effort: { supported: true },
    },
  },
  basic: {
    label: "Basic",
    abilities: {
      temperature: { supported: true },
      vision: { supported: false },
      system_message: { supported: true },
      tools: { supported: false },
      reasoning_effort: { supported: false },
    },
  },
  tools: {
    label: "Tools",
    abilities: {
      temperature: { supported: true },
      vision: { supported: true },
      system_message: { supported: true },
      tools: { supported: true },
      reasoning_effort: { supported: false },
    },
  },
};

export const DEFAULT_CONTEXT = 128000;

export const API_TIMEOUT = 5000;
```

- [x] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [x] **Step 4: Commit**

```bash
git add src/types.ts src/constants.ts
git commit -m "feat: add type definitions and constants"
```

---

### Task 3: YAML Read/Write Utilities

**Files:**

- Create: `src/yaml.ts`

- [x] **Step 1: Implement YAML utilities**

Create `src/yaml.ts`:

```typescript
import { getPreferenceValues } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { ProvidersConfig } from "./types";
import { DEFAULT_PROVIDERS_PATH } from "./constants";

function expandHome(filePath: string): string {
  if (filePath.startsWith("~/")) {
    return path.join(process.env.HOME || "", filePath.slice(2));
  }
  return filePath;
}

export function getProvidersPath(): string {
  const prefs = getPreferenceValues<{ providersYamlPath?: string }>();
  const customPath = prefs.providersYamlPath?.trim();
  return expandHome(customPath || DEFAULT_PROVIDERS_PATH);
}

export function readProviders(): ProvidersConfig {
  const filePath = getProvidersPath();

  if (!fs.existsSync(filePath)) {
    return { providers: [] };
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const parsed = yaml.load(content) as ProvidersConfig | null;

  if (!parsed || !parsed.providers) {
    return { providers: [] };
  }

  return parsed;
}

function backupFile(filePath: string): void {
  if (fs.existsSync(filePath)) {
    const dir = path.dirname(filePath);
    const backupPath = path.join(dir, ".providers.yaml.bak");
    fs.copyFileSync(filePath, backupPath);
  }
}

export function writeProviders(config: ProvidersConfig): void {
  const filePath = getProvidersPath();
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  backupFile(filePath);

  const content = yaml.dump(config, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });

  fs.writeFileSync(filePath, content, "utf-8");
}
```

- [x] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [x] **Step 3: Commit**

```bash
git add src/yaml.ts
git commit -m "feat: add YAML read/write utilities with backup"
```

---

### Task 4: API and Mask Utilities

**Files:**

- Create: `src/api.ts`
- Create: `src/mask.ts`

- [x] **Step 1: Implement API utilities**

Create `src/api.ts`:

```typescript
import { Provider, RemoteModelsResponse } from "./types";
import { API_TIMEOUT } from "./constants";

function getFirstApiKey(provider: Provider): string | undefined {
  if (!provider.api_keys) return undefined;
  const keys = Object.values(provider.api_keys);
  return keys.length > 0 ? keys[0] : undefined;
}

export async function testConnection(
  provider: Provider,
): Promise<{ success: boolean; message: string }> {
  const apiKey = getFirstApiKey(provider);
  const url = `${provider.base_url.replace(/\/+$/, "")}/models`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, { headers, signal: controller.signal });

    if (response.ok) {
      return { success: true, message: "Connection successful" };
    }
    return {
      success: false,
      message: `HTTP ${response.status}: ${response.statusText}`,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { success: false, message: "Connection timed out (5s)" };
    }
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function queryRemoteModels(
  provider: Provider,
): Promise<RemoteModelsResponse> {
  const apiKey = getFirstApiKey(provider);
  const url = `${provider.base_url.replace(/\/+$/, "")}/models`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, { headers, signal: controller.signal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as RemoteModelsResponse;
    return data;
  } finally {
    clearTimeout(timeout);
  }
}
```

- [x] **Step 2: Implement mask utility**

Create `src/mask.ts`:

```typescript
export function maskApiKey(key: string): string {
  if (key.length <= 8) {
    return "****";
  }
  const prefix = key.slice(0, 3);
  const suffix = key.slice(-4);
  return `${prefix}****${suffix}`;
}
```

- [x] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [x] **Step 4: Commit**

```bash
git add src/api.ts src/mask.ts
git commit -m "feat: add API connection test, remote model query, and key masking"
```

---

### Task 5: Provider List (Main Command)

**Files:**

- Create: `src/manage-providers.tsx`

- [x] **Step 1: Implement the Provider List view**

Create `src/manage-providers.tsx`:

```typescript
import { Action, ActionPanel, Icon, List, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { useState, useCallback } from "react";
import { readProviders, writeProviders } from "./yaml";
import { Provider, ProvidersConfig } from "./types";
import ProviderDetail from "./ProviderDetail";
import ProviderForm from "./ProviderForm";

export default function ManageProviders() {
  const [config, setConfig] = useState<ProvidersConfig>(() => {
    try {
      return readProviders();
    } catch (e) {
      showToast({ style: Toast.Style.Failure, title: "Failed to read providers.yaml", message: String(e) });
      return { providers: [] };
    }
  });

  const reload = useCallback(() => {
    try {
      setConfig(readProviders());
    } catch (e) {
      showToast({ style: Toast.Style.Failure, title: "Failed to read providers.yaml", message: String(e) });
    }
  }, []);

  const saveAndReload = useCallback((newConfig: ProvidersConfig) => {
    try {
      writeProviders(newConfig);
      setConfig(newConfig);
      showToast({ style: Toast.Style.Success, title: "Saved" });
    } catch (e) {
      showToast({ style: Toast.Style.Failure, title: "Failed to save", message: String(e) });
    }
  }, []);

  const deleteProvider = useCallback(
    async (providerId: string) => {
      if (
        await confirmAlert({
          title: "Delete Provider?",
          message: `Are you sure you want to delete provider "${providerId}"?`,
          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
        })
      ) {
        const newConfig = {
          providers: config.providers.filter((p) => p.id !== providerId),
        };
        saveAndReload(newConfig);
      }
    },
    [config, saveAndReload],
  );

  return (
    <List navigationTitle="AI Providers" searchBarPlaceholder="Search providers...">
      {config.providers.length === 0 ? (
        <List.EmptyView
          title="No Providers Found"
          description="Add a provider to get started"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Provider"
                icon={Icon.Plus}
                target={<ProviderForm onSave={(provider) => saveAndReload({ providers: [...config.providers, provider] })} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        config.providers.map((provider) => (
          <List.Item
            key={provider.id}
            icon={Icon.Globe}
            title={provider.name}
            subtitle={provider.base_url}
            accessories={[{ text: `${provider.models.length} models`, icon: Icon.Box }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Models"
                  icon={Icon.List}
                  target={
                    <ProviderDetail
                      provider={provider}
                      onUpdate={(updated) => {
                        const newConfig = {
                          providers: config.providers.map((p) => (p.id === updated.id ? updated : p)),
                        };
                        saveAndReload(newConfig);
                      }}
                      onDelete={() => deleteProvider(provider.id)}
                    />
                  }
                />
                <Action.Push
                  title="Add Provider"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={
                    <ProviderForm
                      existingIds={config.providers.map((p) => p.id)}
                      onSave={(newProvider) => saveAndReload({ providers: [...config.providers, newProvider] })}
                    />
                  }
                />
                <Action
                  title="Duplicate Provider"
                  icon={Icon.CopyClipboard}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  onAction={() => duplicateProvider(provider)}
                />
                <Action
                  title="Delete Provider"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => deleteProvider(provider.id)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
```

- [x] **Step 2: Create placeholder files for pushed components**

Create minimal placeholder files so the build succeeds:

`src/ProviderDetail.tsx`:

```typescript
import { List } from "@raycast/api";
import { Provider } from "./types";

export default function ProviderDetail(_props: {
  provider: Provider;
  onUpdate: (provider: Provider) => void;
  onDelete: () => void;
}) {
  return <List><List.Item title="Placeholder" /></List>;
}
```

`src/ProviderForm.tsx`:

```typescript
import { Form } from "@raycast/api";
import { Provider } from "./types";

export default function ProviderForm(_props: {
  provider?: Provider;
  existingIds?: string[];
  onSave: (provider: Provider) => void;
}) {
  return <Form />;
}
```

`src/ModelForm.tsx`:

```typescript
import { Form } from "@raycast/api";
import { Model } from "./types";

export default function ModelForm(_props: {
  model?: Model;
  existingIds?: string[];
  apiKeyNames?: string[];
  onSave: (model: Model) => void;
}) {
  return <Form />;
}
```

`src/RemoteModelList.tsx`:

```typescript
import { List } from "@raycast/api";
import { Provider } from "./types";

export default function RemoteModelList(_props: {
  provider: Provider;
  onAdd: (models: { id: string; name: string }[]) => void;
}) {
  return <List><List.Item title="Placeholder" /></List>;
}
```

- [x] **Step 3: Verify build and test in Raycast**

Run: `npm run dev`
Expected: Extension appears in Raycast. Opening "Manage AI Providers" shows the provider list loaded from `providers.yaml`.

- [x] **Step 4: Commit**

```bash
git add src/manage-providers.tsx src/ProviderDetail.tsx src/ProviderForm.tsx src/ModelForm.tsx src/RemoteModelList.tsx
git commit -m "feat: implement provider list main view with navigation"
```

---

### Task 6: Provider Form (Add/Edit)

**Files:**

- Modify: `src/ProviderForm.tsx`

- [x] **Step 1: Implement the Provider Form**

Replace `src/ProviderForm.tsx`:

```typescript
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { Provider, AdditionalParameters } from "./types";

interface ProviderFormProps {
  provider?: Provider;
  existingIds?: string[];
  onSave: (provider: Provider) => void;
}

export default function ProviderForm({ provider, existingIds = [], onSave }: ProviderFormProps) {
  const { pop } = useNavigation();
  const isEditing = !!provider;

  const [id, setId] = useState(provider?.id || "");
  const [name, setName] = useState(provider?.name || "");
  const [baseUrl, setBaseUrl] = useState(provider?.base_url || "");

  const initialKeys = provider?.api_keys
    ? Object.entries(provider.api_keys).map(([k, v], i) => ({ idx: i, keyName: k, keyValue: v }))
    : [{ idx: 0, keyName: "", keyValue: "" }];
  const [apiKeys, setApiKeys] = useState(initialKeys);
  const [nextIdx, setNextIdx] = useState(initialKeys.length);

  const [returnImages, setReturnImages] = useState(provider?.additional_parameters?.return_images ?? false);
  const [searchContextSize, setSearchContextSize] = useState<string>(
    provider?.additional_parameters?.web_search_options?.search_context_size || "medium",
  );

  const [idError, setIdError] = useState<string | undefined>();
  const [nameError, setNameError] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();

  function validateId(value: string): string | undefined {
    if (!value.trim()) return "ID is required";
    if (!/^[a-zA-Z0-9-]+$/.test(value)) return "Only alphanumeric and hyphens allowed";
    if (!isEditing && existingIds.includes(value)) return "ID already exists";
    return undefined;
  }

  function validateUrl(value: string): string | undefined {
    if (!value.trim()) return "Base URL is required";
    try {
      new URL(value);
      return undefined;
    } catch {
      return "Must be a valid URL";
    }
  }

  function addApiKeyRow() {
    setApiKeys([...apiKeys, { idx: nextIdx, keyName: "", keyValue: "" }]);
    setNextIdx(nextIdx + 1);
  }

  function removeApiKeyRow(idx: number) {
    setApiKeys(apiKeys.filter((e) => e.idx !== idx));
  }

  function handleSubmit() {
    const idErr = isEditing ? undefined : validateId(id);
    const nameErr = name.trim() ? undefined : "Name is required";
    const urlErr = validateUrl(baseUrl);

    setIdError(idErr);
    setNameError(nameErr);
    setUrlError(urlErr);

    if (idErr || nameErr || urlErr) return;

    const apiKeysRecord: Record<string, string> = {};
    for (const entry of apiKeys) {
      if (entry.keyName.trim() && entry.keyValue.trim()) {
        apiKeysRecord[entry.keyName.trim()] = entry.keyValue.trim();
      }
    }

    const additionalParams: AdditionalParameters = {};
    if (returnImages) additionalParams.return_images = true;
    if (searchContextSize !== "medium" || provider?.additional_parameters?.web_search_options) {
      additionalParams.web_search_options = {
        search_context_size: searchContextSize as "low" | "medium" | "high",
      };
    }

    const result: Provider = {
      id: isEditing ? provider!.id : id.trim(),
      name: name.trim(),
      base_url: baseUrl.trim(),
      models: provider?.models || [],
    };

    if (Object.keys(apiKeysRecord).length > 0) {
      result.api_keys = apiKeysRecord;
    }
    if (Object.keys(additionalParams).length > 0) {
      result.additional_parameters = additionalParams;
    }

    onSave(result);
    showToast({ style: Toast.Style.Success, title: isEditing ? "Provider Updated" : "Provider Added" });
    pop();
  }

  return (
    <Form
      navigationTitle={isEditing ? `Edit ${provider!.name}` : "Add Provider"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditing ? "Save Changes" : "Add Provider"} onSubmit={handleSubmit} />
          <Action title="Add API Key" icon={Icon.Plus} shortcut={{ modifiers: ["cmd"], key: "k" }} onAction={addApiKeyRow} />
          {apiKeys.length > 1 && (
            <Action
              title="Remove Last API Key"
              icon={Icon.Minus}
              shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
              onAction={() => removeApiKeyRow(apiKeys[apiKeys.length - 1].idx)}
            />
          )}
        </ActionPanel>
      }
    >
      {!isEditing && (
        <Form.TextField
          id="id"
          title="ID"
          placeholder="e.g. perplexity"
          value={id}
          onChange={(v) => {
            setId(v);
            setIdError(undefined);
          }}
          error={idError}
          onBlur={() => setIdError(validateId(id))}
        />
      )}
      <Form.TextField
        id="name"
        title="Name"
        placeholder="e.g. Perplexity"
        value={name}
        onChange={(v) => {
          setName(v);
          setNameError(undefined);
        }}
        error={nameError}
      />
      <Form.TextField
        id="base_url"
        title="Base URL"
        placeholder="e.g. https://api.perplexity.ai"
        value={baseUrl}
        onChange={(v) => {
          setBaseUrl(v);
          setUrlError(undefined);
        }}
        error={urlError}
      />

      <Form.Separator />
      <Form.Description title="API Keys" text="Each key has a name (e.g. openai) and a value. Use Add/Remove Key actions in the action panel." />

      {apiKeys.map((entry) => (
        <>
          <Form.TextField
            key={`keyname-${entry.idx}`}
            id={`keyname-${entry.idx}`}
            title={`Key ${entry.idx + 1} Name`}
            placeholder="e.g. openai"
            value={entry.keyName}
            onChange={(v) => {
              setApiKeys(apiKeys.map((e) => (e.idx === entry.idx ? { ...e, keyName: v } : e)));
            }}
          />
          <Form.PasswordField
            key={`keyval-${entry.idx}`}
            id={`keyval-${entry.idx}`}
            title={`Key ${entry.idx + 1} Value`}
            placeholder="e.g. sk-xxx"
            value={entry.keyValue}
            onChange={(v) => {
              setApiKeys(apiKeys.map((e) => (e.idx === entry.idx ? { ...e, keyValue: v } : e)));
            }}
          />
        </>
      ))}

      <Form.Separator />
      <Form.Description title="Additional Parameters" text="" />
      <Form.Checkbox id="return_images" label="Return Images" value={returnImages} onChange={setReturnImages} />
      <Form.Dropdown
        id="search_context_size"
        title="Search Context Size"
        value={searchContextSize}
        onChange={setSearchContextSize}
      >
        <Form.Dropdown.Item value="low" title="Low" />
        <Form.Dropdown.Item value="medium" title="Medium" />
        <Form.Dropdown.Item value="high" title="High" />
      </Form.Dropdown>
    </Form>
  );
}
```

- [x] **Step 2: Verify build and test**

Run: `npm run dev`
Expected: "Add Provider" action opens the form. All fields render correctly. Submitting creates a new provider entry.

- [x] **Step 3: Commit**

```bash
git add src/ProviderForm.tsx
git commit -m "feat: implement provider add/edit form"
```

---

### Task 7: Provider Detail (Model List)

**Files:**

- Modify: `src/ProviderDetail.tsx`

- [x] **Step 1: Implement Provider Detail with model list**

Replace `src/ProviderDetail.tsx`:

```typescript
import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback } from "react";
import { Model, Provider } from "./types";
import { maskApiKey } from "./mask";
import { testConnection } from "./api";
import ProviderForm from "./ProviderForm";
import ModelForm from "./ModelForm";
import RemoteModelList from "./RemoteModelList";

interface ProviderDetailProps {
  provider: Provider;
  onUpdate: (provider: Provider) => void;
  onDelete: () => void;
}

export default function ProviderDetail({ provider, onUpdate, onDelete }: ProviderDetailProps) {
  const apiKeyNames = provider.api_keys ? Object.keys(provider.api_keys) : [];

  const addModel = useCallback(
    (model: Model) => {
      onUpdate({ ...provider, models: [...provider.models, model] });
    },
    [provider, onUpdate],
  );

  const updateModel = useCallback(
    (updated: Model, originalId: string) => {
      onUpdate({
        ...provider,
        models: provider.models.map((m) => (m.id === originalId ? updated : m)),
      });
    },
    [provider, onUpdate],
  );

  const deleteModel = useCallback(
    async (modelId: string) => {
      if (
        await confirmAlert({
          title: "Delete Model?",
          message: `Delete model "${modelId}"?`,
          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
        })
      ) {
        onUpdate({
          ...provider,
          models: provider.models.filter((m) => m.id !== modelId),
        });
      }
    },
    [provider, onUpdate],
  );

  const handleTestConnection = useCallback(async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Testing connection..." });
    const result = await testConnection(provider);
    toast.style = result.success ? Toast.Style.Success : Toast.Style.Failure;
    toast.title = result.message;
  }, [provider]);

  const batchAddModels = useCallback(
    (models: { id: string; name: string }[]) => {
      const newModels: Model[] = models.map((m) => ({
        id: m.id,
        name: m.name,
        context: 128000,
        abilities: {
          temperature: { supported: true },
          vision: { supported: false },
          system_message: { supported: true },
          tools: { supported: false },
          reasoning_effort: { supported: false },
        },
      }));
      onUpdate({ ...provider, models: [...provider.models, ...newModels] });
    },
    [provider, onUpdate],
  );

  function abilitySummary(model: Model): string {
    const icons: string[] = [];
    if (model.abilities?.vision?.supported) icons.push("V");
    if (model.abilities?.tools?.supported) icons.push("T");
    if (model.abilities?.reasoning_effort?.supported) icons.push("R");
    return icons.join(" ");
  }

  const maskedKeys = provider.api_keys
    ? Object.entries(provider.api_keys)
        .map(([k, v]) => `${k}: ${maskApiKey(v)}`)
        .join(", ")
    : "None";

  return (
    <List navigationTitle={provider.name} searchBarPlaceholder="Search models...">
      <List.Section title={`${provider.name} — ${provider.base_url}`} subtitle={`API Keys: ${maskedKeys}`}>
        {provider.models.map((model) => (
          <List.Item
            key={model.id}
            icon={Icon.Box}
            title={model.name}
            subtitle={model.id}
            accessories={[
              { text: `ctx: ${model.context}` },
              { tag: { value: abilitySummary(model) || "—", color: Color.Blue } },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Model"
                  icon={Icon.Pencil}
                  target={
                    <ModelForm
                      model={model}
                      existingIds={provider.models.filter((m) => m.id !== model.id).map((m) => m.id)}
                      apiKeyNames={apiKeyNames}
                      onSave={(updated) => updateModel(updated, model.id)}
                    />
                  }
                />
                <Action.Push
                  title="Add Model"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={
                    <ModelForm
                      existingIds={provider.models.map((m) => m.id)}
                      apiKeyNames={apiKeyNames}
                      onSave={addModel}
                    />
                  }
                />
                <Action
                  title="Duplicate Model"
                  icon={Icon.CopyClipboard}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  onAction={() => duplicateModel(model)}
                />
                <ActionPanel.Section title="Provider">
                  <Action.Push
                    title="Edit Provider"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                    target={<ProviderForm provider={provider} onSave={onUpdate} />}
                  />
                  <Action
                    title="Test Connection"
                    icon={Icon.Signal1}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                    onAction={handleTestConnection}
                  />
                  <Action.Push
                    title="Query Remote Models"
                    icon={Icon.Download}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    target={<RemoteModelList provider={provider} onAdd={batchAddModels} />}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Delete Model"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => deleteModel(model.id)}
                  />
                  <Action
                    title="Delete Provider"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: "Delete Provider?",
                          message: `Delete provider "${provider.name}" and all its models?`,
                          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                        })
                      ) {
                        onDelete();
                      }
                    }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {provider.models.length === 0 && (
        <List.EmptyView
          title="No Models"
          description="Add a model or query remote models"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Model"
                icon={Icon.Plus}
                target={<ModelForm existingIds={[]} apiKeyNames={apiKeyNames} onSave={addModel} />}
              />
              <Action.Push
                title="Query Remote Models"
                icon={Icon.Download}
                target={<RemoteModelList provider={provider} onAdd={batchAddModels} />}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
```

- [x] **Step 2: Verify build and test**

Run: `npm run dev`
Expected: Selecting a provider shows its model list. Provider info and masked API keys visible in section header.

- [x] **Step 3: Commit**

```bash
git add src/ProviderDetail.tsx
git commit -m "feat: implement provider detail view with model list"
```

---

### Task 8: Model Form (Add/Edit)

**Files:**

- Modify: `src/ModelForm.tsx`

- [x] **Step 1: Implement Model Form**

Replace `src/ModelForm.tsx`:

```typescript
import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { Model, Abilities } from "./types";
import { ABILITY_TEMPLATES, DEFAULT_CONTEXT } from "./constants";

interface ModelFormProps {
  model?: Model;
  existingIds?: string[];
  apiKeyNames?: string[];
  onSave: (model: Model) => void;
}

function detectTemplate(abilities?: Abilities): string {
  if (!abilities) return "basic";
  for (const [key, tmpl] of Object.entries(ABILITY_TEMPLATES)) {
    const match = Object.keys(tmpl.abilities).every((k) => {
      const ak = k as keyof Abilities;
      return (abilities[ak]?.supported ?? false) === (tmpl.abilities[ak]?.supported ?? false);
    });
    if (match) return key;
  }
  return "custom";
}

export default function ModelForm({ model, existingIds = [], apiKeyNames = [], onSave }: ModelFormProps) {
  const { pop } = useNavigation();
  const isEditing = !!model;

  const [id, setId] = useState(model?.id || "");
  const [name, setName] = useState(model?.name || "");
  const [modelProvider, setModelProvider] = useState(model?.provider || "");
  const [description, setDescription] = useState(model?.description || "");
  const [context, setContext] = useState(String(model?.context || DEFAULT_CONTEXT));

  const [template, setTemplate] = useState(detectTemplate(model?.abilities));
  const [temperature, setTemperature] = useState(model?.abilities?.temperature?.supported ?? true);
  const [vision, setVision] = useState(model?.abilities?.vision?.supported ?? false);
  const [systemMessage, setSystemMessage] = useState(model?.abilities?.system_message?.supported ?? true);
  const [tools, setTools] = useState(model?.abilities?.tools?.supported ?? false);
  const [reasoningEffort, setReasoningEffort] = useState(model?.abilities?.reasoning_effort?.supported ?? false);

  const [idError, setIdError] = useState<string | undefined>();
  const [nameError, setNameError] = useState<string | undefined>();
  const [contextError, setContextError] = useState<string | undefined>();

  function applyTemplate(key: string) {
    setTemplate(key);
    if (key === "custom") return;
    const tmpl = ABILITY_TEMPLATES[key];
    if (!tmpl) return;
    setTemperature(tmpl.abilities.temperature?.supported ?? false);
    setVision(tmpl.abilities.vision?.supported ?? false);
    setSystemMessage(tmpl.abilities.system_message?.supported ?? false);
    setTools(tmpl.abilities.tools?.supported ?? false);
    setReasoningEffort(tmpl.abilities.reasoning_effort?.supported ?? false);
  }

  function handleSubmit() {
    const idErr = id.trim() ? (!isEditing && existingIds.includes(id.trim()) ? "ID already exists" : undefined) : "ID is required";
    const nameErr = name.trim() ? undefined : "Name is required";
    const ctxNum = parseInt(context);
    const ctxErr = isNaN(ctxNum) || ctxNum <= 0 ? "Must be a positive integer" : undefined;

    setIdError(idErr);
    setNameError(nameErr);
    setContextError(ctxErr);

    if (idErr || nameErr || ctxErr) return;

    const result: Model = {
      id: id.trim(),
      name: name.trim(),
      context: parseInt(context),
      abilities: {
        temperature: { supported: temperature },
        vision: { supported: vision },
        system_message: { supported: systemMessage },
        tools: { supported: tools },
        reasoning_effort: { supported: reasoningEffort },
      },
    };

    if (modelProvider.trim()) result.provider = modelProvider.trim();
    if (description.trim()) result.description = description.trim();

    onSave(result);
    showToast({ style: Toast.Style.Success, title: isEditing ? "Model Updated" : "Model Added" });
    pop();
  }

  return (
    <Form
      navigationTitle={isEditing ? `Edit ${model!.name}` : "Add Model"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditing ? "Save Changes" : "Add Model"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="id"
        title="Model ID"
        placeholder="e.g. gpt-4o-mini"
        value={id}
        onChange={(v) => { setId(v); setIdError(undefined); }}
        error={idError}
      />
      <Form.TextField
        id="name"
        title="Display Name"
        placeholder="e.g. GPT-4o Mini"
        value={name}
        onChange={(v) => { setName(v); setNameError(undefined); }}
        error={nameError}
      />
      {apiKeyNames.length > 0 ? (
        <Form.Dropdown id="provider" title="API Key Mapping" value={modelProvider} onChange={setModelProvider}>
          <Form.Dropdown.Item value="" title="(None)" />
          {apiKeyNames.map((k) => (
            <Form.Dropdown.Item key={k} value={k} title={k} />
          ))}
        </Form.Dropdown>
      ) : (
        <Form.TextField
          id="provider"
          title="Provider"
          placeholder="(optional) maps to api_keys key"
          value={modelProvider}
          onChange={setModelProvider}
        />
      )}
      <Form.TextField
        id="description"
        title="Description"
        placeholder="(optional)"
        value={description}
        onChange={setDescription}
      />
      <Form.TextField
        id="context"
        title="Context Window"
        placeholder="e.g. 128000"
        value={context}
        onChange={(v) => { setContext(v); setContextError(undefined); }}
        error={contextError}
      />

      <Form.Separator />
      <Form.Dropdown id="template" title="Ability Template" value={template} onChange={applyTemplate}>
        {Object.entries(ABILITY_TEMPLATES).map(([key, tmpl]) => (
          <Form.Dropdown.Item key={key} value={key} title={tmpl.label} />
        ))}
        <Form.Dropdown.Item value="custom" title="Custom" />
      </Form.Dropdown>
      <Form.Checkbox id="temperature" label="Temperature" value={temperature} onChange={(v) => { setTemperature(v); setTemplate("custom"); }} />
      <Form.Checkbox id="vision" label="Vision" value={vision} onChange={(v) => { setVision(v); setTemplate("custom"); }} />
      <Form.Checkbox id="system_message" label="System Message" value={systemMessage} onChange={(v) => { setSystemMessage(v); setTemplate("custom"); }} />
      <Form.Checkbox id="tools" label="Tools" value={tools} onChange={(v) => { setTools(v); setTemplate("custom"); }} />
      <Form.Checkbox id="reasoning_effort" label="Reasoning Effort" value={reasoningEffort} onChange={(v) => { setReasoningEffort(v); setTemplate("custom"); }} />
    </Form>
  );
}
```

- [x] **Step 2: Verify build and test**

Run: `npm run dev`
Expected: Add/Edit Model form works. Template dropdown switches all checkboxes. Custom individual toggles switch template to "Custom".

- [x] **Step 3: Commit**

```bash
git add src/ModelForm.tsx
git commit -m "feat: implement model add/edit form with ability templates"
```

---

### Task 9: Remote Model List (Query + Batch Add)

**Files:**

- Modify: `src/RemoteModelList.tsx`

- [x] **Step 1: Implement Remote Model List**

Replace `src/RemoteModelList.tsx`:

```typescript
import { Action, ActionPanel, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { Provider, RemoteModel } from "./types";
import { queryRemoteModels } from "./api";

interface RemoteModelListProps {
  provider: Provider;
  onAdd: (models: { id: string; name: string }[]) => void;
}

export default function RemoteModelList({ provider, onAdd }: RemoteModelListProps) {
  const { pop } = useNavigation();
  const [models, setModels] = useState<RemoteModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const existingIds = new Set(provider.models.map((m) => m.id));

  useEffect(() => {
    (async () => {
      try {
        const result = await queryRemoteModels(provider);
        setModels(result.data || []);
      } catch (e) {
        showToast({ style: Toast.Style.Failure, title: "Failed to query models", message: String(e) });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  function toggleSelect(modelId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) {
        next.delete(modelId);
      } else {
        next.add(modelId);
      }
      return next;
    });
  }

  function handleAdd() {
    const toAdd = models
      .filter((m) => selected.has(m.id))
      .map((m) => ({ id: m.id, name: m.id }));

    if (toAdd.length === 0) {
      showToast({ style: Toast.Style.Failure, title: "No models selected" });
      return;
    }

    onAdd(toAdd);
    showToast({ style: Toast.Style.Success, title: `Added ${toAdd.length} model(s)` });
    pop();
  }

  return (
    <List
      navigationTitle={`Remote Models — ${provider.name}`}
      isLoading={isLoading}
      searchBarPlaceholder="Search remote models..."
    >
      {models.map((model) => {
        const alreadyAdded = existingIds.has(model.id);
        const isSelected = selected.has(model.id);

        return (
          <List.Item
            key={model.id}
            icon={alreadyAdded ? Icon.CheckCircle : isSelected ? Icon.CircleFilled : Icon.Circle}
            title={model.id}
            subtitle={model.owned_by || ""}
            accessories={[
              alreadyAdded
                ? { tag: { value: "Added", color: "#999" } }
                : isSelected
                  ? { tag: { value: "Selected", color: "#007AFF" } }
                  : {},
            ]}
            actions={
              <ActionPanel>
                {!alreadyAdded && (
                  <Action
                    title={isSelected ? "Deselect" : "Select"}
                    icon={isSelected ? Icon.Circle : Icon.CircleFilled}
                    onAction={() => toggleSelect(model.id)}
                  />
                )}
                {selected.size > 0 && (
                  <Action
                    title={`Add ${selected.size} Selected Model(s)`}
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    onAction={handleAdd}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
```

- [x] **Step 2: Verify build and test**

Run: `npm run dev`
Expected: "Query Remote Models" action fetches and displays remote models. Models can be selected/deselected. Already-added models show "Added" tag. Batch add works correctly.

- [x] **Step 3: Commit**

```bash
git add src/RemoteModelList.tsx
git commit -m "feat: implement remote model query and batch add"
```

---

### Task 10: Integration Testing and Polish

**Files:**

- Possibly modify: any files that need fixes found during testing

- [ ] **Step 1: Full workflow test**

Run: `npm run dev`

Test the following workflows end-to-end:

1. Open extension → see Provider list
2. Add a new Provider with API keys → verify it appears in list
3. Select Provider → see Models list with masked API keys in header
4. Add a Model with "Full" template → verify abilities set correctly
5. Edit a Model → change template to "Basic" → verify checkboxes update
6. Test Connection → verify Toast shows success or failure
7. Query Remote Models → select 2 models → batch add → verify they appear
8. Duplicate Provider config → verify the provider form opens with a unique copied ID, then save and confirm the copy is created
9. Duplicate Model config → verify the model form opens with a unique copied ID, then save and confirm the copy is created
10. Delete a Model → confirm dialog → verify removal
11. Delete a Provider → confirm dialog → verify removal
12. Verify `.providers.yaml.bak` backup file exists after any save

- [x] **Step 2: Run lint**

Run: `npm run lint`
Expected: No lint errors. Fix any that appear.

- [x] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors or warnings.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix: polish and integration fixes"
```

---

### Task 11: Store Preparation

**Files:**

- Possibly modify: `package.json`, `README.md`
- Create: `assets/extension-icon.png` (final version)

- [x] **Step 1: Verify package.json has all required store fields**

Ensure these fields are present and correct:

- `$schema`
- `name`, `title`, `description`
- `icon` (pointing to a valid 512x512 PNG in assets/)
- `author` (your Raycast store username)
- `categories`
- `license`
- `commands` with proper `name`, `title`, `description`, `mode`

- [x] **Step 2: Final lint and build**

Run: `npm run lint && npm run build`
Expected: Both pass cleanly.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: prepare for Raycast Store submission"
```

---

### Task 12: Hardening Batch - Safe Writes, Provider Validation, Remote Sync

**Files:**

- Modify: `src/yaml.ts`
- Modify: `src/manage-providers.tsx`
- Modify: `src/ProviderForm.tsx`
- Modify: `src/RemoteModelList.tsx`
- Possibly modify: `src/types.ts`, `src/ProviderDetail.tsx`, `README.md`

- [x] **Step 1: Implement safer providers.yaml writes**

Requirements:

- Write to a temporary file in the same directory, then atomically rename into place.
- Preserve restrictive `providers.yaml` permissions during atomic replacement; new files default to `0600`.
- Keep the existing `.providers.yaml.bak` backup behavior.
- Track the last loaded `providers.yaml` mtime and refuse to save if the file was modified externally after load.
- Provide an explicit force-save path only where the UI can clearly communicate the overwrite.
- Add an action to restore from `.providers.yaml.bak`.

- [x] **Step 2: Strengthen Provider form API key validation**

Requirements:

- Reject duplicate API key names in the form.
- Reject half-filled API key rows, where either the key name or key value is missing.
- Allow removing a specific API key row instead of only the last row.
- Keep full key values visible only in the edit form password field; keep list/detail displays masked.
- Preserve existing add/edit/duplicate provider behavior.

- [x] **Step 3: Improve remote model selection and sync**

Requirements:

- Add Select All Unadded and Deselect All actions.
- Show useful counts for remote, existing, selected, and missing-local models.
- Add a Sync-oriented view/section that separates:
  - Remote models not yet configured.
  - Remote models already configured.
  - Local configured models missing from the remote `/models` response.
- Keep the import form with context window, ability template, and API key mapping.

- [x] **Step 4: Verify**

Run:

- `nvm use`
- `npm run lint`
- `npm run build`
- `npm audit --omit=dev && npm audit`

Expected: all checks pass.

- [x] **Step 5: Resolve review blockers**

Fixes:

- Preserve the existing `providers.yaml` mode when writing atomic temp files and when creating `.providers.yaml.bak`, so a secrets file such as `0600` is not weakened by the process umask.
- Make Provider and Model form saves await the persistence result before showing success or popping the form.
- Make Provider Detail and Remote Model import update local UI state only after the parent save path returns success, so external-change conflict cancellation leaves the view unchanged.

Verification:

- `npm run lint`
- `npm run build`

---

### Future Optimization Backlog

#### Reliability and Data Safety

- [ ] Add richer validation for malformed `providers.yaml`, including provider shape, model shape, duplicate provider IDs, duplicate model IDs, invalid contexts, and model API key mappings that point to missing provider keys.
- [ ] Add a read-only YAML preview before saving high-impact edits.
- [ ] Add conflict-resolution UI when external file changes are detected: reload, force save, or open directory.
- [ ] Add backup history instead of a single `.providers.yaml.bak`, with timestamped backups and pruning.
- [ ] Add import/export actions for selected providers and models.

#### New UI

- [ ] Add a dashboard/audit view showing provider count, model count, disabled count, missing API keys, unreachable providers, and invalid model mappings.
- [ ] Add a Provider Detail layout with clearer health status: unchecked, healthy, failed.
- [ ] Add model ability filters: All, Vision, Tools, Reasoning, Disabled.
- [ ] Replace compact ability letters (`V`, `T`, `R`) with clearer tags such as `Vision`, `Tools`, and `Reasoning`.
- [ ] Add a Model Detail view with full YAML preview, API key mapping, description, context, and abilities.
- [ ] Improve icon management UI with current icon preview, assigned source, and reset state.

#### New Operations

- [ ] Add Test All Providers.
- [ ] Add Enable/Disable All Models under a provider.
- [ ] Add Delete All Disabled Entries with confirmation.
- [ ] Add Sort Providers and Sort Models by name or ID.
- [ ] Add Copy Provider YAML and Copy Model YAML actions.

#### Provider Templates

- [ ] Add Add Provider from Template workflow.
- [ ] Include templates for OpenAI-compatible generic, OpenRouter, Ollama local, SiliconFlow, DeepSeek, Gemini, Anthropic-compatible proxy, and common Chinese model providers.
- [ ] Template should prefill base URL, icon preset, recommended model ability defaults, and optional API key name.

#### API Diagnostics

- [ ] Improve `/models` diagnostics for 401, 403, 404, timeout, invalid JSON, and non-OpenAI-compatible response shapes.
- [ ] Detect common base URL mistakes such as entering `/models` directly or omitting a required `/v1`.
- [ ] Show provider-specific troubleshooting hints where reliable.
- [ ] Add optional response metadata in remote model list, such as `owned_by` and `created`, when present.
