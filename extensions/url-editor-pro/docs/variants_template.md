# URL Template Design (URL Editor Pro)

## Design Goals

The URL template system is designed to:

- Allow users to generate URL variants **without entering an edit form**
- Be fully **keyboard-driven**
- Generate multiple URL variants **from the current page URL**
- Display results as a **list** for quick selection
- Support **query removal** and **path shortening**
- Be powerful for advanced users, yet easy to understand

---

## Template Philosophy

- Templates describe **what the URL looks like**
- Expansion rules describe **how many URLs are generated**
- The system favors **string templates** over DSLs
- Complexity lives in the implementation, not in the user's mental model

---

## Template Syntax

### Basic Format

Templates use a Mustache-style syntax:

```
{{variable}}
```

Example:

```
{{protocol}}://{{host}}{{path}}
```

---

## Built-in Variables

### URL Components

| Variable       | Description                    | Example Output                   |
| -------------- | ------------------------------ | -------------------------------- |
| `{{url}}`      | Original full URL              | `https://github.com/raycast?a=1` |
| `{{protocol}}` | `http` / `https`               | `https`                          |
| `{{host}}`     | Hostname                       | `github.com`                     |
| `{{hostname}}` | Alias of `host`                | `github.com`                     |
| `{{port}}`     | Port number (empty if none)    | `8080`                           |
| `{{path}}`     | Full path without query        | `/raycast/extensions`            |
| `{{query}}`    | Query string (with `?` prefix) | `?tab=readme`                    |
| `{{hash}}`     | URL hash (with `#` prefix)     | `#installation`                  |

---

## Path Variables

### Path Segments

```
/raycast/extensions/pull/22745
→ ["raycast", "extensions", "pull", "22745"]
```

### Path Level Selection (Positive Index)

Use `{{path:N}}` to get the first N path segments:

```
{{path:1}}    → /raycast
{{path:2}}    → /raycast/extensions
{{path:3}}    → /raycast/extensions/pull
{{path:4}}    → /raycast/extensions/pull/22745
```

### Path Level Selection (Negative Index - Python-style)

Use `{{path:-N}}` to remove segments from the end:

```
{{path:-1}}   → /raycast/extensions/pull/22745  (full path)
{{path:-2}}   → /raycast/extensions/pull        (remove last 1)
{{path:-3}}   → /raycast/extensions             (remove last 2)
{{path:-4}}   → /raycast                        (remove last 3)
```

---

## Path Expansion (Core Feature)

### `{{path:*}}` — Automatic Hierarchy Expansion

```
{{protocol}}://{{host}}{{path:*}}
```

**Behavior**

- Expands from the first path segment to the full path
- Path depth is detected dynamically
- Generates one URL per level

**Example**

Current URL:

```
https://github.com/raycast/extensions/pull/22745
```

Generated URLs:

```
https://github.com/raycast
https://github.com/raycast/extensions
https://github.com/raycast/extensions/pull
https://github.com/raycast/extensions/pull/22745
```

---

## Query Handling

### Default Behavior

- `{{path}}` **does not include query parameters**
- `{{query}}` includes the `?` prefix only when parameters exist

### Future Extensions (Roadmap)

```
{{path+query}}          // keep query
{{query:remove}}        // remove query
{{query:keep(a,b)}}     // whitelist parameters
```

---

## Template Groups

Templates are organized into **groups** for better management.

### Data Structure

```typescript
interface TemplateGroup {
  id: string;
  name: string;
  description?: string;
  templates: string[];
  enabled?: boolean;
}
```

### Default Template Groups

| Name                    | Description                        | Templates                                                              |
| ----------------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| Shorten URL             | Generate shortened URL variants    | `{{protocol}}://{{host}}`, `{{protocol}}://{{host}}{{path:*}}`         |
| Remove Query Parameters | Generate URLs without query params | `{{protocol}}://{{host}}{{path}}`, `{{protocol}}://{{host}}{{path:*}}` |
| Path Hierarchy          | Show all path levels               | `{{protocol}}://{{host}}{{path:*}}`                                    |

---

## Keyboard Shortcuts

| Action                | Shortcut |
| --------------------- | -------- |
| Generate Variants     | `⌘⇧V`    |
| Manage Templates      | `⌃⇧T`    |
| Copy URL (in results) | `Enter`  |

---

## User Flow

1. Copy or input URL in the main interface
2. Press `⌘⇧V` to generate URL variants
3. Navigate generated list with arrow keys
4. Press `Enter` to copy selected URL
5. (Optional) Press `⌃⇧T` to manage template groups

---

## UI / UX

- Display generated URLs in a Raycast list
- Show group name and template info in subtitle:

```
Path Hierarchy · path hierarchy (4 levels)
Shorten URL · {{protocol}}://{{host}}
```

- Deduplicate URLs across all template groups

---

## Implementation Architecture

### Module Structure

```
src/template/
├── template-context.ts      # Build context from URL
├── template-parser.ts       # Parse {{variable}} syntax
├── template-renderer.ts     # Render templates, handle expansion
├── template-executor.ts     # Execute template groups
├── template-manager.tsx     # UI for managing groups
├── template-group-config.ts # Default template groups
├── template-variants-view.tsx   # Display results
└── template-variants-helper.tsx # Helper for lazy loading
```

### Parsing Flow

1. Parse URL using `new URL(input)`
2. Split path into segments (decode URI components)
3. Build template context with all variables
4. Parse template string into tokens
5. Detect expansion variables (`*`)
6. Render and expand templates
7. Deduplicate results
8. Display in list view

### Template Output Type

```ts
type TemplateResult = {
  urls: string[];
  sourceTemplate: string;
  groupName: string;
  expansionInfo?: {
    type: "path-hierarchy";
    levels: number;
  };
};
```

---

## Why This Design Works

- No DSL or scripting required
- Low cognitive load for users
- Powerful enough for advanced workflows
- Easy to extend in future versions
- Perfectly aligned with Raycast's keyboard-first UX

---

## Future Extensions (Optional)

- Range expansion: `{{path:1..*}}`
- Filters: `{{path:* | max(3)}}`
- Domain-aware variables (e.g. GitHub repo paths)
- Custom user-defined variables
- Query parameter whitelist/blacklist

---

> **`{{path:*}}` solves 80% of real-world use cases**
> while keeping the system simple, predictable, and fast.
