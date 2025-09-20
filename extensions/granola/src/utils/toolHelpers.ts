import { Document } from "./types";
import { getDocumentsList } from "./fetchData";
import { getFavicon } from "@raycast/utils";
import { Icon } from "@raycast/api";
import { Image } from "@raycast/api";
import { useState, useEffect } from "react";
import { isPersonalEmailDomain } from "./emailDomainUtils";

/**
 * Get documents from cache with error handling
 */
export async function getDocuments(): Promise<Document[]> {
  return await getDocumentsList();
}

/**
 * Find a document by ID with validation
 */
export async function findDocumentById(noteId: string): Promise<Document> {
  const documents = await getDocuments();
  const document = documents.find((doc) => doc.id === noteId);

  if (!document) {
    throw new Error(`Note with ID "${noteId}" not found`);
  }

  return document;
}

/**
 * Get multiple documents by IDs
 */
export async function findDocumentsByIds(
  noteIds: string[],
): Promise<Array<{ document: Document | null; noteId: string }>> {
  const documents = await getDocuments();
  return noteIds.map((noteId) => ({ noteId, document: documents.find((doc) => doc.id === noteId) || null }));
}

/**
 * Custom hook to fetch favicon for a domain
 * @param domain - The domain to fetch favicon for
 * @param fallbackIcon - The fallback icon to use if favicon fails
 * @param shouldFetch - Whether to fetch the favicon (e.g., only for work domains)
 * @returns favicon image or null
 */
export function useFavicon(
  domain: string | null | undefined,
  fallbackIcon: Image.Fallback = Icon.Globe,
  shouldFetch: boolean = true,
) {
  const [favicon, setFavicon] = useState<Image.ImageLike | null>(null);

  useEffect(() => {
    if (!domain || !shouldFetch) {
      setFavicon(null);
      return;
    }

    let isMounted = true;

    const fetchFavicon = async () => {
      try {
        // Only fetch favicon for work domains (non-personal email providers)
        if (!isPersonalEmailDomain(domain) && isMounted) {
          const favicon = getFavicon(`https://${domain}`, {
            fallback: fallbackIcon,
          });
          setFavicon(favicon);
        }
      } catch (error) {
        // Silently handle error and fall back to null
      }
    };

    fetchFavicon();

    return () => {
      isMounted = false;
    };
  }, [domain, fallbackIcon, shouldFetch]);

  return { favicon };
}
