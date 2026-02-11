# Raycast Extension Logging Implementation Guide

## Objective

Integrate `@chrismessina/raycast-logger` into this Raycast extension to replace raw `console.log`/`console.error` calls with structured, filterable, user-controllable logging.

## Step 1: Install & Configure

```bash
npm install @chrismessina/raycast-logger
```

Add to `package.json` preferences:

```json
{
  "name": "verboseLogging",
  "title": "Debug Logging",
  "description": "Enable extra diagnostics for troubleshooting and bug reports.",
  "type": "checkbox",
  "default": false,
  "required": false
}
```

## Step 2: Create Logger Utility

Create `src/utils/logger.ts`:

```typescript
import { logger, Logger } from "@chrismessina/raycast-logger";

// Default singleton logger - automatically reads verboseLogging preference
export { logger };

// Call once at extension startup to configure preferences
export function initLogger() {
  // Logger automatically reads verboseLogging preference from Raycast
}

// Factory for component-specific loggers with prefixes
export function getLogger(prefix: string): Logger {
  return logger.child(`[${prefix}]`);
}
```

**Why this approach:**

- Simpler and more direct than re-exporting a factory function
- Uses `logger.child()` for clean prefix formatting
- Singleton pattern ensures consistent logging across the app
- `initLogger()` placeholder allows for future configuration if needed

## Step 3: Initialize in Entry Points

In each command file (e.g., `src/index.tsx`):

```typescript
import { initLogger, getLogger } from "./util/logger";

initLogger();
const log = getLogger("ui.commandName");

export default function Command() {
  log.log("session:start", { status: "opened" });
  // ...
}
```

## Step 4: Replace Console Calls

Apply this transformation pattern throughout the codebase:

| **Before**                        | **After**                                    |
| --------------------------------- | -------------------------------------------- |
| `console.log("Fetching data...")` | `log.log("fetch:start", { url })`            |
| `console.log("Result:", data)`    | `log.log("fetch:result", { data })`          |
| `console.error("Failed:", err)`   | `log.error("fetch:error", { error })`        |
| `console.warn("Deprecated")`      | `log.warn("api:deprecated", { reason })`     |

## Step 5: Event Naming Convention

Use `category:action` format:

- **Lifecycle**: `session:start`, `session:end`
- **Network**: `fetch:start`, `fetch:success`, `fetch:error`
- **Parsing**: `parse:start`, `parse:complete`, `parse:error`
- **Cache**: `cache:hit`, `cache:miss`, `cache:write`
- **UI**: `ui:render`, `ui:action`, `ui:error`

## Step 6: Available Log Methods

The Logger provides three methods:

| **Method** | **When to Use**                          |
| ---------- | ---------------------------------------- |
| `log()`    | General diagnostics and flow tracking    |
| `warn()`   | Recoverable issues, deprecations         |
| `error()`  | Failures requiring attention             |

All logs are controlled by the `verboseLogging` preference—when enabled, all messages appear; when disabled, only errors are shown (aligned with Raycast's toast system).

## Step 7: Attach Context Data

Always include relevant identifiers:

```typescript
// Good: structured context
log.log("item:process", { 
  itemId: item.id, 
  type: item.type,
  count: items.length 
});

// Avoid: string interpolation
log.log("item:process", { message: `Processing ${item.id} of type ${item.type}` });
```

## Output Format

Logs render as:

```other
ℹ️ [component:event] Message (key=value, ...)
🔍 [api:response] Data received (status=200, items=5)
❌ [fetch:error] (url=https://..., error={...})
```

## Checklist

- [x] Package installed
- [x] Preference added to `package.json`
- [x] Logger utility created
- [ ] `initLogger()` called in each command entry point
- [x] All `console.log` replaced with `log.log()`
- [x] All `console.error` replaced with `log.error()`
- [x] All `console.warn` replaced with `log.warn()`
- [x] Event names follow `category:action` convention
- [x] Context objects used instead of string interpolation
