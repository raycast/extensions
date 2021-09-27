# System

## API Reference

### showInFinder

Shows a file or directory in the Finder.

#### Signature

```typescript
async function showInFinder(path: PathLike): Promise<void>
```

#### Example

```typescript
import { showInFinder } from "@raycast/api"
import { homedir } from "os"
showInFinder(homedir(), "Downloads")
```

#### Parameters

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| path | `PathLike` | Yes | The path to show in the Finder. |

#### Return

A promise that resolves when item is revealed in the Finder.

### trash

Moves a file or director to the Trash.

#### Signature

```typescript
async function trash(path: PathLike | PathLike[]): Promise<void>
```

#### Parameters

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| path | `PathLike` or `PathLike[]` | Yes |  |

#### Return

A promise that resolves when all files are moved to the trash.

