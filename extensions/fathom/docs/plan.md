# Raycast Fathom Extension — Streamlined Plan & Roadmap

This is the authoritative plan. It emphasizes getting OAuth right first, follows Raycast best practices, and includes embedded code where helpful.

---

## 0. Critical Path: OAuth That Actually Works

Use `OAuthService` + `withAccessToken` from `@raycast/utils` (not rolling your own) so Raycast handles token storage, refresh, and auth UI. This ensures you don’t hit subtle edge-cases.

```ts
// src/fathom/auth.ts
import { OAuth } from "@raycast/api";
import { OAuthService, withAccessToken, getAccessToken } from "@raycast/utils";

export const fathomClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Fathom",
  providerIcon: "icon.png",
  providerId: "fathom",
  description: "Connect your Fathom account",
});

const OAUTH = {
  clientId: process.env.FATHOM_CLIENT_ID || "",
  scope: [
    "meetings:read",
    "teams:read",
    "transcripts:read",
    "summaries:read",
    "users:read",
  ].join(" "),
  authorizeUrl: "https://YOUR-FATHOM-AUTH/authorize", // confirm with Fathom
  tokenUrl: "https://YOUR-FATHOM-AUTH/token",         // confirm with Fathom
};

export const fathomOAuth = new OAuthService({
  client: fathomClient,
  clientId: OAUTH.clientId,
  scope: OAUTH.scope,
  authorizeUrl: OAUTH.authorizeUrl,
  tokenUrl: OAUTH.tokenUrl,
  onAuthorize({ token }) {
    // optionally warm SDK or logs
  },
});

export function withFathom<T>(Component: React.ComponentType<T>) {
  return withAccessToken<T>(fathomOAuth)(Component);
}

export function getFathomAccessToken() {
  const { token } = getAccessToken();
  return token;
}
```

---

## 1. Commands & Scope (Simplified)

- Commands to keep:
  1. `search-meetings`
  2. `search-teams`
  3. `search-team-members`
  4. `search-recordings`
- **Remove** standalone `export-transcripts` command.
  - Instead, make “Export Transcript” an **action** on the meeting or recording item.  
- Preferences:
  - Export format (`md` / `txt`)  
  - Default export directory  
  - OAuth client ID / scopes  
  - Default meeting type filter  

---

## 2. UX & Raycast / AI Best Practices

- **Error / Failure UX**  
  - Use `showFailureToast` for standardized error UI.  
  - Fall back to cached data rather than blank screens.
- **Loading / State**  
  - Always show `isLoading` on List/Detail components during fetch.  
  - Use `ActionPanels` cleanly; avoid nesting too deeply.
- **Forms / Validation**  
  - Use `useForm` for export dialogs or advanced filters.  
- **AI extension safety**  
  - Confirm destructive actions (e.g. overwrite exports).  
  - Provide undo, or at least warnings, consistent with AI UX best practices.

---

## 3. Data Layer & API Abstraction

- `api.ts` should be the only file handling fetch to Fathom; UI never imports SDK types or raw HTTP.  
- Use `withCache` (from `@raycast/utils`) for hot fetches.  
- Example:

```ts
// src/fathom/api.ts
import { withCache, showFailureToast } from "@raycast/utils";
import { getFathomAccessToken } from "./auth";

const BASE_URL = "https://api.fathom.ai";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getFathomAccessToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    await showFailureToast(`Fathom request failed: ${res.status}`);
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export const listMeetings = withCache(
  async (params: { q?: string; cursor?: string | null; limit?: number; filters?: Record<string, unknown> }) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.cursor) qs.set("cursor", params.cursor);
    if (params.limit) qs.set("limit", String(params.limit));
    return fetchJson<{ items: any[]; nextCursor: string | null }>(`/meetings?${qs.toString()}`);
  },
  {
    cacheKey: (p) => `meetings:${JSON.stringify(p)}`,
    ttl: 30_000,
  }
);
```

---

## 4. Example Command with OAuth Protection

```ts
// src/commands/search-meetings.tsx
import { List, Icon } from "@raycast/api";
import { useDebouncedValue, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { withFathom } from "../fathom/auth";
import { listMeetings } from "../fathom/api";

function Command() {
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const debounced = useDebouncedValue(q, 300);

  const { data, isLoading } = useCachedPromise(
    (dq, c) => listMeetings({ q: dq, cursor: c, limit: 25 }),
    [debounced, cursor],
    { keepPreviousData: true }
  );

  const items = data?.items ?? [];
  return (
    <List isLoading={isLoading} onSearchTextChange={setQ} throttle searchBarPlaceholder="Search meetings…">
      {items.map((m) => (
        <List.Item
          key={m.id}
          title={m.title ?? "Untitled"}
          accessories={[
            m.date ? { text: new Date(m.date).toLocaleString() } : undefined,
            m.hasRecording ? { icon: Icon.Waveform } : undefined,
          ].filter(Boolean)}
          actions={
            <List.ActionPanel>
              {m.webUrl && <List.Action.OpenInBrowser url={m.webUrl} />}
              <List.Action
                title="Export Transcript"
                onAction={() => {
                  /* push export form with useForm validation */
                }}
              />
            </List.ActionPanel>
          }
        />
      ))}
      {data?.nextCursor && (
        <List.Item
          key="more"
          title="Load more…"
          icon={Icon.ArrowDown}
          actions={<List.ActionPanel><List.Action title="Load More" onAction={() => setCursor(data.nextCursor)} /></List.ActionPanel>}
        />
      )}
    </List>
  );
}

export default withFathom(Command);
```

---

## 5. Filter UX Strategy

- Use a simple `searchBar` dropdown for **Type** (All / Internal / External).  
- For more advanced filtering (invitees, domains, recordedBy, teams), provide an `Action.Push` into a **Filter Editor form**.  

---

## 6. Export Flow (Inline, Safe)

- Provide “Export Transcript” via an **action** on a meeting/recording item.
- In that form:
  - `Form.FilePicker` for directory  
  - Format dropdown (md / txt)  
  - Confirmation prompt if file exists  
- On success:
  - Toast “Exported to /path/filename”  
  - Optionally open the folder  

---

## 7. Caching, Retries & Resilience

- `useCachedPromise` + `keepPreviousData = true` prevents flicker.  
- `withCache` for fetch-level caching.  
- On 429, use exponential backoff + fallback to cached results.  
- On 401/403, trigger reconnect / auth UI gracefully.  

---

## 8. Documentation & Evaluation

- Single root `README.md` with a link to `docs/plan.md`.  
- `docs/plan.md` holds the diagrams.  
- `AI.yaml` should include evals for:
  1. OAuth connect flow  
  2. Token expiry / refresh  
  3. Export overwrite confirmation  

---

## 9. Condensed Milestones

1. OAuth end‑to‑end working  
2. Client & API wrapper  
3. Search Meetings UI + inline export action  
4. Recordings with metadata  
5. Teams / Team Members navigation  
6. Polish UX (errors, cache, overwrite, icons)  
7. Docs + AI evals  

---

## 10. Repo Adjustments

- Replace PKCE logic with `OAuthService` + `withAccessToken`.  
- Drop standalone export command.  
- Add `Filter Editor` via `Action.Push`.  
- Add confirmation logic in export form.  
- Centralize OAuth URLs & scopes in `constants.ts`.  
- Add icons early.  
- Use `showFailureToast` everywhere.  

---

## OAuth Preconditions Checklist

- [ ] Fathom client ID, authorize URL, token URL confirmed  
- [ ] Raycast redirect URI registered with Fathom  
- [ ] Confirm Fathom scope names  
- [ ] If PKCE not supported, configure via Raycast PKCE Proxy  
- [ ] Verify token refresh behavior  
- [ ] Validate UI flows for Connect, Reconnect, Logout  

---
