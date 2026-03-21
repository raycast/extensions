import { useState, useEffect, useRef } from "react";
import { fetchGranolaData, getSharedDocuments } from "./fetchData";
import { NoteData, Doc } from "./types";
import { toError } from "./errorUtils";

function isNoteData(data: unknown): data is NoteData {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.isLoading !== "boolean") return false;
  if (!("data" in obj)) return false;
  if (typeof obj.revalidate !== "function") return false;
  if (obj.data !== undefined && obj.data !== null) {
    if (typeof obj.data !== "object") return false;
    const responseData = obj.data as Record<string, unknown>;
    if ("docs" in responseData && responseData.docs !== undefined && !Array.isArray(responseData.docs)) return false;
    if ("deleted" in responseData && responseData.deleted !== undefined && !Array.isArray(responseData.deleted))
      return false;
  }
  return true;
}

export interface GranolaDataState {
  noteData: NoteData | null;
  isLoading: boolean;
  hasError: boolean;
  error?: Error;
}

/**
 * Shared hook for loading Granola notes from API
 * Fetches both owned and shared documents in parallel
 */
export function useGranolaData(): GranolaDataState {
  const [sharedDocs, setSharedDocs] = useState<Doc[] | null>(null);
  const sharedFetchStarted = useRef(false);

  let fetchResult: unknown;
  let fetchError: Error | undefined;

  try {
    fetchResult = fetchGranolaData("get-documents");
  } catch (error) {
    fetchError = toError(error);
  }

  const isValidData = fetchResult && isNoteData(fetchResult);
  const noteData: NoteData | null = isValidData ? (fetchResult as NoteData) : null;
  const ownedDocs = noteData?.data?.docs || [];

  useEffect(() => {
    if (sharedFetchStarted.current) return;
    sharedFetchStarted.current = true;

    let cancelled = false;
    getSharedDocuments()
      .then((docs) => !cancelled && setSharedDocs(docs))
      .catch(() => !cancelled && setSharedDocs([]));

    return () => {
      cancelled = true;
    };
  }, []);

  if (fetchError) {
    return { noteData: null, isLoading: false, hasError: true, error: fetchError };
  }

  if (!isValidData || !noteData) {
    return {
      noteData: null,
      isLoading: false,
      hasError: true,
      error: new Error("Invalid data shape returned from Granola API. Expected NoteData structure."),
    };
  }

  if (noteData.isLoading) {
    return { noteData, isLoading: true, hasError: false };
  }

  if (!noteData.data) {
    return { noteData, isLoading: false, hasError: true, error: new Error("No data available") };
  }

  // Merge and deduplicate: owned docs take precedence over shared docs
  const ownedDocIds = new Set(ownedDocs.map((doc) => doc.id));
  const uniqueSharedDocs = (sharedDocs || []).filter((doc) => !ownedDocIds.has(doc.id));
  const mergedDocs = [...ownedDocs, ...uniqueSharedDocs];

  const mergedNoteData: NoteData = {
    ...noteData,
    data: { ...noteData.data, docs: mergedDocs },
  };

  return { noteData: mergedNoteData, isLoading: false, hasError: false };
}
