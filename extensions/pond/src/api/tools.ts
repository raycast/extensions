import type { ApiSave } from "pond-api";
import { saveTitle } from "../lib/display";
import { pond } from "./client";

/** Confirmations name up to this many saves; the rest are counted. */
const NAMED = 5;

/** Save IDs only mean something in their own library, so tools refuse to act after a switch. */
export async function requireLibrary(libraryId: string): Promise<void> {
  const info = await pond().libraryInfo();
  if (info.libraryId !== libraryId)
    throw new Error(
      `Pond switched to the ${info.name} library since these saves were found. Search again before changing them.`,
    );
}

export async function loadSaves(ids: readonly string[], libraryId: string): Promise<ApiSave[]> {
  if (!ids.length) throw new Error("Pass at least one save ID from Search Saves.");
  return pond().saves({ ids: [...ids], libraryId, includeDeleted: true });
}

export async function describeSaves(ids: readonly string[], libraryId: string): Promise<string> {
  const saves = await loadSaves(ids, libraryId).catch(() => []);
  const titles = saves.slice(0, NAMED).map((save) => saveTitle(save));
  const rest = ids.length - titles.length;
  if (!titles.length) return `${ids.length} saves`;
  return rest > 0 ? `${titles.join(", ")} and ${rest} more` : titles.join(", ");
}
