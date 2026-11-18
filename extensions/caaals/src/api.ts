import { getPreferenceValues, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import type {
  AnalyzeTextResponse,
  AIFoodAnalysisResult,
  CopyMealInput,
  DailySummary,
  DiaryEntry,
  DiaryEntryFromSnapshotInput,
  DiaryEntryInput,
  Food,
  TokenBalance,
  UpdateDiaryEntryInput,
  UserProfile,
  WeightEntry,
  WeightStats,
} from "./types";

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

// ============================================
// AI Analysis
// ============================================

export async function analyzeText(description: string): Promise<AnalyzeTextResponse> {
  const response = await apiFetch<{ data: AIFoodAnalysisResult; tokenBalance?: TokenBalance }>("/foods/analyze/text", {
    method: "POST",
    body: { description },
  });
  return { result: response.data, tokenBalance: response.tokenBalance };
}

// ============================================
// Diary
// ============================================

export async function getDiaryByDate(date: string, opts?: { quiet?: boolean }): Promise<DailySummary> {
  const result = await apiFetch<{ data: DailySummary }>(`/diary?date=${encodeURIComponent(date)}`, opts);
  return result.data;
}

/** Fetch a whole date range in one request (unlike getDiaryByDate's single day). */
export async function getDiarySummary(from: string, to: string): Promise<DailySummary[]> {
  const result = await apiFetch<{ data: DailySummary[] }>(
    `/diary/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
  return result.data;
}

export async function createDiaryEntry(data: DiaryEntryInput): Promise<DiaryEntry> {
  const result = await apiFetch<{ data: DiaryEntry }>("/diary", {
    method: "POST",
    body: {
      food_id: data.foodId,
      serving_id: data.servingId,
      quantity: data.quantity,
      meal: data.meal,
      logged_at: data.loggedAt,
    },
  });
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
      ...(data.aiAnalysisId ? { ai_analysis_id: data.aiAnalysisId } : {}),
    },
  });
  return result.data;
}

export async function updateDiaryEntry(id: string, data: UpdateDiaryEntryInput): Promise<DiaryEntry> {
  const result = await apiFetch<{ data: DiaryEntry }>(`/diary/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: {
      ...(data.servingId !== undefined ? { serving_id: data.servingId } : {}),
      ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
      ...(data.meal !== undefined ? { meal: data.meal } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
  });
  return result.data;
}

/** Server-side "copy yesterday's meal" — duplicates snapshots, costs no AI tokens. */
export async function copyMeal(data: CopyMealInput): Promise<DiaryEntry[]> {
  const result = await apiFetch<{ data: DiaryEntry[] }>("/diary/copy", {
    method: "POST",
    body: { from_date: data.fromDate, to_date: data.toDate, meal: data.meal },
  });
  return result.data;
}

export async function deleteDiaryEntry(id: string): Promise<void> {
  await apiFetch(`/diary/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ============================================
// Foods (recents + favorites)
// ============================================

export async function getRecentFoods(): Promise<Food[]> {
  const result = await apiFetch<{ data: Food[] }>("/foods/recent");
  return result.data;
}

export async function getFavoriteFoods(): Promise<Food[]> {
  const result = await apiFetch<{ data: Food[] }>("/foods/favorites");
  return result.data;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function addFavorite(food: Food): Promise<void> {
  // Cached foods are keyed by UUID; AI/custom foods by their 16-hex food key
  // and need the snapshot in the body.
  await apiFetch(`/foods/${encodeURIComponent(food.id)}/favorite`, {
    method: "POST",
    body: UUID_RE.test(food.id) ? undefined : { food },
  });
}

export async function removeFavorite(idOrKey: string): Promise<void> {
  await apiFetch(`/foods/${encodeURIComponent(idOrKey)}/favorite`, { method: "DELETE" });
}

/**
 * Log a food the way the mobile app does: cached foods (UUID id) go through
 * POST /diary; AI/custom foods carry their snapshot through /diary/from-snapshot.
 */
export async function logFood(
  food: Food,
  opts: {
    foodKey?: string | null;
    servingId: string;
    quantity: number;
    meal: DiaryEntryInput["meal"];
    loggedAt: string;
  },
): Promise<DiaryEntry> {
  const foodKey = opts.foodKey ?? food.id;
  if (food.source === "ai" || food.source === "custom" || foodKey !== food.id || !UUID_RE.test(foodKey)) {
    return createDiaryFromSnapshot({ ...opts, food, foodKey });
  }
  return createDiaryEntry({ foodId: food.id, ...opts });
}

// ============================================
// User + Weight
// ============================================

export async function getProfile(): Promise<UserProfile> {
  const result = await apiFetch<{ data: UserProfile }>("/user/profile");
  return result.data;
}

export async function getWeightStats(): Promise<WeightStats> {
  const result = await apiFetch<{ data: WeightStats }>("/weight/stats");
  return result.data;
}

export async function logWeight(data: { weightKg: number; bodyFatPct?: number; note?: string }): Promise<WeightEntry> {
  const result = await apiFetch<{ data: WeightEntry }>("/weight", {
    method: "POST",
    body: {
      weight_kg: data.weightKg,
      ...(data.bodyFatPct !== undefined ? { body_fat_pct: data.bodyFatPct } : {}),
      ...(data.note ? { note: data.note } : {}),
      logged_at: new Date().toISOString(),
    },
  });
  return result.data;
}
