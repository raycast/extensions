import type { UsageState } from "../agents/types";
import type { OpencodegoUsage, OpencodegoError } from "./types";
import { parseOpencodegoHtml } from "./parser";

function buildUrl(workspaceId: string): string {
  const id = workspaceId.trim();
  const fullId = id.startsWith("wrk_") ? id : `wrk_${id}`;
  return `https://opencode.ai/workspace/${fullId}/go`;
}

async function fetchOpencodegoPage(
  url: string,
  authCookie: string,
): Promise<{ html: string | null; error: OpencodegoError | null }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Cookie: `auth=${authCookie.trim()}`,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 401 || response.status === 403) {
      return {
        html: null,
        error: {
          type: "unauthorized",
          message:
            "OpenCode Go session expired or invalid. Please update your auth cookie in extension settings (Cmd+,).",
        },
      };
    }

    if (response.redirected && response.url.includes("/login")) {
      return {
        html: null,
        error: {
          type: "unauthorized",
          message: "OpenCode Go session expired. Please update your auth cookie in extension settings (Cmd+,).",
        },
      };
    }

    if (!response.ok) {
      return {
        html: null,
        error: {
          type: "unknown",
          message: `HTTP ${response.status}: ${response.statusText}`,
        },
      };
    }

    const html = await response.text();
    return { html, error: null };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      return {
        html: null,
        error: { type: "network_error", message: "Request timeout. Please check your network connection." },
      };
    }
    return {
      html: null,
      error: {
        type: "network_error",
        message: err instanceof Error ? err.message : "Network request failed",
      },
    };
  }
}

export async function fetchOpencodegoUsage(
  workspaceId: string,
  authCookie: string,
): Promise<{ usage: OpencodegoUsage | null; error: OpencodegoError | null }> {
  const url = buildUrl(workspaceId);
  const { html, error: fetchError } = await fetchOpencodegoPage(url, authCookie);

  if (fetchError) return { usage: null, error: fetchError };
  if (!html) return { usage: null, error: { type: "unknown", message: "No HTML response received" } };

  return parseOpencodegoHtml(html);
}

export function useOpencodegoUsage(enabled = true): UsageState<OpencodegoUsage, OpencodegoError> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getPreferenceValues: getPrefs } = require("@raycast/api") as typeof import("@raycast/api");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useCachedPromise } = require("@raycast/utils") as typeof import("@raycast/utils");

  const preferences = getPrefs<Preferences.AgentUsage>();
  const workspaceId = (preferences.opencodegoWorkspaceId as string)?.trim() || "";
  const authCookie = (preferences.opencodegoAuthCookie as string)?.trim() || "";

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useCallback } = require("react") as typeof import("react");

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { fetchTtlCache, getTtlMs } = require("../agents/hooks") as typeof import("../agents/hooks");

  const ttlKey = "ttl-opencodego";
  const lastFetched = Number(fetchTtlCache.get(ttlKey)) || 0;
  const isStale = Date.now() - lastFetched > getTtlMs();

  const fetcherFn = useCallback(async (wId: string, aCookie: string) => {
    fetchTtlCache.set(ttlKey, String(Date.now()));
    if (!wId && !aCookie) {
      return {
        usage: null,
        error: {
          type: "not_configured",
          message:
            "OpenCode Go workspace ID and auth cookie not configured. Please add them in extension settings (Cmd+,).",
        } as OpencodegoError,
        timestamp: Date.now(),
      };
    }
    if (!wId) {
      return {
        usage: null,
        error: {
          type: "not_configured",
          message: "OpenCode Go workspace ID not configured. Please add it in extension settings (Cmd+,).",
        } as OpencodegoError,
        timestamp: Date.now(),
      };
    }
    if (!aCookie) {
      return {
        usage: null,
        error: {
          type: "not_configured",
          message: "OpenCode Go auth cookie not configured. Please add it in extension settings (Cmd+,).",
        } as OpencodegoError,
        timestamp: Date.now(),
      };
    }
    const result = await fetchOpencodegoUsage(wId, aCookie);
    return { ...result, timestamp: Date.now() };
  }, [ttlKey]);

  const { data, isLoading, mutate } = useCachedPromise(
    fetcherFn,
    [workspaceId, authCookie],
    { execute: enabled && isStale, initialData: { usage: null, error: null, timestamp: 0 } },
  );

  return {
    isLoading: enabled ? (data?.usage ? false : isLoading) : false,
    usage: enabled && data ? data.usage : null,
    error: enabled && data ? data.error : null,
    revalidate: async () => {
      await mutate();
    },
    lastFetchedAt: data?.timestamp,
  };
}
