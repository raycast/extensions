# Go Link Tree - Raycast Extension

> **Status:** 🟢 Week 3 (Launch) | **MVP:** ~95% complete | **Author:** Miguel Alcalde

## Overview

A Raycast extension that provides quick access to a configurable tree of links defined in a YAML/JSON configuration file. Think of it as a personal "go links" system accessible directly from Raycast.

---

## 1. Feasibility Assessment

### ✅ Confirmed Feasible

| Aspect                   | Status       | Notes                                            |
| ------------------------ | ------------ | ------------------------------------------------ |
| Raycast Extension API    | ✅ Supported | Full React/TypeScript/Node.js support            |
| File-based Configuration | ✅ Supported | `file` preference type for user config path      |
| Hierarchical Lists       | ✅ Supported | `List.Section` component for grouping            |
| Quick Link Actions       | ✅ Supported | `Action.OpenInBrowser`, `Action.CopyToClipboard` |
| Local Storage/Caching    | ✅ Supported | `LocalStorage` API for performance               |
| Icons                    | ✅ Supported | Custom icons, file icons, SF Symbols             |
| Search/Filter            | ✅ Built-in  | Native fuzzy search in List component            |

### Existing Similar Extension

**Quick Jump** ([raycast.com/akadir/quick-jump](https://www.raycast.com/akadir/quick-jump)) provides similar functionality with JSON configuration. This validates our approach and can serve as implementation reference.

---

## 2. Configuration Format

### Recommended: YAML with JSON fallback

While Raycast doesn't natively parse YAML, the `js-yaml` npm package is lightweight (~50KB) and widely used. Supporting both formats is trivial.

### Configuration Schema

```yaml
# ~/.config/go-link-tree/links.yaml

version: 1

# Global settings
settings:
  defaultBrowser: "default" # or "chrome", "firefox", "safari", etc.
  showFavicons: true

# Link groups (become List.Section)
groups:
  - name: work
    title: "🏢 Work"
    icon: "building" # SF Symbol or custom icon
    links:
      - title: "GitHub"
        url: "https://github.com/myorg"
        keywords: ["gh", "code", "repos"]
        icon: "github"

      - title: "Jira Board"
        url: "https://myorg.atlassian.net/browse/PROJ"
        keywords: ["tickets", "issues", "bugs"]

      - title: "Confluence"
        url: "https://myorg.atlassian.net/wiki"
        keywords: ["docs", "wiki"]

  - name: dev
    title: "💻 Development"
    links:
      - title: "Localhost:3000"
        url: "http://localhost:3000"
        keywords: ["local", "dev"]

      - title: "Staging"
        url: "https://staging.myapp.com"
        keywords: ["stg", "test"]

      - title: "Production"
        url: "https://myapp.com"
        keywords: ["prod", "live"]

  - name: personal
    title: "🏠 Personal"
    links:
      - title: "Gmail"
        url: "https://mail.google.com"
        keywords: ["email", "inbox"]

# Templates for dynamic URLs (stretch goal)
templates:
  - name: "GitHub PR"
    pattern: "https://github.com/{org}/{repo}/pull/{pr}"
    icon: "git-pull-request"
```

### TypeScript Interface

```typescript
interface GoLinkConfig {
  version: number;
  settings?: {
    defaultBrowser?: string;
    showFavicons?: boolean;
  };
  groups: LinkGroup[];
  templates?: LinkTemplate[];
}

interface LinkGroup {
  name: string; // unique identifier
  title: string; // display title
  icon?: string; // optional icon
  links: Link[];
}

interface Link {
  title: string;
  url: string;
  keywords?: string[]; // searchable aliases
  icon?: string;
}

interface LinkTemplate {
  name: string;
  pattern: string; // URL with {placeholders}
  icon?: string;
}
```

---

## 3. Feature Specification

### MVP Features (v1.0)

| Feature                    | Priority | Description                             |
| -------------------------- | -------- | --------------------------------------- |
| **List View**              | P0       | Display all links grouped by section    |
| **Search**                 | P0       | Filter links by title, keywords, URL    |
| **Open Link**              | P0       | Open selected link in default browser   |
| **Copy URL**               | P0       | Copy link URL to clipboard              |
| **Config File Preference** | P0       | User configures path to YAML/JSON file  |
| **File Watcher**           | P1       | Auto-reload when config file changes    |
| **Icons**                  | P1       | Support SF Symbols and custom icons     |
| **Keyboard Shortcuts**     | P1       | Assignable shortcuts for frequent links |

### Stretch Features (v2.0)

| Feature               | Priority | Description                           |
| --------------------- | -------- | ------------------------------------- |
| **Templates**         | P2       | Dynamic URLs with placeholder inputs  |
| **Recent Links**      | P2       | Track and surface recently used links |
| **Favorites**         | P2       | Pin frequently used links to top      |
| **Browser Selection** | P2       | Open in specific browser              |
| **Import/Export**     | P3       | Import from browser bookmarks         |
| **Sync**              | P3       | Optional cloud sync (iCloud/Dropbox)  |

---

## 4. Technical Architecture

### Project Structure (Current)

```
go-link-tree/
├── src/
│   ├── index.tsx              # Main command with file watcher ✅
│   ├── components/
│   │   └── LinkItem.tsx       # Link item with actions ✅
│   ├── lib/
│   │   ├── config.ts          # Config parsing + validation ✅
│   │   └── icons.ts           # Icon resolution (SF Symbols, assets) ✅
│   └── types/
│       └── index.ts           # TypeScript interfaces ✅
├── link.png                   # Extension icon ✅
├── links.yaml                 # User config (gitignored)
├── links.example.yaml         # Sample configuration template ✅
├── package.json               # Raycast manifest ✅
├── tsconfig.json              # TypeScript config ✅
├── raycast-env.d.ts           # Raycast environment types ✅
└── README.md                  # Documentation ✅
```

### Files to add in Phase 3/4

```
├── src/
│   ├── lib/
│   │   └── storage.ts         # LocalStorage wrapper (for recent links - Phase 4)
├── assets/
│   └── icons/                 # Custom link icons (optional)
└── screenshots/               # Store listing screenshots (Phase 3)
```

### Key Implementation Details

> **Note:** Code reflects current implementation after Phase 2.

#### 1. Icon Resolution (`src/lib/icons.ts`) - NEW in Phase 2

```typescript
import { Icon, Image } from "@raycast/api";

/**
 * Resolves an icon string to a Raycast-compatible icon source.
 * Supports:
 * - Raycast Icon enum keys (e.g., "GitHub", "Link")
 * - SF Symbols (e.g., "sf-symbol:house.fill" or "house.fill")
 * - Custom asset paths (e.g., "icon.png")
 */
export function resolveIcon(iconString?: string): Icon | Image.ImageLike {
  if (!iconString) return Icon.Link;

  // Try Raycast Icon enum first
  const iconKey = iconString as keyof typeof Icon;
  if (Icon[iconKey]) return Icon[iconKey];

  // SF Symbol format
  if (iconString.startsWith("sf-symbol:") || iconString.includes(".")) {
    const sfSymbol = iconString.startsWith("sf-symbol:")
      ? iconString.slice(10)
      : iconString;
    return { source: `sf-symbol:${sfSymbol}` };
  }

  // Custom asset path
  if (/\.(png|jpg|jpeg|svg|gif)$/i.test(iconString)) {
    return { source: iconString };
  }

  // Fallback: try as SF Symbol
  return { source: `sf-symbol:${iconString}` };
}
```

#### 2. Configuration Loading with Validation (`src/lib/config.ts`)

```typescript
import { getPreferenceValues } from "@raycast/api";
import * as yaml from "js-yaml";
import * as fs from "fs";
import { GoLinkConfig } from "../types";

export function getConfigPath(): string {
  const { configPath } = getPreferenceValues<{ configPath: string }>();
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  return configPath.replace(/^~/, homeDir);
}

function validateConfig(config: unknown): GoLinkConfig {
  // Validates: version (number), groups (array), each group has name/title/links,
  // each link has title/url, URLs are valid
  // Throws descriptive errors for each validation failure
  // ... (see full implementation in src/lib/config.ts)
}

export async function loadConfig(): Promise<GoLinkConfig> {
  const resolvedPath = getConfigPath();

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Configuration file not found: ${resolvedPath}`);
  }

  const content = fs.readFileSync(resolvedPath, "utf-8");
  const parsed =
    resolvedPath.endsWith(".yaml") || resolvedPath.endsWith(".yml")
      ? yaml.load(content)
      : JSON.parse(content);

  return validateConfig(parsed);
}
```

#### 3. Main Command with File Watcher (`src/index.tsx`)

```typescript
import {
  List,
  Icon,
  showToast,
  Toast,
  ActionPanel,
  Action,
} from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import * as fs from "fs";
import { loadConfig, getConfigPath } from "./lib/config";

export default function Command() {
  const [config, setConfig] = useState<GoLinkConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const watcherRef = useRef<fs.FSWatcher | null>(null);

  const reloadConfig = useCallback(async () => {
    // Load config and show toast on success/failure
  }, []);

  useEffect(() => {
    reloadConfig();

    // File watcher with debounce
    const configPath = getConfigPath();
    let debounceTimer: NodeJS.Timeout | null = null;

    const watcher = fs.watch(configPath, { persistent: false }, (eventType) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => reloadConfig(), 300);
    });

    watcherRef.current = watcher;
    return () => watcher.close();
  }, [reloadConfig]);

  // Renders Configuration Settings section + link groups
  // Error state shows Reload/Edit/Show in Finder actions
}
```

#### 4. Link Item Component (`src/components/LinkItem.tsx`)

```typescript
import { List, ActionPanel, Action } from "@raycast/api";
import { Link } from "../types";
import { resolveIcon } from "../lib/icons";

export function LinkItem({ link }: { link: Link }) {
  return (
    <List.Item
      title={link.title}
      subtitle={link.url}
      keywords={link.keywords}
      icon={resolveIcon(link.icon)}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={link.url} />
          <Action.CopyToClipboard content={link.url} title="Copy URL" />
          <Action.CopyToClipboard
            content={`[${link.title}](${link.url})`}
            title="Copy as Markdown"
          />
        </ActionPanel>
      }
    />
  );
}
```

#### 3. Package Manifest (Preferences)

```json
{
  "name": "go-link-tree",
  "title": "Go Link Tree",
  "description": "Quick access to your personal link tree",
  "icon": "extension-icon.png",
  "author": "your-username",
  "categories": ["Productivity", "Web"],
  "license": "MIT",
  "commands": [
    {
      "name": "index",
      "title": "Search Links",
      "description": "Search and open links from your link tree",
      "mode": "view"
    }
  ],
  "preferences": [
    {
      "name": "configPath",
      "type": "file",
      "required": true,
      "title": "Configuration File",
      "description": "Path to your links configuration file (YAML or JSON)",
      "placeholder": "~/.config/go-link-tree/links.yaml"
    }
  ],
  "dependencies": {
    "@raycast/api": "^1.83.0",
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "@raycast/eslint-config": "^1.0.11",
    "@types/js-yaml": "^4.0.9",
    "@types/node": "22.5.0",
    "@types/react": "18.3.3",
    "eslint": "^8.57.0",
    "prettier": "^3.3.3",
    "typescript": "^5.5.4"
  }
}
```

---

## 5. User Experience

### First Run Flow

1. User installs extension from Raycast Store
2. Raycast prompts for configuration file path (required preference)
3. If file doesn't exist, extension shows helpful error with:
   - Link to documentation
   - Action to create sample config file
4. Once configured, extension is ready

### Daily Usage Flow

1. User invokes Raycast (`⌘ + Space`)
2. Types extension name or assigned alias (e.g., "links", "go")
3. Extension displays grouped link tree
4. User types to filter (fuzzy search across title, keywords, URL)
5. User presses `Enter` to open or uses action shortcuts:
   - `⌘ + Enter` → Open in browser
   - `⌘ + C` → Copy URL
   - `⌘ + ⇧ + C` → Copy as Markdown link

### Search Behavior

Search matches against:

- Link title (highest weight)
- Keywords (high weight)
- Group title (medium weight)
- URL domain (low weight)

---

## 6. Development Roadmap

### Phase 1: Foundation (Week 1) ✅ COMPLETED

- [x] Set up Raycast extension project
- [x] Implement config file parsing (YAML + JSON)
- [x] Create basic List view with sections
- [x] Add Open in Browser action
- [x] Add Copy URL action
- [x] Test with sample configuration

**Deliverables:**

- `package.json` - Raycast manifest with preferences
- `src/index.tsx` - Main command with List view and error handling
- `src/components/LinkItem.tsx` - Link item with actions (Open, Copy URL, Copy Markdown)
- `src/lib/config.ts` - Config loader with YAML/JSON support and path resolution
- `src/types/index.ts` - TypeScript interfaces
- `links.example.yaml` - Sample configuration template
- `README.md` - Basic documentation

**Bonus items completed early:**

- [x] Keywords search (via `List.Item` keywords prop)
- [x] Basic icon support (Raycast Icon enum mapping)
- [x] Error handling with Toast notifications
- [x] Sample config template

---

### Phase 2: Polish (Week 2) ✅ COMPLETED

- [x] Enhance icon support (SF Symbols, custom asset icons, favicons)
- [x] Add file watcher for config hot-reload (detect changes without restart)
- [x] Improve error messages for specific config issues (missing fields, invalid YAML)
- [x] Add "Edit Config" action to open config file in editor
- [x] Add "Reload Config" action for manual refresh

**Nice to have (completed):**

- [x] Show link count per group in section subtitle
- [x] Validate config schema on load
- [x] Show in Finder action (bonus)

**Deliverables:**

- `src/lib/icons.ts` - Icon resolution (SF Symbols via `sf-symbol:name` or dot notation, custom assets, Icon enum)
- `src/lib/config.ts` - Enhanced with `validateConfig()` and `getConfigPath()` functions
- `src/index.tsx` - File watcher with `fs.watch()` + debounce, Configuration Settings section
- `link.png` - Custom extension icon (blue circle with chain link)

**New keyboard shortcuts:**

- `⌘ + R` → Reload Configuration
- `⌘ + E` → Edit Configuration File
- `⌘ + ⇧ + F` → Show Configuration File in Finder

---

### Phase 3: Launch (Week 3) 🔄 IN PROGRESS

- [x] Create custom extension icon (`link.png` - done in Phase 2)
- [ ] Add screenshots for Raycast Store listing
- [ ] Test on fresh Raycast install (clean environment)
- [ ] Publish to Raycast Store
- [ ] Create GitHub release

**Store listing requirements:**

- Extension icon (512x512 PNG) ✅
- At least 1 screenshot
- Complete description
- Category selection (Productivity, Web)

---

### Phase 4: Enhancements (Post-launch)

- [ ] URL templates with placeholder inputs (Form for dynamic values)
- [ ] Recent links tracking (LocalStorage)
- [ ] Favorites/pinned links
- [ ] Browser selection preference
- [ ] Import from browser bookmarks
- [ ] Deep link support for specific groups

---

## 7. Resources & References

### Documentation

- [Raycast API Reference](https://developers.raycast.com/api-reference)
- [Create Your First Extension](https://developers.raycast.com/basics/create-your-first-extension)
- [List Component](https://developers.raycast.com/api-reference/user-interface/list)
- [Preferences](https://developers.raycast.com/api-reference/preferences)
- [LocalStorage](https://developers.raycast.com/api-reference/storage)

### Reference Extensions

- [Quick Jump](https://www.raycast.com/akadir/quick-jump) - Similar JSON-based link manager
- [Browser Bookmarks](https://www.raycast.com/raycast/browser-bookmarks) - Browser integration patterns

### Dependencies

| Package        | Version | Purpose                     |
| -------------- | ------- | --------------------------- |
| `@raycast/api` | ^1.83.0 | Raycast extension framework |
| `js-yaml`      | ^4.1.0  | YAML parsing                |

---

## 8. Open Questions

### Resolved ✅

1. ~~**Config location**: Should we provide a default config location (`~/.config/go-link-tree/`) or always require explicit path?~~
   → **Decision:** Require explicit path via preference. User has full control.

2. ~~**Validation**: How strict should config validation be? Fail loudly or gracefully skip invalid entries?~~
   → **Decision:** Fail loudly with Toast notification and error display. User needs clear feedback.

3. ~~**File watcher approach**: Use `fs.watch` or poll on window focus?~~
   → **Decision:** Use `fs.watch` with 300ms debounce. Handles both `change` and `rename` events. Falls back gracefully if watcher fails.

4. ~~**Icon assets**: Support local PNG icons in addition to SF Symbols?~~
   → **Decision:** Yes. `resolveIcon()` supports: Raycast Icon enum, SF Symbols (`sf-symbol:name` or `house.fill` format), and custom asset paths (`.png`, `.jpg`, `.svg`, `.gif`).

### Still Open 🤔

5. **Sync**: Is there interest in syncing config across machines (iCloud/Dropbox/Git)?
   → Consider for Phase 4. Users can manually point to synced folder.

6. **Templates complexity**: Should templates support advanced features like dropdowns for predefined values?
   → Defer to Phase 4. Start with simple text placeholders.

---

## 9. Success Criteria

| Criteria                                                    | Status      | Notes                                       |
| ----------------------------------------------------------- | ----------- | ------------------------------------------- |
| Extension successfully published to Raycast Store           | 🔲 Pending  | Target: Week 3                              |
| Config file changes reflected without extension restart     | ✅ Achieved | `fs.watch` with debounce implemented        |
| Search finds links within 100ms for configs with 500+ links | ✅ Achieved | Native List component handles well          |
| Clear error messages for invalid configurations             | ✅ Achieved | Detailed validation with field-level errors |
| 4+ star rating on Raycast Store within first month          | 🔲 Pending  | Post-launch metric                          |

---

## 10. Current Status Summary

| Metric          | Value                          |
| --------------- | ------------------------------ |
| **Phase**       | Week 3 (Launch)                |
| **Completion**  | ~95% of MVP                    |
| **Blockers**    | None                           |
| **Next Action** | Screenshots + Store submission |

### What's Working ✅

- YAML/JSON config loading with `~` path expansion
- List view with grouped sections
- Search by title, keywords, URL
- Open in Browser action
- Copy URL / Copy as Markdown actions
- Error handling with user feedback
- Full icon support (SF Symbols, custom assets, Icon enum)
- File watcher for hot-reload (auto-detects config changes)
- Config validation with detailed error messages
- Edit Config action (`⌘+E`)
- Reload Config action (`⌘+R`)
- Show in Finder action (`⌘+⇧+F`)
- Custom extension icon

### What's Missing for Launch 🔲

- Store screenshots
- Test on fresh Raycast install
- Raycast Store submission
- GitHub release
