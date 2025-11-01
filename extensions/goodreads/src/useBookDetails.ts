import type { BookDetails } from "./types";
import { usePersistentState } from "./usePersistentState";
import { getCacheKey, fetchBookDetails, AsyncStatus } from "./goodreads-api";
import { useEffect, useState } from "react";

const MAX_CACHE_SIZE = 20; // Define a maximum cache size
const ALL_BOOK_IDS_CACHE_KEY = "allBookIds";
const BOOK_DETAILS_CACHE_KEY = "bookDetails";

export const useBookDetails = (qualifier: string) => {
  const [status, setStatus] = useState<AsyncStatus>(AsyncStatus.Idle);
  const [allBookIds, setAllBookIds] = usePersistentState<string[]>(ALL_BOOK_IDS_CACHE_KEY, []);
  const [bookDetails, setBookDetails] = usePersistentState<Record<string, BookDetails>>(BOOK_DETAILS_CACHE_KEY, {});

  // Evict the oldest entry if cache size exceeds MAX_CACHE_SIZE
  const add = (key: string, value: BookDetails) => {
    let idToEvict: string | null = null;

    setAllBookIds((currentIds) => {
      const updatedIds = [...currentIds];
      const existingIndex = updatedIds.indexOf(key);
      if (existingIndex !== -1) {
        // Remove the existing book ID to move it to the front
        updatedIds.splice(existingIndex, 1);
      }
      if (updatedIds.length >= MAX_CACHE_SIZE) {
        // Remove the oldest book ID if we have reached the max limit
        idToEvict = updatedIds.pop() as string;
      }
      // Add the new book ID to the front of the list
      updatedIds.unshift(key);
      return updatedIds;
    });

    setBookDetails((currentDetails) => {
      const updatedDetails = { ...currentDetails };
      if (idToEvict) {
        delete updatedDetails[idToEvict]; // Remove the evicted book details
      }
      updatedDetails[key] = value; // Add or update the book details
      return updatedDetails;
    });
  };

  // stale-while-revalidate pattern
  const fetchDetails = async (qualifier: string) => {
    const cacheKey = getCacheKey(qualifier);
    const isDataCached = allBookIds.includes(cacheKey);

    if (!isDataCached) {
      setStatus(AsyncStatus.Loading);
    }

    const { status, data } = await fetchBookDetails(qualifier);
    switch (status) {
      case AsyncStatus.Success:
        add(cacheKey, data);
        setStatus(AsyncStatus.Success);
        break;
      case AsyncStatus.Error:
        if (!isDataCached) {
          setStatus(AsyncStatus.Error);
        }
        break;
    }
  };

  const revalidate = () => {
    if (qualifier) {
      fetchDetails(qualifier);
    }
  };

  useEffect(() => {
    if (qualifier) {
      fetchDetails(qualifier);
    }
  }, [qualifier]);

  const cacheKey = getCacheKey(qualifier);
  const data = bookDetails[cacheKey];
  const isLoading = status === AsyncStatus.Loading;

  return { data, status, isLoading, revalidate };
};
