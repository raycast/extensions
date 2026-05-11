import { getPreferenceValues, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import type { AIFoodAnalysisResult, DailySummary, DiaryEntry, DiaryEntryFromSnapshotInput } from "./types";

const API_BASE_PATH = "/api/v1";

interface FetchOptions {
  method?: string;
  body?: unknown;
  quiet?: boolean;
}

async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { method = "GET", body, quiet = false } = opts;
  const prefs = getPreferenceValues<Preferences>();
  const baseUrl = prefs.apiUrl.replace(/\/+$/, "");
  const url = `${baseUrl}${API_BASE_PATH}${path}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${prefs.apiToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Request timed out — the server took too long to respond");
    }
    throw err;
  }
  clearTimeout(timeoutId);

  if (res.status === 401) {
    if (!quiet) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Authentication Failed",
        message: "Your API token may be expired. Regenerate it in the Caaals app.",
        primaryAction: {
          title: "Open Preferences",
          onAction: () => openExtensionPreferences(),
        },
      });
    }
    throw new Error("Authentication failed");
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    const message =
      (errorBody as { error?: { message?: string } })?.error?.message ??
      (errorBody as { message?: string })?.message ??
      `Request failed (${res.status})`;
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function analyzeText(description: string): Promise<AIFoodAnalysisResult> {
  const result = await apiFetch<{ data: AIFoodAnalysisResult }>("/foods/analyze/text", {
    method: "POST",
    body: { description },
  });
  return result.data;
}

export async function getDiaryByDate(date: string, opts?: { quiet?: boolean }): Promise<DailySummary> {
  const result = await apiFetch<{ data: DailySummary }>(`/diary?date=${encodeURIComponent(date)}`, opts);
  return result.data;
}

export async function createDiaryFromSnapshot(data: DiaryEntryFromSnapshotInput): Promise<DiaryEntry> {
  const result = await apiFetch<{ data: DiaryEntry }>("/diary/from-snapshot", {
    method: "POST",
    body: {
      food: data.food,
      food_key: data.foodKey,
      serving_id: data.servingId,
      quantity: data.quantity,
      meal: data.meal,
      logged_at: data.loggedAt,
    },
  });
  return result.data;
}

export async function deleteDiaryEntry(id: string): Promise<void> {
  await apiFetch(`/diary/${encodeURIComponent(id)}`, { method: "DELETE" });
}
