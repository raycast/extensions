# XKeen Manager v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the xkeen-manager Raycast extension from a 2060-line monolith into focused modules, optimize startup from ~3-6s to ~1-2s, redesign the main screen, and rebuild Quick Add for categorized routing configs.

**Architecture:** Split monolith into `lib/` (SSH, JSON, routing, profiles, health, utils) and `components/` (UI). Single SSH call at startup replaces 3 sequential calls. Text-based routing mutations preserve comments. Main screen reduced from 8 to 6 visible items with rarely used features in Action Panel.

**Tech Stack:** TypeScript, React, @raycast/api ^1.104.1, @raycast/utils ^1.17.0, SSH via `execFile`.

**Spec:** `docs/superpowers/specs/2026-03-21-xkeen-manager-v2-design.md`

**Source monolith:** `src/xkeen-manager.tsx` (2060 lines)

---

## File Structure

```
src/
├── xkeen-manager.tsx              # Main List component — imports components, single startup call, crash alert
├── lib/
│   ├── ssh.ts                     # runRemoteRaw, runRemote, enqueueRemoteTask, formatSshError, isRetryableRemoteError
│   ├── json.ts                    # stripJsonComments, tryParseJson, validateXrayJson
│   ├── routing.ts                 # parseRoutingCategories, insertDomainsIntoCategory, createRaycastCategory, normalization
│   ├── profiles.ts                # readProfileMeta, writeProfileMeta, validateProfileName, ProfileMeta type
│   ├── health.ts                  # loadStartupData, loadHealthSnapshot, verifyTrafficPath, fetchIp, StartupData type
│   ├── files.ts                   # readRemoteFile, writeRemoteFile, safeWriteRemoteFile, backup/restore functions
│   └── utils.ts                   # Prefs, getPaths, shQuote, stripAnsi, cleanOutput, extractIpv4, parseSshJson, parseKeyValueLines, formatters
├── components/
│   ├── QuickAddForm.tsx           # Quick Add with category dropdown — new implementation
│   ├── JsonEditor.tsx             # JSON editor — port with comment preservation fix
│   ├── ProfilesList.tsx           # Profile management — straight port
│   ├── LogsDetail.tsx             # Log viewer — straight port
│   ├── HealthDetail.tsx           # Health check screen — straight port
│   ├── IpDetail.tsx               # IP check screen — straight port
│   └── BackupsHub.tsx             # Backups and rollback — straight port
└── setup-ssh.tsx                  # Unchanged
```

Notes:
- `files.ts` was added (vs spec) to separate file I/O operations from SSH transport — keeps `ssh.ts` focused on connection logic.
- `StatusItem.tsx` from the spec is intentionally omitted — the status UI is ~15 lines and is inlined directly in `xkeen-manager.tsx` to avoid a trivial single-use component.
- `loadStartupData()` in `health.ts` replaces the old `loadHealthSnapshot()` — it returns both status and health data in one SSH call.
- Per-file `tsc --noEmit` commands in early tasks may fail due to cross-module imports not yet existing. Defer full compilation check to Task 11. Early tasks should verify syntax only.

---

### Task 1: Extract `lib/utils.ts`

Extract pure utility functions that have no SSH or Raycast dependencies. These are used by every other module, so they must be extracted first.

**Files:**
- Create: `src/lib/utils.ts`
- Reference: `src/xkeen-manager.tsx:20-32` (types, getPaths), `46-84` (stripAnsi, fetchIp, cleanOutput), `235-275` (shQuote, nowStamp, backupLabel, basenameFromPath, extractIpv4, parseKeyValueLines, parseSshJson)

- [ ] **Step 1: Create `src/lib/utils.ts`**

Extract these functions and types from the monolith:

```ts
import { getPreferenceValues } from "@raycast/api";

export type Prefs = {
  sshHost: string;
  configDir?: string;
  profilesDir?: string;
};

export function getPaths() {
  const prefs = getPreferenceValues<Prefs>();
  const configDir = (prefs.configDir ?? "").trim() || "/opt/etc/xray/configs";
  const profilesDir = (prefs.profilesDir ?? "").trim() || "/opt/etc/xray/configs-profiles";
  return { configDir, profilesDir };
}

export function stripAnsi(input: string) {
  // eslint-disable-next-line no-control-regex
  return input.replace(new RegExp("\\u001B\\[[0-?]*[ -/]*[@-~]", "g"), "");
}

export function cleanOutput(stdout: string, stderr: string) {
  const out = stripAnsi(String(stdout ?? ""));
  const err = stripAnsi(String(stderr ?? ""));
  const lines = (out + "\n" + err)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^export\s+/i.test(l))
    .filter((l) => !l.includes("SSH_CLIENT"))
    .filter((l) => !l.includes("SSH_CONNECTION"));
  const text = lines.join("\n");
  const firstLine = lines[0] || "—";
  return { text: text || "(empty)", firstLine };
}

export function shQuote(value: string): string {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

export function nowStamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
}

export function backupLabel(label: string): string {
  const cleaned = String(label || "manual")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "manual";
}

export function basenameFromPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] || "config.json";
}

export function extractIpv4(text: string): string | null {
  return String(text || "").match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/)?.[0] ?? null;
}

export function parseKeyValueLines(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of String(text || "").split("\n")) {
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) out[key] = value;
  }
  return out;
}

export function parseSshJson(stdout: string): any {
  try {
    const match = stdout.match(/___JSON_START___([\s\S]*?)___JSON_END___/);
    if (match && match[1]) return JSON.parse(match[1].trim());
  } catch {
    return null;
  }
  return null;
}

export async function fetchIp(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "curl/7.64.1" },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const text = await res.text();
      const match = text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
      return match ? match[0] : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function parseErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error ?? "Unknown error");
}

export function shortDate(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ru-RU");
}

export function mdCode(title: string, text: string) {
  return `# ${title}\n\n\`\`\`\n${text?.length ? text : "(empty)"}\n\`\`\``;
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/viktorbruhis/Documents/vbrs/Dev/xkeen-manager && npx tsc --noEmit src/lib/utils.ts`

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils.ts
git commit -m "refactor: extract lib/utils.ts from monolith"
```

---

### Task 2: Extract `lib/ssh.ts`

Extract SSH transport layer — connection, queue, retry, error formatting.

**Files:**
- Create: `src/lib/ssh.ts`
- Reference: `src/xkeen-manager.tsx:86-233` (formatSshError, runRemoteRaw, runRemote, enqueueRemoteTask, isRetryableRemoteError, sleep)

- [ ] **Step 1: Create `src/lib/ssh.ts`**

```ts
import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { stripAnsi, type Prefs } from "./utils";

type SshExecErrorLike = {
  message?: string;
  killed?: boolean;
  signal?: string | null;
};

export function formatSshError(host: string, err: unknown, stderr: string): Error {
  const e: SshExecErrorLike = typeof err === "object" && err !== null ? (err as SshExecErrorLike) : {};
  const rawStderr = stripAnsi(String(stderr ?? "")).trim();
  const rawMessage = stripAnsi(String(e.message ?? "")).trim();
  const message = rawStderr || rawMessage || "SSH error";

  if (/Could not resolve hostname/i.test(message)) {
    return new Error(`SSH host "${host}" не найден. Проверьте Raycast Preferences -> SSH Connection.`);
  }
  if (/Connection refused/i.test(message)) {
    return new Error(`SSH к "${host}" отклонен. Entware/USB (/opt) отвалился и SSH на 222 не запущен.`);
  }
  if (/Permission denied/i.test(message)) {
    return new Error(`SSH-аутентификация не прошла для "${host}". Проверьте ключи/доступ root.`);
  }
  if (/No route to host|Operation not permitted|Operation timed out|timed out/i.test(message)) {
    return new Error(`Нет доступа к "${host}" по сети. Проверьте Wi-Fi/LAN и IP роутера.`);
  }
  if (e.killed || e.signal === "SIGTERM") {
    return new Error(`SSH-команда к "${host}" превысила таймаут.`);
  }
  return new Error(message);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let remoteQueueTail: Promise<unknown> = Promise.resolve();

function enqueueRemoteTask<T>(task: () => Promise<T>): Promise<T> {
  const run = remoteQueueTail.then(task, task);
  remoteQueueTail = run.then(() => undefined, () => undefined);
  return run;
}

function isRetryableRemoteError(message: string): boolean {
  return /kex_exchange_identification|Connection reset by peer|Connection timed out|Operation timed out|Broken pipe|Connection refused/i.test(message);
}

function runRemoteRaw(cmd: string, timeoutMs = 20000): Promise<{ stdout: string; stderr: string }> {
  const prefs = getPreferenceValues<Prefs>();
  const host = (prefs.sshHost || "xkeen").trim();
  const wrapped = `export PATH=/opt/sbin:/opt/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH; export TERM=dumb; ${cmd}`;
  const args = [
    "-o", "BatchMode=yes",
    "-o", "ConnectTimeout=5",
    "-o", "ServerAliveInterval=5",
    "-o", "ServerAliveCountMax=1",
    "-o", "StrictHostKeyChecking=accept-new",
    "-o", "LogLevel=ERROR",
    host, "sh", "-c", wrapped,
  ];

  return new Promise((resolve, reject) => {
    execFile("ssh", args, { maxBuffer: 10 * 1024 * 1024, timeout: timeoutMs }, (err, stdout, stderr) => {
      if (err) return reject(formatSshError(host, err, stderr));
      resolve({
        stdout: stripAnsi(String(stdout ?? "")).trim(),
        stderr: stripAnsi(String(stderr ?? "")).trim(),
      });
    });
  });
}

export type RunRemoteOptions = {
  bypassQueue?: boolean;
  retries?: number;
  timeoutMs?: number;
};

export function runRemote(cmd: string, options: RunRemoteOptions = {}): Promise<{ stdout: string; stderr: string }> {
  const retries = options.retries ?? 2;
  const timeoutMs = options.timeoutMs ?? 20000;

  const runWithRetry = async () => {
    let attempt = 0;
    while (true) {
      try {
        return await runRemoteRaw(cmd, timeoutMs);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (attempt >= retries || !isRetryableRemoteError(message)) throw error;
        const backoffMs = Math.min(1400, 250 * Math.pow(2, attempt));
        await sleep(backoffMs);
        attempt += 1;
      }
    }
  };

  if (options.bypassQueue) return runWithRetry();
  return enqueueRemoteTask(runWithRetry);
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/viktorbruhis/Documents/vbrs/Dev/xkeen-manager && npx tsc --noEmit src/lib/ssh.ts`

- [ ] **Step 3: Commit**

```bash
git add src/lib/ssh.ts
git commit -m "refactor: extract lib/ssh.ts from monolith"
```

---

### Task 3: Extract `lib/json.ts`

Extract JSON parsing utilities — comment stripping, parsing, validation.

**Files:**
- Create: `src/lib/json.ts`
- Reference: `src/xkeen-manager.tsx:514-671` (stripJsonComments, tryParseJson, validateXrayJson, isRoutingPath, isOutboundsPath)

- [ ] **Step 1: Create `src/lib/json.ts`**

Port the following functions as-is from the monolith:
- `stripJsonComments(input: string): string` (lines 515-571)
- `tryParseJson(text: string)` (lines 573-579)
- `isRoutingPath(path: string)` (lines 581-583)
- `isOutboundsPath(path: string)` (lines 584-586)
- `validateXrayJson(path: string, value: any): string[]` (lines 648-671)

Remove these functions (no longer needed per spec section 6.2):
- `sanitizeConfigForSave` — was for raycastManaged cleanup
- `insertCommentBeforeRule` — was for old ruleTag comments
- `addRoutingRaycastBlockComments` — same
- `prettyJsonOrOriginalForPath` — relied on sanitize+stringify which destroys comments

Add a simpler helper for the editor:

```ts
export function countChangedLines(oldText: string, newText: string): number {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  let changed = 0;
  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    if (oldLines[i] !== newLines[i]) changed++;
  }
  return changed;
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/viktorbruhis/Documents/vbrs/Dev/xkeen-manager && npx tsc --noEmit src/lib/json.ts`

- [ ] **Step 3: Commit**

```bash
git add src/lib/json.ts
git commit -m "refactor: extract lib/json.ts from monolith"
```

---

### Task 4: Extract `lib/files.ts`

Extract remote file operations — read, write, backup, restore.

**Files:**
- Create: `src/lib/files.ts`
- Reference: `src/xkeen-manager.tsx:256-335` (getBackupDir, createRemoteBackup, listRemoteBackups, restoreRemoteBackup, safeWriteRemoteFile) and `493-512` (readRemoteFile, writeRemoteFile)

- [ ] **Step 1: Create `src/lib/files.ts`**

Port these functions, updating imports to use `./ssh` and `./utils`:
- `getBackupDir()` — uses `getPaths`, `shQuote`
- `readRemoteFile(path)` — uses `runRemote`, `cleanOutput`, `shQuote`
- `writeRemoteFile(path, content)` — uses `runRemote`, `shQuote`
- `createRemoteBackup(path, label)` — uses `runRemote`, `shQuote`, `nowStamp`, `backupLabel`, `basenameFromPath`, `cleanOutput`
- `listRemoteBackups(path, limit)` — uses `runRemote`, `shQuote`, `basenameFromPath`, `cleanOutput`
- `restoreRemoteBackup(path, backupPath)` — uses `runRemote`, `shQuote`
- `safeWriteRemoteFile(path, content, options)` — uses the above + `runRemote` for restart

All function signatures remain identical. Only import paths change.

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/viktorbruhis/Documents/vbrs/Dev/xkeen-manager && npx tsc --noEmit src/lib/files.ts`

- [ ] **Step 3: Commit**

```bash
git add src/lib/files.ts
git commit -m "refactor: extract lib/files.ts from monolith"
```

---

### Task 5: Extract `lib/profiles.ts`

Extract profile metadata operations.

**Files:**
- Create: `src/lib/profiles.ts`
- Reference: `src/xkeen-manager.tsx:132-146` (types), `337-365` (readProfileMeta, writeProfileMeta), `485-491` (validateProfileName)

- [ ] **Step 1: Create `src/lib/profiles.ts`**

Port these types and functions:

```ts
import { readRemoteFile, writeRemoteFile } from "./files";
import { tryParseJson } from "./json";

export type ProfileMeta = {
  name: string;
  createdAt?: string;
  updatedAt?: string;
  lastAppliedAt?: string;
  lastKnownGood?: boolean;
  sourceProfile?: string;
};

export function validateProfileName(name: string): string | null {
  if (!name) return "Profile name is required";
  if (name.length > 128) return "Profile name is too long (max 128)";
  if (name === "." || name === "..") return "Invalid profile name";
  if (/[/\0]/.test(name)) return "Profile name cannot contain '/' or null byte";
  return null;
}

export async function readProfileMeta(profilesDir: string, profileName: string): Promise<ProfileMeta | null> {
  // ... port from monolith lines 337-349
}

export async function writeProfileMeta(profilesDir: string, profileName: string, patch: Partial<ProfileMeta>): Promise<void> {
  // ... port from monolith lines 351-365
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/viktorbruhis/Documents/vbrs/Dev/xkeen-manager && npx tsc --noEmit src/lib/profiles.ts`

- [ ] **Step 3: Commit**

```bash
git add src/lib/profiles.ts
git commit -m "refactor: extract lib/profiles.ts from monolith"
```

---

### Task 6: Extract `lib/health.ts`

Extract health check and the new combined startup call.

**Files:**
- Create: `src/lib/health.ts`
- Reference: `src/xkeen-manager.tsx:148-155` (HealthSnapshot type), `367-406` (verifyTrafficPath, loadHealthSnapshot)
- Spec: Section 2.1 (combined SSH startup call)

- [ ] **Step 1: Create `src/lib/health.ts`**

Port `HealthSnapshot`, `TrafficVerification` types, and `verifyTrafficPath()`. Replace the old `loadHealthSnapshot()` with the new `loadStartupData()` which combines status + health into a single SSH call.

Add the new `loadStartupData()` function per spec section 2.1:

```ts
import { runRemote } from "./ssh";
import { getPaths, shQuote, cleanOutput, parseKeyValueLines, extractIpv4, fetchIp } from "./utils";

export type StartupData = {
  statusRaw: string;
  optMounted: boolean;
  optWritable: boolean;
  optFreeMb: string;
  xkeenAvailable: boolean;
  uptime: string;
  activeProfile: string;
};

export type TrafficVerification = {
  directIp: string | null;
  exitIp: string | null;
  vpnActive: boolean;
};

export type HealthSnapshot = {
  optMounted: boolean;
  optWritable: boolean;
  optFreeMb: string;
  xkeenAvailable: boolean;
  uptime: string;
  activeProfile: string;
};

export async function loadStartupData(): Promise<StartupData> {
  const { profilesDir } = getPaths();
  const qProfilesDir = shQuote(profilesDir);
  const { stdout, stderr } = await runRemote(
    `PROFILES_DIR=${qProfilesDir}; ` +
    `STATUS_RAW=$(xkeen -status 2>&1 || true); ` +
    `OPT_MOUNTED=$(mount | grep -q " on /opt " && echo yes || echo no); ` +
    `OPT_WRITABLE=$([ -w /opt ] && echo yes || echo no); ` +
    `OPT_FREE_MB=$(df -Pm /opt 2>/dev/null | awk 'NR==2{print $4}'); ` +
    `XKEEN_AVAILABLE=$(command -v xkeen >/dev/null 2>&1 && echo yes || echo no); ` +
    `UPTIME=$(uptime 2>/dev/null | tr -s " " || echo "unknown"); ` +
    `ACTIVE_PROFILE=$([ -f "$PROFILES_DIR/.active" ] && cat "$PROFILES_DIR/.active" || echo unknown); ` +
    `echo "___STATUS_START___"; echo "$STATUS_RAW"; echo "___STATUS_END___"; ` +
    `echo "OPT_MOUNTED=$OPT_MOUNTED"; ` +
    `echo "OPT_WRITABLE=$OPT_WRITABLE"; ` +
    `echo "OPT_FREE_MB=$OPT_FREE_MB"; ` +
    `echo "XKEEN_AVAILABLE=$XKEEN_AVAILABLE"; ` +
    `echo "UPTIME=$UPTIME"; ` +
    `echo "ACTIVE_PROFILE=$ACTIVE_PROFILE";`
  );

  const output = cleanOutput(stdout, stderr).text;
  const statusMatch = output.match(/___STATUS_START___([\s\S]*?)___STATUS_END___/);
  const statusRaw = statusMatch ? statusMatch[1].trim() : output;
  const afterStatus = output.split("___STATUS_END___")[1] || "";
  const kv = parseKeyValueLines(afterStatus);

  return {
    statusRaw,
    optMounted: kv.OPT_MOUNTED === "yes",
    optWritable: kv.OPT_WRITABLE === "yes",
    optFreeMb: kv.OPT_FREE_MB || "unknown",
    xkeenAvailable: kv.XKEEN_AVAILABLE === "yes",
    uptime: kv.UPTIME || "unknown",
    activeProfile: kv.ACTIVE_PROFILE || "unknown",
  };
}

export async function verifyTrafficPath(): Promise<TrafficVerification> {
  // ... port from monolith lines 367-377, using fetchIp and runRemote
}

export function formatTrafficVerification(v: TrafficVerification): string {
  const direct = v.directIp ?? "?";
  const exit = v.exitIp ?? "?";
  return v.vpnActive ? `VPN OK (${direct} -> ${exit})` : `Direct/Bypass (${direct} -> ${exit})`;
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/viktorbruhis/Documents/vbrs/Dev/xkeen-manager && npx tsc --noEmit src/lib/health.ts`

- [ ] **Step 3: Commit**

```bash
git add src/lib/health.ts
git commit -m "refactor: extract lib/health.ts with combined startup call"
```

---

### Task 7: Create `lib/routing.ts` — category parsing and text-based insertion

This is the most complex new module. Implements spec sections 4.1, 4.3, 4.4.

**Files:**
- Create: `src/lib/routing.ts`
- Reference: Spec sections 4.1 (category parsing), 4.3 (auto-creation), 4.4 (text-based insertion)
- Reference: User's routing file at `/Users/viktorbruhis/Documents/vbrs/Network setup/VPN/05_routing.json` for format examples

- [ ] **Step 1: Create `src/lib/routing.ts` with `parseRoutingCategories`**

```ts
import { stripJsonComments, tryParseJson } from "./json";

export type RoutingCategory = {
  index: number;
  number: number;
  title: string;
  outboundTag: string;
  field: "domain" | "ip" | "ruleSet";
  charStart: number;
  charEnd: number;
};

const CATEGORY_HEADER = /\/\/\s*=+\s*\n\s*\/\/\s*(\d+)\.\s*(.+?)\s*\n\s*\/\/\s*=+/g;

export function parseRoutingCategories(rawText: string): RoutingCategory[] {
  const categories: RoutingCategory[] = [];
  let match: RegExpExecArray | null;
  let ruleIndex = 0;

  // Reset regex state
  CATEGORY_HEADER.lastIndex = 0;

  while ((match = CATEGORY_HEADER.exec(rawText)) !== null) {
    const number = parseInt(match[1], 10);
    const title = match[2].trim();
    const afterHeader = match.index + match[0].length;

    // Find the next '{' after the header
    const braceStart = rawText.indexOf("{", afterHeader);
    if (braceStart === -1) continue;

    // Find matching '}' using bracket counter respecting strings
    const braceEnd = findMatchingBrace(rawText, braceStart);
    if (braceEnd === -1) continue;

    const ruleText = rawText.slice(braceStart, braceEnd + 1);

    // Extract outboundTag
    const tagMatch = ruleText.match(/"outboundTag"\s*:\s*"([^"]+)"/);
    if (!tagMatch) continue;
    const outboundTag = tagMatch[1];

    // Detect field: domain > ip > ruleSet
    let field: "domain" | "ip" | "ruleSet" = "domain";
    if (/"domain"\s*:/.test(ruleText)) field = "domain";
    else if (/"ip"\s*:/.test(ruleText)) field = "ip";
    else if (/"ruleSet"\s*:/.test(ruleText)) field = "ruleSet";

    categories.push({
      index: ruleIndex,
      number,
      title,
      outboundTag,
      field,
      charStart: braceStart,
      charEnd: braceEnd,
    });
    ruleIndex++;
  }

  return categories;
}

function findMatchingBrace(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escape = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = start; i < text.length; i++) {
    const c = text[i];
    const next = i + 1 < text.length ? text[i + 1] : "";

    if (inLineComment) {
      if (c === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (c === "*" && next === "/") { inBlockComment = false; i++; }
      continue;
    }
    if (inString) {
      if (escape) { escape = false; continue; }
      if (c === "\\") { escape = true; continue; }
      if (c === '"') inString = false;
      continue;
    }
    if (c === "/" && next === "/") { inLineComment = true; i++; continue; }
    if (c === "/" && next === "*") { inBlockComment = true; i++; continue; }
    if (c === '"') { inString = true; continue; }
    if (c === "{" || c === "[") depth++;
    if (c === "}" || c === "]") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
```

- [ ] **Step 2: Add `insertDomainsIntoCategory` — text-based insertion**

```ts
export function insertDomainsIntoCategory(
  rawText: string,
  category: RoutingCategory,
  values: string[],
): string {
  if (values.length === 0) return rawText;

  const ruleText = rawText.slice(category.charStart, category.charEnd + 1);
  const fieldKey = `"${category.field}"`;
  const fieldPos = ruleText.indexOf(fieldKey);
  if (fieldPos === -1) return rawText;

  // Find the '[' after the field key
  const bracketStart = ruleText.indexOf("[", fieldPos);
  if (bracketStart === -1) return rawText;

  // Find matching ']'
  const bracketEnd = findMatchingBrace(ruleText, bracketStart);
  if (bracketEnd === -1) return rawText;

  const arrayContent = ruleText.slice(bracketStart + 1, bracketEnd).trim();
  const absoluteBracketEnd = category.charStart + bracketEnd;

  // Detect indent from existing entries or use 10 spaces
  const existingEntryMatch = ruleText.slice(bracketStart, bracketEnd).match(/\n(\s+)"/);
  const indent = existingEntryMatch ? existingEntryMatch[1] : "          ";

  const formatted = values.map((v) => `${indent}"${v}"`).join(",\n");

  if (arrayContent === "") {
    // Empty array: []
    const insertPoint = category.charStart + bracketStart + 1;
    return rawText.slice(0, insertPoint) + "\n" + formatted + "\n" + indent.slice(0, -2) + rawText.slice(absoluteBracketEnd);
  } else {
    // Non-empty array: insert before closing ]
    const insertPoint = absoluteBracketEnd;
    return rawText.slice(0, insertPoint) + ",\n" + formatted + rawText.slice(insertPoint);
  }
}
```

- [ ] **Step 3: Add `createRaycastCategory` — auto-creation**

```ts
export function createRaycastCategory(rawText: string, categories: RoutingCategory[]): string {
  const maxNum = categories.reduce((max, c) => Math.max(max, c.number), 0);
  const newNum = maxNum + 1;

  const newBlock =
    `\n      // ============================================================\n` +
    `      // ${newNum}. VPN по доменам — добавлено через Raycast\n` +
    `      // ============================================================\n` +
    `      {\n` +
    `        "type": "field",\n` +
    `        "inboundTag": ["redirect", "tproxy", "mixed"],\n` +
    `        "outboundTag": "vless-reality",\n` +
    `        "domain": []\n` +
    `      },\n`;

  // Find the last two rules (catch-all) — insert before them
  // Look for the last occurrence of '}' followed by another rule block
  // Strategy: find the second-to-last '{' that starts a rule with "outboundTag": "direct"
  const stripped = stripJsonComments(rawText);
  const parsed = tryParseJson(stripped);
  if (!parsed.ok) return rawText + newBlock; // fallback

  const rules = parsed.value?.routing?.rules;
  if (!Array.isArray(rules) || rules.length < 2) return rawText + newBlock;

  // Find where the last two catch-all rules start in raw text
  // Scan backward for the comment header of the second-to-last category
  const lastCategoryWithComment = [...categories].reverse().find(
    (c) => c.outboundTag === "direct"
  );

  if (lastCategoryWithComment) {
    // Insert before this category's comment header
    // Find the comment block before charStart
    const beforeRule = rawText.lastIndexOf("// ===", lastCategoryWithComment.charStart);
    if (beforeRule !== -1) {
      // Find start of this line
      const lineStart = rawText.lastIndexOf("\n", beforeRule);
      const insertAt = lineStart !== -1 ? lineStart : beforeRule;
      return rawText.slice(0, insertAt) + newBlock + rawText.slice(insertAt);
    }
  }

  // Fallback: insert before the last ']' of rules array
  const lastBracket = rawText.lastIndexOf("]");
  if (lastBracket !== -1) {
    return rawText.slice(0, lastBracket) + newBlock + rawText.slice(lastBracket);
  }

  return rawText;
}

export function findRaycastCategory(categories: RoutingCategory[]): RoutingCategory | null {
  return categories.find((c) => /raycast/i.test(c.title)) ?? null;
}
```

- [ ] **Step 4: Add normalization functions**

Port the existing normalization functions from monolith (lines 673-728):
- `normalizeDomainToken`
- `normalizeGeositeToken`
- `normalizeGeoipToken`
- `normalizeRuleSetToken` (lines 705-709)
- `splitInputs`

Also remove these functions from the monolith (no longer needed with category-based approach):
- `uniqAppend` (line 718)
- `getDefaultInboundTagsForRouting` (line 730)
- `findPrimaryRuleIndex` (line 739)
- `isCatchAllRoutingRule` (line 766)
- `isBroadDirectGeoipRule` (line 776)
- `findInsertIndexForRaycastRules` (line 785)

- [ ] **Step 5: Verify the file compiles**

Run: `cd /Users/viktorbruhis/Documents/vbrs/Dev/xkeen-manager && npx tsc --noEmit src/lib/routing.ts`

- [ ] **Step 6: Commit**

```bash
git add src/lib/routing.ts
git commit -m "feat: add lib/routing.ts with category parsing and text-based insertion"
```

---

### Task 8: Extract straight-port components

Move UI components that don't change logic — just update import paths.

**Files:**
- Create: `src/components/LogsDetail.tsx`
- Create: `src/components/HealthDetail.tsx`
- Create: `src/components/IpDetail.tsx`
- Create: `src/components/BackupsHub.tsx`
- Create: `src/components/ProfilesList.tsx`
- Reference: `src/xkeen-manager.tsx:1472-1789` (LogsDetail, RestartDetail, IpDetail, HealthDetail, BackupsForFileList, BackupsHub), `1145-1465` (CreateProfileForm, RenameProfileForm, ProfilesList)

- [ ] **Step 1: Create `src/components/LogsDetail.tsx`**

Port `LogsDetail` (lines 1472-1503) and `RestartDetail` (lines 1505-1534). Update imports:
- `runRemote` from `../lib/ssh`
- `cleanOutput`, `mdCode` from `../lib/utils`

- [ ] **Step 2: Create `src/components/IpDetail.tsx`**

Port `IpDetail` (lines 1537-1611). Update imports:
- `runRemote` from `../lib/ssh`
- `fetchIp`, `parseSshJson`, `mdCode` from `../lib/utils`

- [ ] **Step 3: Create `src/components/HealthDetail.tsx`**

Port `HealthDetail` (lines 1613-1671). Update imports:
- `loadStartupData` from `../lib/health` (use `loadStartupData` to populate HealthSnapshot, since `loadHealthSnapshot` is now part of it)

- [ ] **Step 4: Create `src/components/BackupsHub.tsx`**

Port `BackupsForFileList` (lines 1673-1741) and `BackupsHub` (lines 1743-1789). Update imports:
- `listRemoteBackups`, `restoreRemoteBackup` from `../lib/files`
- `runRemote` from `../lib/ssh`
- `basenameFromPath`, `getPaths`, `mdCode` from `../lib/utils`

- [ ] **Step 5: Create `src/components/ProfilesList.tsx`**

Port `ProfilesList` (lines 1275-1465), `CreateProfileForm` (lines 1145-1221), `RenameProfileForm` (lines 1223-1273). Update imports:
- `runRemote` from `../lib/ssh`
- `readProfileMeta`, `writeProfileMeta`, `validateProfileName` from `../lib/profiles`
- `createRemoteBackup`, `restoreRemoteBackup` from `../lib/files`
- `verifyTrafficPath`, `formatTrafficVerification` from `../lib/health`
- `shQuote`, `cleanOutput`, `getPaths`, `parseErrorMessage`, `shortDate`, `mdCode` from `../lib/utils`

- [ ] **Step 6: Verify all components compile**

Run: `cd /Users/viktorbruhis/Documents/vbrs/Dev/xkeen-manager && npx tsc --noEmit`

- [ ] **Step 7: Commit**

```bash
git add src/components/
git commit -m "refactor: extract straight-port components from monolith"
```

---

### Task 9: Create `components/JsonEditor.tsx` — with comment preservation fix

Port the JSON editor but apply the comment preservation fix from spec section 5.

**Files:**
- Create: `src/components/JsonEditor.tsx`
- Reference: `src/xkeen-manager.tsx:928-1143` (JsonFileEditor)
- Spec: Section 5 (comment preservation)

- [ ] **Step 1: Create `src/components/JsonEditor.tsx`**

Port `JsonFileEditor` with these changes:
- In `load()`: display raw text from `readRemoteFile()` directly. Do NOT call `prettyJsonOrOriginalForPath()`.
- In `saveContent()`: validate via `stripJsonComments` → `JSON.parse`, then write raw text (with comments) using `safeWriteRemoteFile`.
- Replace `buildQuickDiff` action with a simple "N lines changed" message using `countChangedLines` from `lib/json.ts`.
- Remove all references to `sanitizeConfigForSave`, `prettyJsonOrOriginalForPath`, `addRoutingRaycastBlockComments`.
- Keep: backup/rollback actions, reload action, preview action, outbounds profile sync logic.

```ts
// Key change in load():
async function load() {
  setIsLoading(true);
  try {
    const txt = await readRemoteFile(props.path);
    // Show raw text with comments — do NOT parse and stringify
    setContent(txt);
    setOriginalContent(txt);
  } catch (e: any) {
    setContent(e?.message ?? String(e));
    setOriginalContent("");
  } finally {
    setIsLoading(false);
  }
}

// Key change in save — validate only, write raw:
async function saveContent(rawContent: string, restartAfterWrite: boolean) {
  const parsed = tryParseJson(rawContent); // uses stripJsonComments internally
  if (!parsed.ok) {
    await showToast({ style: Toast.Style.Failure, title: "Invalid JSON", message: parsed.error.slice(0, 160) });
    return;
  }
  const errs = validateXrayJson(props.path, parsed.value);
  if (errs.length) {
    await showToast({ style: Toast.Style.Failure, title: "Validation failed", message: errs.slice(0, 2).join("; ") });
    return;
  }
  // Write raw content WITH comments
  await safeWriteRemoteFile(props.path, rawContent, {
    backupTag: isRoutingPath(props.path) ? "routing-edit" : "outbounds-edit",
    restartAfterWrite,
    // ... keep afterWrite profile sync logic for outbounds
  });
  // ...
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/viktorbruhis/Documents/vbrs/Dev/xkeen-manager && npx tsc --noEmit src/components/JsonEditor.tsx`

- [ ] **Step 3: Commit**

```bash
git add src/components/JsonEditor.tsx
git commit -m "refactor: extract JsonEditor with comment preservation"
```

---

### Task 10: Create `components/QuickAddForm.tsx` — new implementation

Build the new Quick Add form with category dropdown per spec section 4.

**Files:**
- Create: `src/components/QuickAddForm.tsx`
- Reference: Spec section 4.2 (UI), 4.3 (auto-creation)
- Uses: `lib/routing.ts` (parseRoutingCategories, insertDomainsIntoCategory, createRaycastCategory, findRaycastCategory, normalization functions)

- [ ] **Step 1: Create `src/components/QuickAddForm.tsx`**

```tsx
import { Action, ActionPanel, Form, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { readRemoteFile, safeWriteRemoteFile } from "../lib/files";
import { tryParseJson } from "../lib/json";
import {
  parseRoutingCategories,
  insertDomainsIntoCategory,
  createRaycastCategory,
  findRaycastCategory,
  normalizeDomainToken,
  normalizeGeoipToken,
  normalizeRuleSetToken,
  splitInputs,
  type RoutingCategory,
} from "../lib/routing";
import { getPaths } from "../lib/utils";

const RAYCAST_CATEGORY_LABEL = "Ручные домены (Raycast)";

export function QuickAddForm(props: { onAfterSave?: () => void }) {
  const { configDir } = getPaths();
  const routingPath = `${configDir}/05_routing.json`;
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<RoutingCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("__raycast__");
  const [rawText, setRawText] = useState("");

  async function loadCategories() {
    setIsLoading(true);
    try {
      const text = await readRemoteFile(routingPath);
      setRawText(text);
      const parsed = parseRoutingCategories(text);
      setCategories(parsed);
    } catch (e: any) {
      await showToast({ style: Toast.Style.Failure, title: "Load failed", message: e?.message });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void loadCategories(); }, []);

  async function onSubmit(values: { input: string }) {
    const input = (values.input || "").trim();
    if (!input) {
      await showToast({ style: Toast.Style.Failure, title: "Nothing to add" });
      return;
    }
    setIsLoading(true);
    try {
      let text = rawText;
      let cats = categories;

      let targetCategory: RoutingCategory | null = null;

      if (selectedCategory === "__raycast__") {
        targetCategory = findRaycastCategory(cats);
        if (!targetCategory) {
          text = createRaycastCategory(text, cats);
          cats = parseRoutingCategories(text);
          targetCategory = findRaycastCategory(cats);
        }
      } else {
        const idx = parseInt(selectedCategory, 10);
        targetCategory = cats.find((c) => c.number === idx) ?? null;
      }

      if (!targetCategory) {
        await showToast({ style: Toast.Style.Failure, title: "Category not found" });
        return;
      }

      // Select normalizer based on category field type
      const normalizer = targetCategory.field === "ip" ? normalizeGeoipToken
        : targetCategory.field === "ruleSet" ? normalizeRuleSetToken
        : normalizeDomainToken;
      const tokens = splitInputs(input)
        .map(normalizer)
        .filter(Boolean) as string[];

      if (tokens.length === 0) {
        await showToast({ style: Toast.Style.Failure, title: "No valid entries" });
        return;
      }

      const updated = insertDomainsIntoCategory(text, targetCategory, tokens);

      // Validate result
      const parsed = tryParseJson(updated);
      if (!parsed.ok) {
        await showToast({ style: Toast.Style.Failure, title: "Result invalid JSON", message: parsed.error.slice(0, 160) });
        return;
      }

      await safeWriteRemoteFile(routingPath, updated, { backupTag: "quick-add" });
      await showToast({
        style: Toast.Style.Success,
        title: "Added",
        message: `${tokens.length} entries → ${targetCategory.title}`,
      });
      props.onAfterSave?.();
      // Reload categories with updated text
      setRawText(updated);
      setCategories(parseRoutingCategories(updated));
    } catch (e: any) {
      await showToast({ style: Toast.Style.Failure, title: "Failed", message: e?.message ?? String(e) });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Apply" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="category" title="Category" value={selectedCategory} onChange={setSelectedCategory}>
        <Form.Dropdown.Item key="__raycast__" value="__raycast__" title={RAYCAST_CATEGORY_LABEL} />
        {categories.map((c) => (
          <Form.Dropdown.Item
            key={String(c.number)}
            value={String(c.number)}
            title={`${c.number}. ${c.title}`}
          />
        ))}
      </Form.Dropdown>
      <Form.TextArea id="input" title="Domains" placeholder="example.com, another.com (one per line or comma-separated)" />
      <Form.Description text={`File: ${routingPath}`} />
    </Form>
  );
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/viktorbruhis/Documents/vbrs/Dev/xkeen-manager && npx tsc --noEmit src/components/QuickAddForm.tsx`

- [ ] **Step 3: Commit**

```bash
git add src/components/QuickAddForm.tsx
git commit -m "feat: add QuickAddForm with category dropdown"
```

---

### Task 11: Rewrite main `xkeen-manager.tsx`

Replace the monolith with a slim main component that imports modules.

**Files:**
- Rewrite: `src/xkeen-manager.tsx`
- Delete: `src/ssh.ts`
- Spec: Section 3 (main screen), Section 7 (crash alert)

- [ ] **Step 1: Rewrite `src/xkeen-manager.tsx`**

```tsx
import {
  Action, ActionPanel, Color, Icon, List, Toast, showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { runRemote } from "./lib/ssh";
import { loadStartupData, verifyTrafficPath, type StartupData } from "./lib/health";
import { getPaths } from "./lib/utils";
import { QuickAddForm } from "./components/QuickAddForm";
import { JsonEditor } from "./components/JsonEditor";
import { ProfilesList } from "./components/ProfilesList";
import { HealthDetail } from "./components/HealthDetail";
import { IpDetail } from "./components/IpDetail";
import { LogsDetail, RestartDetail } from "./components/LogsDetail";
import { BackupsHub } from "./components/BackupsHub";

export default function XkeenManager() {
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [activeProfile, setActiveProfile] = useState("unknown");
  const [healthPreview, setHealthPreview] = useState("");
  const [hasPendingConfigChanges, setHasPendingConfigChanges] = useState(false);
  const { configDir } = getPaths();

  async function loadAll() {
    setIsLoading(true);
    try {
      const data = await loadStartupData();
      setStatus(data.statusRaw);
      setActiveProfile(data.activeProfile);
      const marks = [
        data.optMounted ? "OPT: OK" : "OPT: FAIL",
        data.xkeenAvailable ? "XKEEN: OK" : "XKEEN: FAIL",
      ];
      setHealthPreview(marks.join(" | "));

      // Crash alert (spec section 7)
      const isStopped = /не запущен|stopped|not running/i.test(data.statusRaw);
      if (isStopped) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Xkeen не запущен!",
          message: `Последний профиль: ${data.activeProfile}`,
        });
      }
    } catch (e: any) {
      setStatus(e?.message ?? String(e));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void loadAll(); }, []);

  const isStopped = /не запущен|stopped|not running/i.test(status);
  const isRunning = !isStopped && /запущен|running/i.test(status);
  const modeMatch = status.match(/(?:режиме|mode)[\s\W]*([a-zA-Z0-9_-]+)/i);
  const mode = modeMatch ? modeMatch[1] : "Unknown";
  const statusSubtitle = isRunning
    ? `Запущен (${mode}) · ${activeProfile}`
    : "Остановлен";

  async function restart() {
    await showToast({ style: Toast.Style.Animated, title: "Restarting..." });
    await runRemote("xkeen -restart");
    await showToast({ style: Toast.Style.Success, title: "Restarted" });
    setHasPendingConfigChanges(false);
    await loadAll();
  }

  async function start() {
    await showToast({ style: Toast.Style.Animated, title: "Starting..." });
    await runRemote("xkeen -start");
    await showToast({ style: Toast.Style.Success, title: "Started" });
    setHasPendingConfigChanges(false);
    await loadAll();
  }

  async function stop() {
    await showToast({ style: Toast.Style.Animated, title: "Stopping..." });
    await runRemote("xkeen -stop");
    await showToast({ style: Toast.Style.Success, title: "Stopped" });
    setHasPendingConfigChanges(false);
    await loadAll();
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="xkeen…">
      {/* Section: Xkeen */}
      <List.Section title="Xkeen">
        <List.Item
          title="Status"
          subtitle={statusSubtitle}
          icon={{ source: Icon.Heartbeat, tintColor: isRunning ? Color.Green : Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Refresh Status" icon={Icon.RotateClockwise} onAction={loadAll} />
              {!isRunning && <Action title="Start Client" icon={{ source: Icon.Play, tintColor: Color.Green }} onAction={start} />}
              {isRunning && <Action title="Stop Client" icon={{ source: Icon.Stop, tintColor: Color.Red }} onAction={stop} />}
              <Action title="Restart Client" icon={Icon.RotateClockwise} onAction={restart} />
              <Action.Push title="Show Logs" icon={Icon.Text} target={<LogsDetail />} />
              <Action.Push title="IP Check" icon={Icon.Globe} target={<IpDetail />} />
              <Action.Push title="Outbounds Editor" icon={Icon.ArrowRight} target={
                <JsonEditor title="04_outbounds.json" path={`${configDir}/04_outbounds.json`}
                  onAfterSave={(r) => { void loadAll(); setHasPendingConfigChanges(!r?.restarted); }} />
              } />
              <Action.Push title="Backups & Rollback" icon={Icon.Folder} target={
                <BackupsHub onAfterRestore={() => { setHasPendingConfigChanges(false); void loadAll(); }} />
              } />
            </ActionPanel>
          }
        />
        <List.Item
          title="Restart"
          subtitle={hasPendingConfigChanges ? "Есть несохранённые изменения" : "Перезапуск клиента"}
          icon={Icon.RotateClockwise}
          actions={
            <ActionPanel>
              <Action title="Restart Xkeen" style={Action.Style.Destructive} onAction={restart} />
              <Action.Push title="Restart (Show Output)" target={<RestartDetail onDone={loadAll} />} />
            </ActionPanel>
          }
        />
      </List.Section>

      {/* Section: Routing */}
      <List.Section title="Routing">
        <List.Item
          title="Quick Add"
          subtitle="Добавить домен в маршрутизацию"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.Push title="Open Quick Add" target={
                <QuickAddForm onAfterSave={() => { setHasPendingConfigChanges(true); void loadAll(); }} />
              } />
            </ActionPanel>
          }
        />
        <List.Item
          title="Routing Editor"
          subtitle="05_routing.json"
          icon={Icon.List}
          actions={
            <ActionPanel>
              <Action.Push title="Edit Routing" target={
                <JsonEditor title="05_routing.json" path={`${configDir}/05_routing.json`}
                  onAfterSave={(r) => { void loadAll(); setHasPendingConfigChanges(!r?.restarted); }} />
              } />
            </ActionPanel>
          }
        />
      </List.Section>

      {/* Section: Manage */}
      <List.Section title="Manage">
        <List.Item
          title="Profiles"
          subtitle={activeProfile}
          icon={Icon.Switch}
          actions={
            <ActionPanel>
              <Action.Push title="Open Profiles" target={
                <ProfilesList onSwitched={() => { setHasPendingConfigChanges(false); void loadAll(); }} />
              } />
            </ActionPanel>
          }
        />
        <List.Item
          title="Health"
          subtitle={healthPreview}
          icon={Icon.Shield}
          actions={
            <ActionPanel>
              <Action.Push title="Open Health Check" target={<HealthDetail />} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
```

- [ ] **Step 2: Delete unused `src/ssh.ts` (if it exists)**

Remove the old unused SSH wrapper file. If it doesn't exist, skip this step.

- [ ] **Step 3: Verify full project compiles**

Run: `cd /Users/viktorbruhis/Documents/vbrs/Dev/xkeen-manager && npx tsc --noEmit`

Fix any remaining import issues.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: rewrite main component, delete old monolith and unused ssh.ts"
```

---

### Task 12: Build and smoke test

Verify the extension builds and runs in Raycast.

**Files:**
- All files from tasks 1-11

- [ ] **Step 1: Run the Raycast build**

Run: `cd /Users/viktorbruhis/Documents/vbrs/Dev/xkeen-manager && npm run build`

Expected: Build succeeds with no errors.

- [ ] **Step 2: Run lint**

Run: `cd /Users/viktorbruhis/Documents/vbrs/Dev/xkeen-manager && npm run lint`

Fix any lint errors.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build and lint issues"
```

- [ ] **Step 4: Manual smoke test checklist**

Verify in Raycast:
- [ ] Extension opens, shows 6 items in 3 sections
- [ ] Status loads in ~1-2 seconds (single SSH call)
- [ ] Status shows profile name and mode
- [ ] Crash alert toast appears if xkeen is stopped
- [ ] Quick Add opens, shows category dropdown with parsed categories
- [ ] Quick Add "Ручные домены" option works and creates category block
- [ ] Routing Editor shows comments in the file
- [ ] Routing Editor preserves comments on save
- [ ] Profiles list works (switch, create, delete)
- [ ] Cmd+K on Status row shows IP, Outbounds, Backups, Logs
- [ ] Health detail works
- [ ] Restart works
