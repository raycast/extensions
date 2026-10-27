import {
  Color,
  environment,
  getPreferenceValues,
  LocalStorage,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useRef } from "react";
import { createDemoFetch } from "./demo/fetch";
import { AuthError, createClient, OutsetaClient } from "./outseta/client";
import { StatusColor } from "./outseta/format";

let client: OutsetaClient | undefined;

export function getSubdomain(): string {
  return getPreferenceValues<Preferences>().subdomain.trim().toLowerCase();
}

export function isDemo(): boolean {
  return getSubdomain() === "demo";
}

export function getAgentName(): string {
  return (getPreferenceValues<Preferences>().agentName ?? "").trim();
}

export function getClient(): OutsetaClient {
  if (!client) {
    const { apiKey, secretKey } = getPreferenceValues<Preferences>();
    const credentials = { subdomain: getSubdomain(), apiKey: apiKey.trim(), secretKey };
    const agentName = getAgentName();
    // Demo replies stay in memory, so they need no guard.
    client = isDemo()
      ? createClient(credentials, { agentName, fetch: createDemoFetch() })
      : createClient(credentials, { agentName, guardWrite });
  }
  return client;
}

// API keys have full admin access and the developer's only account is a live one, so in
// development every write must target a case explicitly allowed with allowDevWrites. Raycast
// doesn't pass shell environment variables to extensions, hence LocalStorage.
const DEV_WRITE_ALLOWLIST_KEY = "dev-write-allowlist";

async function devWriteAllowlist(): Promise<string[]> {
  const stored = await LocalStorage.getItem<string>(DEV_WRITE_ALLOWLIST_KEY);
  return stored ? (JSON.parse(stored) as string[]) : [];
}

async function guardWrite(description: string, caseUid: string) {
  if (!environment.isDevelopment) return;
  if (!(await devWriteAllowlist()).includes(caseUid)) {
    throw new Error(`Development guard: ${description} blocked. Run "Allow Replies to This Case (Dev)" first.`);
  }
}

export async function allowDevWrites(caseUid: string) {
  const allowlist = new Set(await devWriteAllowlist());
  allowlist.add(caseUid);
  await LocalStorage.setItem(DEV_WRITE_ALLOWLIST_KEY, JSON.stringify([...allowlist]));
}

// useCachedPromise reports hasMore for a cached first page, so Raycast asks for the next page while
// the first is still loading. Only the latest request is kept, so an empty next page then replaces
// the whole list. Ignore those requests: the ref sees loading that started after the last render.
export function useSettledPagination<T extends { hasMore: boolean; onLoadMore: () => void }>(
  pagination: T | undefined,
  isLoading: boolean,
) {
  const loading = useRef(isLoading);
  loading.current = isLoading;
  return (
    pagination && {
      ...pagination,
      hasMore: pagination.hasMore && !isLoading,
      onLoadMore: () => {
        if (!loading.current) pagination.onLoadMore();
      },
    }
  );
}

export function toRaycastColor(color: StatusColor): Color {
  switch (color) {
    case "green":
      return Color.Green;
    case "yellow":
      return Color.Yellow;
    case "orange":
      return Color.Orange;
    case "red":
      return Color.Red;
    default:
      return Color.SecondaryText;
  }
}

export async function showErrorToast(error: unknown, title = "Outseta request failed") {
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof AuthError) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid Outseta credentials",
      message,
      primaryAction: { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() },
    });
    return;
  }
  await showToast({ style: Toast.Style.Failure, title, message });
}
