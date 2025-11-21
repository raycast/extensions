# Yabai Integration

Guidelines for integrating with yabai window manager CLI, focused on window listing and action patterns.

---

## 1. 🔧 YABAI CLI BASICS

### Installation & PATH Detection

Detect yabai installation automatically:

```typescript
// models.ts
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

export const YABAI = existsSync("/opt/homebrew/bin/yabai")
  ? "/opt/homebrew/bin/yabai"
  : existsSync("/usr/local/bin/yabai")
    ? "/usr/local/bin/yabai"
    : execSync("which yabai").toString().trim();
```

### Command Structure

All yabai commands follow this pattern:

```bash
yabai -m <domain> <action> [options]
```

**Domains:**
- `query` - Query information (windows, displays, spaces)
- `window` - Manipulate windows
- `space` - Manipulate spaces
- `display` - Manipulate displays

---

## 2. 🪟 WINDOW MANAGEMENT COMMANDS

### Query Windows

List all windows:

```typescript
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFilePromise = promisify(execFile);

// Query all windows
const { stdout } = await execFilePromise(
  YABAI,
  ["-m", "query", "--windows"],
  { env: ENV }
);
const windows: YabaiWindow[] = JSON.parse(stdout);

// Query specific window
const { stdout } = await execFilePromise(
  YABAI,
  ["-m", "query", "--windows", "--window", windowId.toString()],
  { env: ENV }
);
const window: YabaiWindow = JSON.parse(stdout);
```

### Focus Window

Bring window to front:

```typescript
const { stderr } = await execFilePromise(
  YABAI,
  ["-m", "window", windowId.toString(), "--focus"],
  { env: ENV }
);
```

### Close Window

Close a window:

```typescript
const { stderr } = await execFilePromise(
  YABAI,
  ["-m", "window", windowId.toString(), "--close"],
  { env: ENV }
);
```

### Move Window to Space

Move window to different space:

```typescript
const { stderr } = await execFilePromise(
  YABAI,
  ["-m", "window", windowId.toString(), "--space", spaceIndex.toString()],
  { env: ENV }
);
```

### Move Window to Display

Move window to different display:

```typescript
const { stderr } = await execFilePromise(
  YABAI,
  ["-m", "window", windowId.toString(), "--display", displayIndex.toString()],
  { env: ENV }
);
```

---

## 3. 🖥️ DISPLAY MANAGEMENT COMMANDS

### Query Displays

List all displays:

```typescript
const { stdout } = await execFilePromise(
  YABAI,
  ["-m", "query", "--displays"],
  { env: ENV }
);
const displays: YabaiDisplay[] = JSON.parse(stdout);
```

---

## 4. 📍 SPACE MANAGEMENT COMMANDS

### Query Spaces

List all spaces:

```typescript
const { stdout } = await execFilePromise(
  YABAI,
  ["-m", "query", "--spaces"],
  { env: ENV }
);
const spaces: YabaiSpace[] = JSON.parse(stdout);
```

### Create Space

Create new empty space:

```typescript
const { stdout } = await execFilePromise(
  YABAI,
  ["-m", "space", "--create"],
  { env: ENV }
);
```

### Destroy Space

Remove empty space:

```typescript
const { stderr } = await execFilePromise(
  YABAI,
  ["-m", "space", spaceIndex.toString(), "--destroy"],
  { env: ENV }
);
```

---

## 5. 📊 DATA STRUCTURES

### YabaiWindow Interface

```typescript
export interface YabaiWindow {
  id: number;                      // Unique window ID
  pid: number;                     // Process ID
  app: string;                     // Application name
  title: string;                   // Window title
  space: number;                   // Current space index
  display?: number;                // Display index (optional)
  frame?: {                        // Window geometry
    x: number;
    y: number;
    w: number;
    h: number;
  };
  role?: string;                   // Window role
  subrole?: string;                // Window subrole
  "has-focus"?: boolean;           // Currently focused
  "is-native-fullscreen"?: boolean; // Fullscreen state
  level?: number;                  // Window level
}
```

### YabaiDisplay Interface

```typescript
export interface YabaiDisplay {
  id: number;                // Unique display ID
  uuid: string;              // Display UUID
  index: number;             // Display index (1, 2, 3...)
  label: string;             // Display label
  frame: {                   // Display geometry
    x: number;
    y: number;
    w: number;
    h: number;
  };
  spaces: number[];          // Space IDs on this display
  "has-focus": boolean;      // Currently focused display
}
```

### YabaiSpace Interface

```typescript
export interface YabaiSpace {
  index: number;             // Space index
  windows: number[];         // Window IDs in this space  
  display: number;           // Display this space belongs to
}
```

---

## 6. ⚡ EXECUTION PATTERNS

### Using execFile with Promisify

Standard pattern for executing yabai commands:

```typescript
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFilePromise = promisify(execFile);

// Always use ENV for proper user context
export const ENV = {
  USER: os.userInfo().username,
  HOME: os.userInfo().homedir,
};

try {
  const { stdout, stderr } = await execFilePromise(
    YABAI,
    ["-m", "query", "--windows"],
    { env: ENV }
  );
  
  if (stderr?.trim()) {
    console.warn("yabai stderr:", stderr);
  }
  
  const windows: YabaiWindow[] = JSON.parse(stdout);
  return windows;
} catch (error) {
  console.error("Failed to query windows:", error);
  throw error;
}
```

### JSON Parsing with Error Handling

Always validate JSON before parsing:

```typescript
try {
  // Ensure stdout is a string
  const stdoutStr = typeof stdout === "string" 
    ? stdout 
    : JSON.stringify(stdout);
  
  const data = JSON.parse(stdoutStr);
  
  // Validate expected structure
  if (!Array.isArray(data)) {
    throw new Error("Expected array from yabai query");
  }
  
  return data;
} catch (parseError) {
  console.error("Failed to parse yabai output:", parseError);
  throw parseError;
}
```

---

## 7. 🚨 ERROR HANDLING

### Common Error Patterns

#### Window Not Found

```typescript
function isWindowNotFoundError(message: string): boolean {
  return message.includes("window not found") ||
         message.includes("could not locate");
}

if (isWindowNotFoundError(stderr)) {
  // Handle fallback: try launching application
  await launchApplication(windowApp);
}
```

#### Application Not Running

```typescript
function isApplicationNotRunningError(message: string): boolean {
  return message.includes("application not running");
}
```

#### Permission Errors

```typescript
if (stderr.includes("operation not permitted")) {
  await showToast({
    style: Toast.Style.Failure,
    title: "Permission Denied",
    message: "yabai requires accessibility permissions",
  });
}
```

### Incomplete JSON Responses

Handle incomplete JSON from yabai:

```typescript
try {
  const data = JSON.parse(stdout);
  return data;
} catch (parseError) {
  if (parseError instanceof IncompleteJsonError) {
    console.warn("Incomplete JSON from yabai, keeping previous data");
    return previousData; // Use cached data
  }
  throw parseError;
}
```

---

## 8. 🎯 COMMON PITFALLS

### 1. Forgetting Environment Variables

```typescript
// Bad: Missing env
const { stdout } = await execFilePromise(YABAI, ["-m", "query", "--windows"]);

// Good: Include ENV
const { stdout } = await execFilePromise(
  YABAI,
  ["-m", "query", "--windows"],
  { env: ENV }
);
```

### 2. Not Handling stderr

```typescript
// Bad: Ignoring stderr
const { stdout } = await execFilePromise(YABAI, [...]);

// Good: Check stderr for warnings/errors
const { stdout, stderr } = await execFilePromise(YABAI, [...]);
if (stderr?.trim()) {
  console.warn("yabai warning:", stderr);
}
```

### 3. Assuming JSON is Always Valid

```typescript
// Bad: No validation
const windows = JSON.parse(stdout);

// Good: Validate before use
const parsed = JSON.parse(stdout);
if (!Array.isArray(parsed)) {
  throw new Error("Invalid response from yabai");
}
const windows: YabaiWindow[] = parsed;
```

### 4. Not Converting Window IDs to Strings

```typescript
// Bad: Using number directly
await execFilePromise(YABAI, ["-m", "window", windowId, "--focus"]);

// Good: Convert to string
await execFilePromise(YABAI, ["-m", "window", windowId.toString(), "--focus"]);
```

---

## 9. 🔄 QUERY OPTIMIZATION

### Caching Queries

Avoid redundant yabai queries:

```typescript
class YabaiQueryManager {
  private pendingQueries: Map<string, Promise<any>> = new Map();
  
  async queryWindows(): Promise<YabaiWindow[]> {
    const key = "windows";
    
    // Deduplicate concurrent queries
    if (this.pendingQueries.has(key)) {
      return this.pendingQueries.get(key)!;
    }
    
    const query = this.fetchWindows();
    this.pendingQueries.set(key, query);
    
    try {
      const result = await query;
      return result;
    } finally {
      this.pendingQueries.delete(key);
    }
  }
  
  private async fetchWindows(): Promise<YabaiWindow[]> {
    const { stdout } = await execFilePromise(
      YABAI,
      ["-m", "query", "--windows"],
      { env: ENV }
    );
    return JSON.parse(stdout);
  }
}
```

### Batch Operations

When moving multiple windows, batch the operations:

```typescript
// Query once, operate multiple times
const allWindows = await queryWindows();
const targetWindows = allWindows.filter(w => w.app === appName);

for (const window of targetWindows) {
  await moveWindowToSpace(window.id, targetSpace);
}
```

---

## 10. 📝 BEST PRACTICES

1. **Always provide ENV**: Include user environment variables for proper context
2. **Handle stderr**: Check stderr for warnings even on success
3. **Validate JSON**: Don't assume yabai output is always valid JSON
4. **Convert to strings**: Convert numeric IDs to strings for CLI arguments
5. **Cache queries**: Deduplicate concurrent queries to same endpoint
6. **Fallback gracefully**: Handle window-not-found by launching application
7. **Log errors**: Always log yabai errors for debugging
8. **Timeout operations**: Consider adding timeouts for long-running operations
9. **Test error paths**: Test with yabai not running, permissions denied, etc.
10. **User feedback**: Show toast notifications for user-initiated actions