import { useFetch, showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import getAccessToken from "./getAccessToken";
import {
  GetDocumentsResponse,
  TranscriptSegment,
  FoldersResponse,
  Document,
  RecipesApiResponse,
  RecipesListResult,
  Recipe,
  DefaultRecipe,
} from "./types";

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
        if (mounted) setError(new Error(`Failed to get access token, ${err}`));
      });
    return () => {
      mounted = false;
    };
  }, []);

  const url = `https://api.granola.ai/v2/${route}`;

  const { isLoading, data, revalidate } = useFetch<GetDocumentsResponse>(url, {
    headers: accessToken
      ? {
          Authorization: `Bearer ${accessToken}`,
        }
      : undefined,
    execute: !!accessToken,
  });

  if (error) {
    throw error;
  }

  return { isLoading: isLoading || !accessToken, data, revalidate };
}

const TRANSCRIPT_NOT_FOUND_MESSAGE = "Transcript not available for this note.";

export async function getTranscript(docId: string): Promise<string> {
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

    if (!transcriptSegments || transcriptSegments.length === 0) {
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
    showFailureToast({ title: "Failed to Fetch Transcript", message: String(error) });
    throw error;
  }
}

export async function getFolders(): Promise<FoldersResponse> {
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
    showFailureToast({ title: "Failed to Fetch Folders", message: String(error) });
    throw error;
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
    showFailureToast({ title: "Failed to Fetch Documents", message: String(error) });
    throw error;
  }
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
    const defaultRecipes: DefaultRecipe[] = Array.isArray(payload.defaultRecipes) ? payload.defaultRecipes : [];
    const sharedRecipes: Recipe[] = Array.isArray(payload.sharedRecipes) ? payload.sharedRecipes : [];

    return { featureEnabled: true, userRecipes, defaultRecipes, sharedRecipes };
  } catch (error) {
    showFailureToast({ title: "Failed to Fetch Recipes", message: String(error) });
    throw error;
  }
}
