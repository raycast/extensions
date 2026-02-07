# Kimi Agent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Kimi agent support with usage tracking via the Kimi billing API.

**Architecture:** Follow existing pattern (codex/droid/gemini): types → fetcher → renderer → integrate into agent-usage.tsx. Uses authorization header for API authentication, displays weekly usage and rate limit details.

**Tech Stack:** TypeScript, React, Raycast API

---

### Task 1: Add Kimi Icon to Assets

**Files:**
- Create: `assets/kimi-icon.ico` (user provided)

**Step 1: Copy the icon file**

The icon file `assets/kimi-icon.ico` is already provided by user.

**Step 2: Verify icon exists**

Run: `ls -la assets/kimi-icon.ico`
Expected: File exists

**Step 3: Commit**

```bash
git add assets/kimi-icon.ico
git commit -m "feat(kimi): add kimi icon"
```

---

### Task 2: Create Kimi Types

**Files:**
- Create: `src/kimi/types.ts`

**Step 1: Create types file**

```typescript
export interface KimiUsage {
  weeklyUsage: {
    limit: number;
    used: number;
    remaining: number;
    resetTime: string;
  };
  rateLimit: {
    windowMinutes: number;
    limit: number;
    used: number;
    remaining: number;
    resetTime: string;
  };
}

export interface KimiError {
  type: "not_configured" | "unauthorized" | "network_error" | "parse_error" | "unknown";
  message: string;
}
```

**Step 2: Verify no syntax errors**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/kimi/types.ts
git commit -m "feat(kimi): add type definitions"
```

---

### Task 3: Create Kimi Fetcher

**Files:**
- Create: `src/kimi/fetcher.ts`

**Step 1: Create fetcher with hook**

```typescript
import { useState, useEffect, useCallback } from "react";
import { getPreferenceValues } from "@raycast/api";
import { KimiUsage, KimiError } from "./types";

const KIMI_USAGE_API = "https://www.kimi.com/apiv2/kimi.gateway.billing.v1.BillingService/GetUsages";
const REQUEST_TIMEOUT = 10000;

type Preferences = Preferences.AgentUsage;

async function fetchKimiUsage(token: string): Promise<{ usage: KimiUsage | null; error: KimiError | null }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const authHeader = token.startsWith("Bearer ") ? token : `Bearer ${token}`;

    const response = await fetch(KIMI_USAGE_API, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 401) {
      return {
        usage: null,
        error: {
          type: "unauthorized",
          message: "Authorization token expired or invalid. Please update it in extension settings.",
        },
      };
    }

    if (!response.ok) {
      return {
        usage: null,
        error: {
          type: "unknown",
          message: `HTTP ${response.status}: ${response.statusText}`,
        },
      };
    }

    const data = await response.json();
    return parseKimiApiResponse(data);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        usage: null,
        error: {
          type: "network_error",
          message: "Request timeout. Please check your network connection.",
        },
      };
    }

    return {
      usage: null,
      error: {
        type: "network_error",
        message: error instanceof Error ? error.message : "Network request failed",
      },
    };
  }
}

interface KimiApiResponse {
  usages?: Array<{
    scope?: string;
    detail?: {
      limit?: string;
      used?: string;
      remaining?: string;
      resetTime?: string;
    };
    limits?: Array<{
      window?: {
        duration?: number;
        timeUnit?: string;
      };
      detail?: {
        limit?: string;
        used?: string;
        remaining?: string;
        resetTime?: string;
      };
    }>;
  }>;
}

function parseKimiApiResponse(data: unknown): { usage: KimiUsage | null; error: KimiError | null } {
  try {
    if (!data || typeof data !== "object") {
      return {
        usage: null,
        error: {
          type: "parse_error",
          message: "Invalid API response format",
        },
      };
    }

    const response = data as KimiApiResponse;
    const codingUsage = response.usages?.find((u) => u.scope === "FEATURE_CODING");

    if (!codingUsage?.detail) {
      return {
        usage: null,
        error: {
          type: "parse_error",
          message: "Missing usage data in API response",
        },
      };
    }

    const weeklyDetail = codingUsage.detail;
    const rateLimitData = codingUsage.limits?.[0];

    const usage: KimiUsage = {
      weeklyUsage: {
        limit: parseInt(weeklyDetail.limit || "0", 10),
        used: parseInt(weeklyDetail.used || "0", 10),
        remaining: parseInt(weeklyDetail.remaining || "0", 10),
        resetTime: weeklyDetail.resetTime || "",
      },
      rateLimit: {
        windowMinutes: rateLimitData?.window?.duration || 0,
        limit: parseInt(rateLimitData?.detail?.limit || "0", 10),
        used: parseInt(rateLimitData?.detail?.used || "0", 10),
        remaining: parseInt(rateLimitData?.detail?.remaining || "0", 10),
        resetTime: rateLimitData?.detail?.resetTime || "",
      },
    };

    return { usage, error: null };
  } catch (error) {
    return {
      usage: null,
      error: {
        type: "parse_error",
        message: error instanceof Error ? error.message : "Failed to parse API response",
      },
    };
  }
}

export function formatResetTime(isoTime: string): string {
  if (!isoTime) return "Unknown";
  try {
    const resetDate = new Date(isoTime);
    const now = new Date();
    const diffMs = resetDate.getTime() - now.getTime();

    if (diffMs <= 0) return "Now";

    const diffSeconds = Math.floor(diffMs / 1000);
    if (diffSeconds < 60) return `${diffSeconds}s`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m`;
    if (diffSeconds < 86400) {
      const hours = Math.floor(diffSeconds / 3600);
      const mins = Math.floor((diffSeconds % 3600) / 60);
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    const days = Math.floor(diffSeconds / 86400);
    const hours = Math.floor((diffSeconds % 86400) / 3600);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  } catch {
    return "Unknown";
  }
}

export function useKimiUsage() {
  const [token, setToken] = useState<string>("");
  const [usage, setUsage] = useState<KimiUsage | null>(null);
  const [error, setError] = useState<KimiError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasInitialFetch, setHasInitialFetch] = useState<boolean>(false);

  useEffect(() => {
    const preferences = getPreferenceValues<Preferences>();
    const savedToken = preferences.kimiAuthToken?.trim() || "";
    setToken(savedToken);
  }, []);

  const fetchData = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      setHasInitialFetch(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await fetchKimiUsage(token);

    setUsage(result.usage);
    setError(result.error);
    setIsLoading(false);
    setHasInitialFetch(true);
  }, [token]);

  useEffect(() => {
    if (!hasInitialFetch && token) {
      fetchData();
    }
  }, [token, hasInitialFetch, fetchData]);

  const revalidate = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const finalError: KimiError | null =
    !token && hasInitialFetch
      ? {
          type: "not_configured",
          message: "Kimi token not configured. Please add it in extension settings (Cmd+,).",
        }
      : error;

  return {
    isLoading,
    usage,
    error: finalError,
    revalidate,
  };
}
```

**Step 2: Verify no syntax errors**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/kimi/fetcher.ts
git commit -m "feat(kimi): add usage fetcher hook"
```

---

### Task 4: Create Kimi Renderer

**Files:**
- Create: `src/kimi/renderer.tsx`

**Step 1: Create renderer with detail and accessory functions**

```typescript
import { List } from "@raycast/api";
import { KimiUsage, KimiError } from "./types";
import { formatResetTime } from "./fetcher";
import { renderErrorDetail, renderNoDataDetail, getLoadingAccessory, getNoDataAccessory } from "../agents/ui";

export function formatKimiUsageText(usage: KimiUsage | null, error: KimiError | null): string {
  if (error) {
    return `Kimi Usage\nStatus: Error\nType: ${error.type}\nMessage: ${error.message}`;
  }
  if (!usage) {
    return "Kimi Usage\nStatus: No data available";
  }

  let text = `Kimi Usage`;
  text += `\n\nWeekly Usage: ${usage.weeklyUsage.remaining}/${usage.weeklyUsage.limit} remaining`;
  text += `\nUsed: ${usage.weeklyUsage.used}`;
  text += `\nResets In: ${formatResetTime(usage.weeklyUsage.resetTime)}`;

  text += `\n\nRate Limit (${usage.rateLimit.windowMinutes}min): ${usage.rateLimit.remaining}/${usage.rateLimit.limit}`;
  text += `\nUsed: ${usage.rateLimit.used}`;
  text += `\nResets In: ${formatResetTime(usage.rateLimit.resetTime)}`;

  return text;
}

export function renderKimiDetail(usage: KimiUsage | null, error: KimiError | null): React.ReactNode {
  if (error) {
    return renderErrorDetail(error);
  }

  if (!usage) {
    return renderNoDataDetail();
  }

  const weeklyPercentage = usage.weeklyUsage.limit > 0 
    ? Math.round((usage.weeklyUsage.remaining / usage.weeklyUsage.limit) * 100) 
    : 0;

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Weekly Usage" text={`${usage.weeklyUsage.remaining}/${usage.weeklyUsage.limit} (${weeklyPercentage}%)`} />
      <List.Item.Detail.Metadata.Label title="Used This Week" text={`${usage.weeklyUsage.used}`} />
      <List.Item.Detail.Metadata.Label title="Resets In" text={formatResetTime(usage.weeklyUsage.resetTime)} />

      <List.Item.Detail.Metadata.Separator />

      <List.Item.Detail.Metadata.Label title={`Rate Limit (${usage.rateLimit.windowMinutes}min)`} text={`${usage.rateLimit.remaining}/${usage.rateLimit.limit}`} />
      <List.Item.Detail.Metadata.Label title="Used" text={`${usage.rateLimit.used}`} />
      <List.Item.Detail.Metadata.Label title="Resets In" text={formatResetTime(usage.rateLimit.resetTime)} />
    </List.Item.Detail.Metadata>
  );
}

export function getKimiAccessory(
  usage: KimiUsage | null,
  error: KimiError | null,
  isLoading: boolean,
): { text: string; tooltip?: string } {
  if (isLoading) {
    return getLoadingAccessory("Kimi");
  }

  if (error) {
    if (error.type === "not_configured") {
      return { text: "Not Configured", tooltip: error.message };
    }
    if (error.type === "unauthorized") {
      return { text: "Token Expired", tooltip: error.message };
    }
    if (error.type === "network_error") {
      return { text: "Network Error", tooltip: error.message };
    }
    return { text: "Error", tooltip: error.message };
  }

  if (!usage) {
    return getNoDataAccessory();
  }

  return {
    text: `${usage.weeklyUsage.remaining}/${usage.weeklyUsage.limit}`,
    tooltip: `Weekly: ${usage.weeklyUsage.remaining}/${usage.weeklyUsage.limit} | Rate: ${usage.rateLimit.remaining}/${usage.rateLimit.limit}`,
  };
}
```

**Step 2: Verify no syntax errors**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/kimi/renderer.tsx
git commit -m "feat(kimi): add usage renderer"
```

---

### Task 5: Update AgentId Type

**Files:**
- Modify: `src/agents/types.ts:1`

**Step 1: Add "kimi" to AgentId union**

Change:
```typescript
export type AgentId = "amp" | "codex" | "droid" | "gemini";
```

To:
```typescript
export type AgentId = "amp" | "codex" | "droid" | "gemini" | "kimi";
```

**Step 2: Verify no syntax errors**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/agents/types.ts
git commit -m "feat(kimi): add kimi to AgentId type"
```

---

### Task 6: Add Kimi Preference to package.json

**Files:**
- Modify: `package.json`

**Step 1: Add showKimi checkbox preference**

In `commands[0].preferences` array, after `showGemini`, add:
```json
{
  "name": "showKimi",
  "type": "checkbox",
  "label": "Show Kimi",
  "description": "Show Kimi usage in the list",
  "default": true,
  "required": false
}
```

**Step 2: Add kimiAuthToken preference**

After `droidAuthToken`, add:
```json
{
  "name": "kimiAuthToken",
  "type": "password",
  "title": "Kimi Authorization Token",
  "description": "From browser DevTools: Authorization header when accessing https://www.kimi.com/code/console. Format: 'Bearer eyJ...' or just 'eyJ...'",
  "required": false
}
```

**Step 3: Verify package.json is valid**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add package.json
git commit -m "feat(kimi): add preferences for visibility and auth token"
```

---

### Task 7: Integrate Kimi into agent-usage.tsx

**Files:**
- Modify: `src/agent-usage.tsx`

**Step 1: Add imports at top of file**

Add after line 11:
```typescript
import { useKimiUsage } from "./kimi/fetcher";
import { renderKimiDetail, getKimiAccessory, formatKimiUsageText } from "./kimi/renderer";
import { KimiError, KimiUsage } from "./kimi/types";
```

**Step 2: Add Kimi to AGENTS array**

After the Gemini entry (line 54), add:
```typescript
{
  id: "kimi",
  name: "Kimi",
  icon: "kimi-icon.ico",
  description: "Moonshot Kimi Code",
  isSupported: true,
  settingsUrl: "https://www.kimi.com/code/console?from=membership",
},
```

**Step 3: Add KimiUsageState to UsageStates interface**

Change interface at line 68-73:
```typescript
interface UsageStates {
  amp: UsageState<AmpUsage, AmpError>;
  codex: UsageState<CodexUsage, CodexError>;
  droid: UsageState<DroidUsage, DroidError>;
  gemini: UsageState<GeminiUsage, GeminiError>;
  kimi: UsageState<KimiUsage, KimiError>;
}
```

**Step 4: Add Kimi case in getAgentAccessory function**

After the gemini check (line 91-93), add:
```typescript
if (agent.id === "kimi") {
  return getKimiAccessory(kimi.usage, kimi.error, kimi.isLoading);
}
```

Also update destructuring at line 76 to include kimi:
```typescript
const { amp, codex, droid, gemini, kimi } = states;
```

**Step 5: Add Kimi case in renderAgentDetail function**

After gemini check (line 112-114), add:
```typescript
if (agent.id === "kimi" && agent.isSupported) {
  return renderKimiDetail(kimi.usage, kimi.error);
}
```

Also update destructuring at line 98 to include kimi:
```typescript
const { amp, codex, droid, gemini, kimi } = states;
```

**Step 6: Add Kimi case in getAgentCopyText function**

After gemini check (line 131-133), add:
```typescript
if (agent.id === "kimi") {
  return formatKimiUsageText(kimi.usage, kimi.error);
}
```

Also update destructuring at line 120 to include kimi:
```typescript
const { amp, codex, droid, gemini, kimi } = states;
```

**Step 7: Add useKimiUsage hook call in Command function**

After line 142 (geminiState), add:
```typescript
const kimiState: UsageState<KimiUsage, KimiError> = useKimiUsage();
```

**Step 8: Add kimi to visibilityMap**

Update visibilityMap (line 166-171) to include:
```typescript
kimi: prefs.showKimi,
```

**Step 9: Update isLoading to include kimiState**

Change line 178:
```typescript
const isLoading = ampState.isLoading || codexState.isLoading || droidState.isLoading || geminiState.isLoading || kimiState.isLoading;
```

**Step 10: Update handleRefresh to include kimiState.revalidate()**

Add `kimiState.revalidate()` to Promise.all array (line 181-186):
```typescript
await Promise.all([
  ampState.revalidate(),
  codexState.revalidate(),
  droidState.revalidate(),
  geminiState.revalidate(),
  kimiState.revalidate(),
]);
```

**Step 11: Add kimi to UsageStates objects passed to functions**

Update all four places where UsageStates is passed (lines 211-216, 217-222, 242-247):
Add `kimi: kimiState` to each object.

**Step 12: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 13: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 14: Commit**

```bash
git add src/agent-usage.tsx
git commit -m "feat(kimi): integrate kimi agent into usage view"
```

---

### Task 8: Final Verification

**Step 1: Full build**

Run: `npm run build`
Expected: Build succeeds

**Step 2: Lint check**

Run: `npm run lint`
Expected: No errors

**Step 3: Manual test in Raycast**

Run: `npm run dev`
Expected: Extension loads, Kimi appears in list with "Not Configured" status until token is added

**Step 4: Final commit if needed**

```bash
git add -A
git commit -m "feat(kimi): complete kimi agent integration"
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Add icon asset |
| 2 | Create types.ts |
| 3 | Create fetcher.ts with useKimiUsage hook |
| 4 | Create renderer.tsx |
| 5 | Update AgentId type |
| 6 | Add preferences to package.json |
| 7 | Integrate into agent-usage.tsx |
| 8 | Final verification |

**Files to create:**
- `src/kimi/types.ts`
- `src/kimi/fetcher.ts`
- `src/kimi/renderer.tsx`

**Files to modify:**
- `src/agents/types.ts`
- `src/agent-usage.tsx`
- `package.json`

**Assets:**
- `assets/kimi-icon.ico` (already provided)
