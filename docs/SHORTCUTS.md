# Raycast Shortcuts Guide

## Reserved Shortcuts

Raycast reserves certain keyboard shortcuts for its own functionality. When developing extensions, you should avoid using these shortcuts to prevent conflicts. The following shortcuts are reserved by Raycast:

### Navigation

| Shortcut | Description |
|----------|-------------|
| `⌘ .` | Toggle command palette |
| `⌘ ,` | Open preferences |
| `⌘ O` | Open file |
| `⌘ N` | New window |
| `⌘ W` | Close window |
| `⌘ Q` | Quit Raycast |
| `⌘ H` | Hide Raycast |
| `⌘ M` | Minimize window |
| `⌘ F` | Find |
| `⌘ G` | Find next |
| `⌘ ⇧ G` | Find previous |

### Editing

| Shortcut | Description |
|----------|-------------|
| `⌘ A` | Select all |
| `⌘ C` | Copy |
| `⌘ V` | Paste |
| `⌘ X` | Cut |
| `⌘ Z` | Undo |
| `⌘ ⇧ Z` | Redo |

### View

| Shortcut | Description |
|----------|-------------|
| `⌘ +` | Zoom in |
| `⌘ -` | Zoom out |
| `⌘ 0` | Reset zoom |

### Extensions

| Shortcut | Description |
|----------|-------------|
| `⌘ P` | Open command palette |
| `⌘ K` | Search |
| `⌘ J` | Toggle between views |
| `⌘ L` | Clear search |
| `⌘ I` | Toggle information |
| `⌘ D` | Toggle debug |
| `⌘ R` | Refresh |
| `⌘ E` | Edit |
| `⌘ S` | Save |

### List Navigation

| Shortcut | Description |
|----------|-------------|
| `⌘ ↑` | Move to top |
| `⌘ ↓` | Move to bottom |
| `⌥ ↑` | Move up 5 items |
| `⌥ ↓` | Move down 5 items |

### Form Navigation

| Shortcut | Description |
|----------|-------------|
| `⌘ ↩` | Submit form |
| `⌘ ⎋` | Cancel |

## Context-Specific Shortcuts

Our Google Cloud extension uses context-specific shortcuts that change based on which view you're currently in. This means the same shortcut can perform different actions in different contexts, making the interface more intuitive.

### Common Shortcuts (Available in All Views)

| Shortcut | Description |
|----------|-------------|
| `⌘ R` | Refresh current view |
| `⌘ ⇧ C` | Cancel current operation |
| `⌘ ⇧ ⌫` | Delete selected item |

### Project View

| Shortcut | Description |
|----------|-------------|
| `⌘ N` | Create new project |
| `⌘ I` | View project details |
| `⌘ S` | Switch project |

### Bucket View

| Shortcut | Description |
|----------|-------------|
| `⌘ N` | Create new bucket |
| `⌘ O` | View objects in bucket |
| `⌘ I` | View IAM permissions |
| `⌘ L` | View lifecycle rules |

### Object View

| Shortcut | Description |
|----------|-------------|
| `⌘ N` | Create/upload new object |
| `⌘ D` | Download object |
| `⌘ I` | View object details |
| `⌘ U` | Copy object URL |

### IAM View

| Shortcut | Description |
|----------|-------------|
| `⌘ N` | Add new IAM member |
| `⌘ V` | Switch IAM view (by principal/by role) |
| `⌘ F` | Filter IAM members |

### Compute View

| Shortcut | Description |
|----------|-------------|
| `⌘ N` | Create new instance |
| `⌘ S` | Start instance |
| `⌘ P` | Stop instance |
| `⌘ C` | Connect to instance |

## Best Practices

1. **Always check for reserved shortcuts**: Before assigning a shortcut, check if it's reserved by Raycast.
2. **Use the `raycastShortcuts.ts` utility**: Import and use the `isReservedShortcut` function to check if a shortcut is reserved.
3. **Use context-specific shortcuts**: Use the `getContextualShortcut` function to get the appropriate shortcut for the current context.
4. **Be consistent**: Use the same shortcut for similar actions across different contexts (e.g., `⌘ N` for creating new items).
5. **Document shortcuts**: Keep this document updated with any new shortcuts added to the extension.

## Example Usage

```typescript
import { getContextualShortcut, isReservedShortcut } from "../utils/raycastShortcuts";

// Get a context-specific shortcut
const createShortcut = getContextualShortcut("BUCKET", "CREATE");

// Use the shortcut in an Action
<Action
  title="Create Bucket"
  icon={Icon.Plus}
  shortcut={createShortcut}
  onAction={createBucket}
/>
```

## Troubleshooting

If you see console warnings like:

```
The `shortcut` prop provided to the Action is reserved by Raycast and has been removed. Please use another shortcut instead.
```

This means you're using a reserved shortcut. Check if the shortcut is in the `RESERVED_SHORTCUTS` list and use a different one. 