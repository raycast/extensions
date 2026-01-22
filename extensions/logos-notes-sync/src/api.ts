import { LocalStorage } from "@raycast/api";
import { LogosNote, NotesApiResponse, AuthTokens } from "./types";
import { log, logError } from "./logger";

const NOTES_API_BASE = "https://app.logos.com/api/app/notes-api";
const AUTH_STORAGE_KEY = "faithlife-auth-tokens";

export async function getStoredTokens(): Promise<AuthTokens | null> {
  const stored = await LocalStorage.getItem<string>(AUTH_STORAGE_KEY);
  if (!stored) return null;

  try {
    const tokens = JSON.parse(stored) as AuthTokens;
    // Check if expired
    if (tokens.expiresAt && tokens.expiresAt < Date.now()) {
      await LocalStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    return tokens;
  } catch {
    return null;
  }
}

export async function storeTokens(tokens: AuthTokens): Promise<void> {
  await LocalStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(tokens));
}

export async function clearTokens(): Promise<void> {
  await LocalStorage.removeItem(AUTH_STORAGE_KEY);
}

export async function isAuthenticated(): Promise<boolean> {
  const tokens = await getStoredTokens();
  return tokens !== null;
}

export async function fetchAllNotes(onProgress?: (fetched: number, total: number) => void): Promise<LogosNote[]> {
  log("fetchAllNotes: Starting");

  const tokens = await getStoredTokens();
  if (!tokens) {
    log("fetchAllNotes: No tokens found");
    throw new Error("Not authenticated. Please login first.");
  }
  log("fetchAllNotes: Got tokens", { tokenLength: tokens.accessToken.length });

  const allNotes: LogosNote[] = [];
  let nextKey: string | null = null;
  let total = 0;
  let pageNum = 0;

  do {
    pageNum++;
    log(`fetchAllNotes: Fetching page ${pageNum}, nextKey: ${nextKey}`);

    try {
      const response = await fetchNotesPage(tokens, nextKey);
      log(
        `fetchAllNotes: Page ${pageNum} returned ${response.notes.length} notes, total: ${response.noteTotal}, moreNotes: ${response.moreNotes}`,
      );

      allNotes.push(...response.notes);
      nextKey = response.moreNotes ? response.nextNoteKey : null;
      total = response.noteTotal;

      if (onProgress) {
        onProgress(allNotes.length, total);
      }
    } catch (error) {
      logError(`fetchAllNotes: Error on page ${pageNum}`, error);
      throw error;
    }
  } while (nextKey);

  log(`fetchAllNotes: Complete. Total notes fetched: ${allNotes.length}`);
  return allNotes;
}

async function fetchNotesPage(tokens: AuthTokens, startKey: string | null = null): Promise<NotesApiResponse> {
  const url = `${NOTES_API_BASE}/notes/find`;

  // The start parameter must be an object with a 'noteKey' field, or null for the first page
  const startParam = startKey ? { noteKey: startKey } : null;

  const payload = {
    request: {
      start: startParam,
      sort: "modifiedDesc",
      filters: [],
      filterNoteIds: null,
      query: null,
      facetFindText: null,
      previousNoteLimit: 100,
      noteLimit: 100,
      facets: [
        { field: "noteKind" },
        { field: "anchorResource", termLimit: 30 },
        { field: "anchorBibleBook", termLimit: 120 },
        { field: "anchorDataType", termLimit: 30 },
      ],
      noteTotalField: true,
      noteFields: [
        "id",
        "revision",
        "created",
        "createdBy",
        "modified",
        "isTrashed",
        "isDeleted",
        "noteKind",
        "content",
        "style",
        "anchors",
        "tags",
      ],
      tzoMinutes: new Date().getTimezoneOffset(),
      userLanguage: "en-US",
    },
  };

  log("fetchNotesPage: Making request", { url, startKey, startParam });

  // Use cookie-based authentication (the auth cookie from app.logos.com)
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Origin: "https://app.logos.com",
        Referer: "https://app.logos.com/tools/notes",
        Cookie: `auth=${tokens.accessToken}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (fetchError) {
    logError("fetchNotesPage: Fetch failed", fetchError);
    throw fetchError;
  }

  log(`fetchNotesPage: Response status ${response.status}`);

  if (!response.ok) {
    const errorBody = await response.text();
    logError(`fetchNotesPage: API error ${response.status}`, errorBody);

    if (response.status === 401 || response.status === 403) {
      await clearTokens();
      throw new Error("Authentication expired. Please login again.");
    }
    throw new Error(`API error: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  const jsonData = await response.json();
  log("fetchNotesPage: Success", {
    notesCount: jsonData.notes?.length,
    moreNotes: jsonData.moreNotes,
    noteTotal: jsonData.noteTotal,
  });

  return jsonData as NotesApiResponse;
}
