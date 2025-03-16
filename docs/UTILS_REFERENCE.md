# Utils Reference

This document provides a reference for the utility functions available in the `src/utils/` directory. Always check this reference before implementing new functionality to avoid duplicating existing code.

## FileUtils.ts

File system operations and helpers.

### Functions

| Function | Description | Parameters | Return Value |
|----------|-------------|------------|--------------|
| `ensureDirectoryExists` | Creates a directory if it doesn't exist | `dirPath: string` | `Promise<void>` |
| `formatFileSize` | Formats bytes to human-readable size | `bytes: number` | `string` (e.g., "1.5 MB") |
| `guessContentType` | Determines MIME type from filename | `filename: string` | `string` (MIME type) |
| `validateFile` | Checks if a file exists and is accessible | `filePath: string` | `Promise<boolean>` |
| `getFileInfo` | Gets detailed information about a file | `filePath: string` | `Promise<FileInfo \| null>` |
| `formatTimestamp` | Formats a timestamp string | `timestamp: string` | `string` (formatted date) |
| `formatGeneration` | Formats a generation string | `generation: string` | `string` |
| `isCurrentVersion` | Checks if an object is the current version | `object: any` | `boolean` |
| `calculateAge` | Calculates age from a timestamp | `timestamp: string` | `string` (e.g., "2 days ago") |

## FilePicker.tsx

File selection component.

### Props

| Prop | Description | Type | Required |
|------|-------------|------|----------|
| `onFilePick` | Callback when file is selected | `(path: string) => void` | Yes |
| `allowedExtensions` | File extensions to allow | `string[]` | No |
| `title` | Dialog title | `string` | No |
| `message` | Dialog message | `string` | No |

### Usage

```typescript
<FilePicker
  onFilePick={(path) => handleFilePicked(path)}
  allowedExtensions={["json", "yaml"]}
  title="Select Configuration File"
/>
```

## FileDownloader.tsx

File download component.

### Props

| Prop | Description | Type | Required |
|------|-------------|------|----------|
| `url` | URL to download from | `string` | Yes |
| `filename` | Name to save file as | `string` | Yes |
| `onComplete` | Callback when download completes | `(path: string) => void` | No |
| `onError` | Callback when download fails | `(error: Error) => void` | No |

### Usage

```typescript
<FileDownloader
  url="https://example.com/file.json"
  filename="config.json"
  onComplete={(path) => console.log(`Downloaded to ${path}`)}
  onError={(error) => console.error(error)}
/>
```

## iamRoles.ts

IAM role definitions and helpers.

### Constants

| Constant | Description | Type |
|----------|-------------|------|
| `predefinedRoles` | Map of predefined IAM roles | `Record<string, { title: string, description: string, service: string }>` |

### Functions

| Function | Description | Parameters | Return Value |
|----------|-------------|------------|--------------|
| `getRoleInfo` | Gets information about a role | `role: string` | `{ title: string, description: string }` |
| `formatRoleName` | Formats a role name for display | `role: string` | `string` |

## raycastShortcuts.ts

Raycast-specific utilities.

### Functions

| Function | Description | Parameters | Return Value |
|----------|-------------|------------|--------------|
| `registerShortcut` | Registers a keyboard shortcut | `key: string, action: () => void` | `void` |
| `showQuickPick` | Shows a quick pick menu | `items: QuickPickItem[], options: QuickPickOptions` | `Promise<QuickPickItem \| undefined>` |
| `copyToClipboard` | Copies text to clipboard | `text: string` | `Promise<void>` |

## CodeEditor.tsx

Code editing component.

### Props

| Prop | Description | Type | Required |
|------|-------------|------|----------|
| `code` | Initial code content | `string` | Yes |
| `language` | Code language | `string` | No |
| `onChange` | Callback when code changes | `(code: string) => void` | No |
| `readOnly` | Whether editor is read-only | `boolean` | No |

### Usage

```typescript
<CodeEditor
  code={jsonContent}
  language="json"
  onChange={(newCode) => setJsonContent(newCode)}
/>
```

## NativeFilePicker.ts

Native file system integration.

### Functions

| Function | Description | Parameters | Return Value |
|----------|-------------|------------|--------------|
| `showOpenDialog` | Shows file open dialog | `options: OpenDialogOptions` | `Promise<string[]>` |
| `showSaveDialog` | Shows file save dialog | `options: SaveDialogOptions` | `Promise<string \| undefined>` |
| `readTextFile` | Reads text from a file | `path: string` | `Promise<string>` |
| `writeTextFile` | Writes text to a file | `path: string, content: string` | `Promise<void>` |

## gcpServices.ts

Google Cloud Platform services and APIs information.

### Interfaces and Enums

| Name | Description | Type |
|------|-------------|------|
| `GCPServiceInfo` | Information about a GCP service | Interface with name, displayName, description, category, etc. |
| `GCPServiceCategory` | Categories of GCP services | Enum with values like COMPUTE, STORAGE, DATABASE, etc. |

### Constants

| Constant | Description | Type |
|----------|-------------|------|
| `predefinedServices` | Map of predefined GCP services | `Record<string, GCPServiceInfo>` |

### Functions

| Function | Description | Parameters | Return Value |
|----------|-------------|------------|--------------|
| `getServiceInfo` | Gets information about a service | `serviceName: string` | `GCPServiceInfo` |
| `formatServiceName` | Formats a service name for display | `serviceName: string` | `string` |
| `getServicesByCategory` | Gets services in a category | `category: GCPServiceCategory` | `GCPServiceInfo[]` |
| `getAllCategories` | Gets all service categories | None | `string[]` |
| `getAllServices` | Gets all services | None | `GCPServiceInfo[]` |

### Usage

```typescript
import { getServiceInfo, GCPServiceCategory, getAllServices } from "../utils/gcpServices";

// Get information about a specific service
const serviceInfo = getServiceInfo("compute.googleapis.com");
console.log(serviceInfo.displayName); // "Compute Engine"

// Get all services in a category
const computeServices = getServicesByCategory(GCPServiceCategory.COMPUTE);

// Get all services
const allServices = getAllServices();
```

## CacheManager.ts

Project and API response caching utility.

### Constants

| Constant | Description | Type |
|----------|-------------|------|
| `CACHE_KEYS` | Cache key constants | `Record<string, string>` |
| `CACHE_TTL` | Cache expiration times | `Record<string, number>` |

### Interfaces

| Interface | Description | Properties |
|-----------|-------------|------------|
| `Project` | Project information | `id: string, name: string, projectNumber: string, createTime: string` |
| `CachedAuth` | Cached authentication | `isAuthenticated: boolean, user: string, timestamp: number` |
| `CachedProject` | Cached project reference | `projectId: string, timestamp: number` |
| `CachedProjectsList` | Cached list of projects | `projects: Project[], timestamp: number` |

### Functions

| Function | Description | Parameters | Return Value |
|----------|-------------|------------|--------------|
| `saveAuthStatus` | Saves authentication status | `isAuthenticated: boolean, user: string` | `void` |
| `getAuthStatus` | Gets cached auth status | None | `CachedAuth \| null` |
| `updateAuthCacheDuration` | Updates auth cache duration | `hours: number` | `void` |
| `clearAuthCache` | Clears auth cache | None | `void` |
| `getCacheLimit` | Gets project cache limit | None | `number` |
| `saveSelectedProject` | Saves selected project and updates recently used list | `projectId: string` | `void` |
| `getSelectedProject` | Gets cached selected project | None | `CachedProject \| null` |
| `getRecentlyUsedProjects` | Gets IDs of recently used projects | None | `string[]` |
| `saveRecentlyUsedProjects` | Saves list of recently used projects | `projectIds: string[]` | `void` |
| `clearProjectCache` | Clears project cache | None | `void` |
| `saveProjectsList` | Saves full list of projects | `projects: Project[]` | `void` |
| `getProjectsList` | Gets cached list of projects | None | `CachedProjectsList \| null` |
| `clearProjectsListCache` | Clears projects list cache | None | `void` |
| `clearAllCaches` | Clears all caches | None | `void` |
| `getProjectDetails` | Gets detailed project information | `projectId: string, gcloudPath: string` | `Promise<Project \| null>` |
| `getRecentlyUsedProjectsWithDetails` | Gets recently used projects with details | `gcloudPath: string` | `Promise<Project[]>` |
| `syncRecentlyUsedProjectsWithCacheLimit` | Ensures recently used list respects cache limit | None | `void` |

### Usage

```typescript
import { CacheManager } from "../utils/CacheManager";

// Get the cache limit
const cacheLimit = CacheManager.getCacheLimit();

// Get cached project
const cachedProject = CacheManager.getSelectedProject();

// Save a project as selected and update recently used list
CacheManager.saveSelectedProject("my-project-id");

// Get list of recently used projects
const recentlyUsed = CacheManager.getRecentlyUsedProjects();

// Get projects with full details
const projectsWithDetails = await CacheManager.getRecentlyUsedProjectsWithDetails(gcloudPath);

// Clear all caches
CacheManager.clearAllCaches();
```

For detailed information on the caching system, see [Caching System](CACHING_SYSTEM.md). 