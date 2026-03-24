import { useFetch, showFailureToast } from "@raycast/utils";
import { useState, useEffect, useMemo } from "react";
import getAccessToken from "./getAccessToken";
import { isAbortError, toError, toErrorMessage } from "./errorUtils";
import {
  GetDocumentsResponse,
  TranscriptSegment,
  FoldersResponse,
  Document,
  RecipesApiResponse,
  RecipesListResult,
  Recipe,
  DefaultRecipe,
  Doc,
} from "./types";

/**
 * Strips large fields from documents to reduce memory usage
 * Removes notes_markdown and people fields that are loaded on-demand
 * Creates new objects to avoid keeping references to original data
 * This is called immediately when data arrives to prevent keeping full data in memory
 */
function stripLargeFields(docs: Document[]): Doc[] {
  return docs.map((doc) => ({
    id: doc.id,
    title: doc.title,
    created_at: doc.created_at,
    creation_source: doc.creation_source,
    public: doc.public,
    sharing_link_visibility: doc.sharing_link_visibility,
    // notes_markdown and people are intentionally excluded
  }));
}

const documentsByIdCache = new Map<string, Document>();

export function fetchGranolaData(route: string) {
  const [accessToken, setAccessToken] = useState<string | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    getAccessToken()
      .then((token) => {
        if (mounted) setAccessToken(token);
      })
      .catch((err) => {
        if (mounted) setError(new Error(`Failed to get access token, ${toErrorMessage(err)}`));
      });
    return () => {
      mounted = false;
    };
  }, []);

  const url = `https://api.granola.ai/v2/${route}`;

  // Use parseResponse to transform data BEFORE useFetch caches it
  // This ensures only stripped data is cached, reducing memory usage
  const { isLoading, data, revalidate } = useFetch<GetDocumentsResponse<Document | Doc>>(url, {
    headers: accessToken
      ? {
          Authorization: `Bearer ${accessToken}`,
        }
      : undefined,
    execute: !!accessToken,
    // parseResponse transforms data before caching - this is the key optimization!
    // Only apply to get-documents route which contains large fields
    ...(route === "get-documents" && {
      parseResponse: async (response: Response) => {
        if (!response.ok) {
          let errorText = "";
          try {
            errorText = await response.text();
          } catch {
            // Ignore read errors and fall back to status text
          }
          if (errorText) {
            try {
              const errorJson = JSON.parse(errorText) as { message?: string; error?: string };
              errorText = errorJson.message || errorJson.error || errorText;
            } catch {
              // Use raw text if parsing fails
            }
          }
          const statusText = response.statusText || "Request failed";
          const detail = errorText ? errorText : statusText;
          throw new Error(`API request failed with status ${response.status}: ${detail}`);
        }
        const json = (await response.json()) as GetDocumentsResponse<Document>;
        // Strip large fields immediately before caching
        if (json.docs && Array.isArray(json.docs)) {
          return {
            ...json,
            docs: stripLargeFields(json.docs),
          };
        }
        return json;
      },
    }),
  });

  // Fallback transformation if parseResponse is not supported
  // This ensures compatibility even if parseResponse doesn't work
  const transformedData = useMemo<GetDocumentsResponse<Doc> | undefined>(() => {
    // Only transform for get-documents route which contains large fields
    if (route !== "get-documents" || !data) {
      return data as GetDocumentsResponse<Doc> | undefined;
    }

    // If docs array exists, strip large fields immediately
    if (data.docs && Array.isArray(data.docs)) {
      const docs = data.docs as Array<Document | Doc>;
      const sampleDoc = docs[0];
      const alreadyStripped = !!sampleDoc && !("notes_markdown" in sampleDoc) && !("people" in sampleDoc);
      const strippedDocs = alreadyStripped ? (docs as Doc[]) : stripLargeFields(docs as Document[]);
      return {
        ...data,
        docs: strippedDocs,
      };
    }

    return data as GetDocumentsResponse<Doc>;
  }, [data, route]);

  if (error) {
    throw error;
  }

  // Return transformed data (or original if transformation not needed)
  // For get-documents, transformedData will have stripped fields
  // For other routes, transformedData === data
  return { isLoading: isLoading || !accessToken, data: transformedData, revalidate };
}

const TRANSCRIPT_NOT_FOUND_MESSAGE = "Transcript not available for this note.";

/**
 * Fetches raw transcript segments with timestamps for a document.
 * Use this when you need access to timing information (start/end timestamps).
 */
export async function getTranscriptSegments(docId: string): Promise<TranscriptSegment[]> {
  const url = `https://api.granola.ai/v1/get-document-transcript`;
  try {
    const token = await getAccessToken();
    const requestBody = { document_id: docId };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      let errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        errorText = errorJson.message || errorText;
      } catch (e) {
        // Use raw text if parsing fails
      }
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    const transcriptSegments = (await response.json()) as TranscriptSegment[];
    return transcriptSegments || [];
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    const normalizedError = toError(error);
    showFailureToast(normalizedError, { title: "Failed to Fetch Transcript Segments" });
    throw normalizedError;
  }
}

export async function getTranscript(docId: string): Promise<string> {
  try {
    const transcriptSegments = await getTranscriptSegments(docId);

    if (transcriptSegments.length === 0) {
      return TRANSCRIPT_NOT_FOUND_MESSAGE;
    }

    let formattedTranscript = "";
    transcriptSegments.forEach((segment) => {
      if (segment.source === "microphone") {
        formattedTranscript += `**Me:** ${segment.text}\n\n`;
      } else if (segment.source === "system") {
        formattedTranscript += `**System:** ${segment.text}\n\n`;
      } else {
        formattedTranscript += `${segment.text}\n\n`;
      }
    });
    return formattedTranscript.trim();
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    const normalizedError = toError(error);
    showFailureToast(normalizedError, { title: "Failed to Fetch Transcript" });
    throw normalizedError;
  }
}

export function formatDurationVerbose(durationMs: number): string {
  if (durationMs <= 0) return "";

  const totalMinutes = Math.floor(durationMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  }

  const hourPart = hours === 1 ? "1 hour" : `${hours} hours`;
  if (minutes === 0) {
    return hourPart;
  }

  const minutePart = minutes === 1 ? "1 minute" : `${minutes} minutes`;
  return `${hourPart} ${minutePart}`;
}

export function calculateDurationFromSegments(segments: TranscriptSegment[]): number | null {
  if (segments.length === 0) return null;

  const timestamps = segments
    .flatMap((seg) => [seg.start_timestamp, seg.end_timestamp])
    .filter((ts): ts is string => !!ts)
    .map((ts) => new Date(ts).getTime())
    .filter((t) => !isNaN(t));

  if (timestamps.length < 2) return null;

  const durationMs = Math.max(...timestamps) - Math.min(...timestamps);
  return durationMs > 0 ? durationMs : null;
}

export async function getMeetingDuration(docId: string): Promise<string | null> {
  try {
    const segments = await getTranscriptSegments(docId);
    const durationMs = calculateDurationFromSegments(segments);
    return durationMs ? formatDurationVerbose(durationMs) : null;
  } catch {
    return null;
  }
}

/**
 * Fetch the creator name for a document (used for shared documents).
 * Returns null if the creator cannot be determined.
 */
export async function getDocumentCreator(docId: string): Promise<string | null> {
  try {
    const token = await getAccessToken();
    const response = await fetch("https://api.granola.ai/v1/get-document-metadata", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ document_id: docId }),
    });

    if (!response.ok) {
      return null;
    }

    const meta = (await response.json()) as { creator?: { name?: string } };
    return meta.creator?.name || null;
  } catch {
    return null;
  }
}

export async function getFolders(signal?: AbortSignal): Promise<FoldersResponse> {
  const url = `https://api.granola.ai/v1/get-document-lists-metadata`;

  try {
    const token = await getAccessToken();
    const requestBody = {
      include_document_ids: true,
      include_only_joined_lists: false,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
      signal,
    });

    if (!response.ok) {
      let errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        errorText = errorJson.message || errorText;
      } catch (e) {
        // Use raw text if parsing fails
      }
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    const result = (await response.json()) as FoldersResponse;
    return result;
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    const normalizedError = toError(error);
    showFailureToast(normalizedError, { title: "Failed to Fetch Folders" });
    throw normalizedError;
  }
}

/**
 * Fetch the list of documents (notes) from the Granola API outside of React hooks.
 * Use this in tools and utilities where hooks are not available.
 */
export async function getDocumentsList(): Promise<Document[]> {
  const url = `https://api.granola.ai/v2/get-documents`;
  try {
    const token = await getAccessToken();
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      let errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        errorText = (errorJson as { message?: string }).message || errorText;
      } catch (e) {
        // ignore JSON parse errors and keep original errorText
        void e;
      }
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    const result = (await response.json()) as GetDocumentsResponse;
    return Array.isArray(result?.docs) ? (result.docs as Document[]) : [];
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    const normalizedError = toError(error);
    showFailureToast(normalizedError, { title: "Failed to Fetch Documents" });
    throw normalizedError;
  }
}

/**
 * Fetch documents shared with the user (not owned by them).
 * This includes both individually shared documents and documents from shared folders.
 */
export async function getSharedDocuments(): Promise<Doc[]> {
  const token = await getAccessToken();

  // Fetch individually shared documents and shared folder documents in parallel
  const [individuallyShared, fromSharedFolders] = await Promise.all([
    getIndividuallySharedDocuments(token),
    getDocumentsFromSharedFolders(),
  ]);

  // Merge and deduplicate by document ID
  const allSharedDocs = [...individuallyShared, ...fromSharedFolders];
  const uniqueDocs = new Map<string, Doc>();
  for (const doc of allSharedDocs) {
    if (!uniqueDocs.has(doc.id)) {
      uniqueDocs.set(doc.id, doc);
    }
  }

  return Array.from(uniqueDocs.values());
}

/**
 * Fetch documents that were individually shared with the user via the "shared with me" feature.
 */
async function getIndividuallySharedDocuments(token: string): Promise<Doc[]> {
  const url = `https://api.granola.ai/v1/get-document-set`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      return [];
    }

    const result = (await response.json()) as {
      documents: Record<string, { shared?: boolean }>;
    };

    const sharedIds = Object.entries(result.documents || {})
      .filter(([, meta]) => meta.shared === true)
      .map(([id]) => id);

    if (sharedIds.length === 0) {
      return [];
    }

    const sharedDocuments = await getDocumentsByIds(sharedIds);
    return sharedDocuments.map((doc) => ({
      id: doc.id,
      title: doc.title,
      created_at: doc.created_at,
      creation_source: doc.creation_source,
      public: doc.public,
      sharing_link_visibility: doc.sharing_link_visibility,
      isShared: true,
    }));
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    return [];
  }
}

/**
 * Fetch documents from shared folders (folders where is_shared is true).
 */
async function getDocumentsFromSharedFolders(): Promise<Doc[]> {
  try {
    // Get all folders including shared ones
    const foldersResponse = await getFolders();

    if (!foldersResponse?.lists) {
      return [];
    }

    // Find shared folders and collect their document IDs
    const sharedFolderDocIds: string[] = [];

    for (const folder of Object.values(foldersResponse.lists)) {
      if (folder.is_shared && folder.document_ids && folder.document_ids.length > 0) {
        for (const docId of folder.document_ids) {
          sharedFolderDocIds.push(docId);
        }
      }
    }

    if (sharedFolderDocIds.length === 0) {
      return [];
    }

    // Fetch the documents from shared folders
    const documents = await getDocumentsByIds(sharedFolderDocIds);

    return documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      created_at: doc.created_at,
      creation_source: doc.creation_source,
      public: doc.public,
      sharing_link_visibility: doc.sharing_link_visibility,
      isShared: true,
    }));
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    return [];
  }
}

/**
 * Fetch documents by a set of IDs with basic caching to avoid repeat requests.
 */
export async function getDocumentsByIds(documentIds: string[], batchSize: number = 20): Promise<Document[]> {
  const uniqueIds = Array.from(new Set(documentIds)).filter((id) => id);
  if (uniqueIds.length === 0) {
    return [];
  }

  const missingIds = uniqueIds.filter((id) => !documentsByIdCache.has(id));

  if (missingIds.length > 0) {
    const token = await getAccessToken();
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    for (let i = 0; i < missingIds.length; i += batchSize) {
      const batch = missingIds.slice(i, i + batchSize);
      try {
        const response = await fetch(`https://api.granola.ai/v1/get-documents-batch`, {
          method: "POST",
          headers,
          body: JSON.stringify({ document_ids: batch }),
        });

        if (!response.ok) {
          let errorText = await response.text();
          try {
            const errorJson = JSON.parse(errorText);
            errorText = (errorJson as { message?: string }).message || errorText;
          } catch (e) {
            void e;
          }
          throw new Error(`API request failed with status ${response.status}: ${errorText}`);
        }

        const result = (await response.json()) as { docs?: Document[] };
        if (Array.isArray(result?.docs)) {
          for (const doc of result.docs) {
            if (doc?.id) {
              documentsByIdCache.set(doc.id, doc);
            }
          }
        }
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }
        const normalizedError = toError(error);
        showFailureToast(normalizedError, { title: "Failed to Fetch Documents" });
        throw normalizedError;
      }
    }
  }

  return uniqueIds.map((id) => documentsByIdCache.get(id)).filter((doc): doc is Document => Boolean(doc));
}

/**
 * Fetch the list of documents with large fields stripped for memory efficiency.
 * Use this in AI tools that only need metadata (id, title, date) for filtering.
 * Full content can be loaded on-demand for specific documents.
 */
export async function getDocumentsListStripped(): Promise<Doc[]> {
  const documents = await getDocumentsList();
  return stripLargeFields(documents);
}

/**
 * Fetch recipes via API (user, shared, default) and normalize to a list result
 */
export async function getRecipesFromApi(): Promise<RecipesListResult> {
  const url = `https://api.granola.ai/v1/get-recipes`;
  try {
    const token = await getAccessToken();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      let errorText = await response.text();
      try {
        const json = JSON.parse(errorText) as unknown;
        if (json && typeof json === "object" && "message" in (json as Record<string, unknown>)) {
          const msg = (json as Record<string, unknown>).message;
          if (typeof msg === "string" && msg.trim().length > 0) {
            errorText = msg;
          }
        }
      } catch (e) {
        void e;
      }
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    const payload = (await response.json()) as RecipesApiResponse;
    const userRecipes: Recipe[] = Array.isArray(payload.userRecipes) ? payload.userRecipes : [];
    const sharedRecipes: Recipe[] = Array.isArray(payload.sharedRecipes) ? payload.sharedRecipes : [];
    const unlistedRecipes: Recipe[] = Array.isArray(payload.unlistedRecipes) ? payload.unlistedRecipes : [];

    let defaultRecipes: DefaultRecipe[] = [];

    if (Array.isArray(payload.publicRecipes) && payload.publicRecipes.length > 0) {
      defaultRecipes = payload.publicRecipes.map((recipe) => ({
        slug: recipe.slug,
        defaultConfig: recipe.config,
      }));
    } else if (Array.isArray(payload.defaultRecipes) && payload.defaultRecipes.length > 0) {
      defaultRecipes = payload.defaultRecipes;
    }

    return { featureEnabled: true, userRecipes, defaultRecipes, sharedRecipes, unlistedRecipes };
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    const normalizedError = toError(error);
    showFailureToast(normalizedError, { title: "Failed to Fetch Recipes" });
    throw normalizedError;
  }
}
