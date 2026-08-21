# Raycast Hooks & State Management

Raycast provides dedicated hooks in `@raycast/utils` and storage primitives in `@raycast/api` designed for keyboard-driven desktop extensions.

---

## 1. `@raycast/utils` Hooks

### `useFetch<T>`
High-level hook for REST API data fetching with caching, revalidation, and pagination.

```tsx
import { useFetch } from "@raycast/utils";

interface Issue {
  id: string;
  title: string;
  state: "open" | "closed";
}

export function useProjectIssues(projectId: string) {
  return useFetch<{ data: Issue[]; hasMore: boolean }>(
    `https://api.example.com/v1/projects/${projectId}/issues`,
    {
      headers: {
        Authorization: `Bearer ${getApiToken()}`,
        "Content-Type": "application/json"
      },
      keepPreviousData: true,
      initialData: { data: [], hasMore: false },
      onError(error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch issues",
          message: error.message
        });
      }
    }
  );
}
```

### `useCachedState<T>`
Persistent React state that survives across command executions and window closes.

```tsx
import { useCachedState } from "@raycast/utils";

export function useSelectedProject() {
  // Saved to disk and restored automatically on next launch
  const [selectedProject, setSelectedProject] = useCachedState<string>(
    "selected-project-id",
    "default-project"
  );

  return [selectedProject, setSelectedProject] as const;
}
```

### `useCachedPromise<T>`
Wraps an async function with built-in caching, background revalidation, loading states, and error handling.

```tsx
import { useCachedPromise } from "@raycast/utils";

export function useRepositories(org: string) {
  const { data, isLoading, revalidate, mutate } = useCachedPromise(
    async (organization: string) => {
      const response = await fetch(`https://api.github.com/orgs/${organization}/repos`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as Repo[];
    },
    [org],
    {
      keepPreviousData: true,
      onError(error) {
        console.error("Failed to load repositories:", error);
      }
    }
  );

  return { data, isLoading, revalidate, mutate };
}
```

### `usePromise<T>`
Wraps any arbitrary promise with `{ data, isLoading, error, revalidate }` states when persistent disk caching is not required.

```tsx
import { usePromise } from "@raycast/utils";

const { data: diskSpace, isLoading } = usePromise(async () => {
  return await checkAvailableDiskSpace();
});
```

### `useExec`
Executes local CLI binaries or shell commands asynchronously.

```tsx
import { useExec } from "@raycast/utils";

export function useDockerContainers() {
  const { data, isLoading, revalidate } = useExec("docker", ["ps", "--format", "{{json .}}"], {
    parseOutput: (output) => {
      return output.stdout
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
    }
  });

  return { containers: data ?? [], isLoading, revalidate };
}
```

### `useSQL`
Directly queries local SQLite databases (e.g., Apple Notes, Chrome History, local apps).

```tsx
import { useSQL } from "@raycast/utils";

const DB_PATH = "/path/to/local.db";
const { data, isLoading } = useSQL<NoteRecord>(
  DB_PATH,
  "SELECT id, title, updated_at FROM notes ORDER BY updated_at DESC LIMIT 50"
);
```

---

## 2. Storage Primitives (`@raycast/api`)

### `LocalStorage` (Async Key-Value Storage)
Use for saving persistent configuration, recent searches, user preferences, and lightweight domain records.

```tsx
import { LocalStorage } from "@raycast/api";

// Set item
await LocalStorage.setItem("last_sync_timestamp", Date.now());

// Get typed item
const lastSync = await LocalStorage.getItem<number>("last_sync_timestamp");

// Remove item
await LocalStorage.removeItem("last_sync_timestamp");

// Clear all items for this extension
await LocalStorage.clear();
```

### `Cache` (Synchronous Key-Value Storage)
Use for caching fast in-memory or disk data without `await`.

```tsx
import { Cache } from "@raycast/api";

const cache = new Cache();

// Write cache
cache.set("recent_query", JSON.stringify({ query: "bug", ts: Date.now() }));

// Read cache synchronously
const raw = cache.get("recent_query");
if (raw) {
  const cachedQuery = JSON.parse(raw);
}

// Check presence / remove
if (cache.has("recent_query")) {
  cache.remove("recent_query");
}
```

---

## 3. Navigation & Context Primitives

### `useNavigation`
```tsx
import { useNavigation } from "@raycast/api";

export function DetailItem({ item }: { item: Item }) {
  const { push, pop } = useNavigation();

  return (
    <Action
      title="View Subtasks"
      onAction={() => push(<SubtasksView parentId={item.id} />)}
    />
  );
}
```

### `popToRoot` & `closeMainWindow`
```tsx
import { popToRoot, closeMainWindow } from "@raycast/api";

// Reset Raycast navigation back to root search
await popToRoot({ clearSearchBar: true });

// Close Raycast window immediately
await closeMainWindow();
```

---

## 4. `environment` Context

The global `environment` object provides runtime paths and execution metadata:

```tsx
import { environment } from "@raycast/api";

// Path to extension's assets directory (e.g. extension icons, bundled static files)
const iconPath = `${environment.assetsPath}/icon.png`;

// Path to extension's support directory (writable folder for caches, downloads, temp files)
const tempFilePath = `${environment.supportPath}/downloaded_cache.json`;

// Development flag
if (environment.isDevelopment) {
  console.log("Running in development mode");
}

// Command context
const currentCommand = environment.commandName;
const currentMode = environment.commandMode; // "view" | "no-view" | "menu-bar"
```
