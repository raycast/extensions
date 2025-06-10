import { useState, useEffect, useRef } from "react";
import { showToast, Toast } from "@raycast/api";
import { TorrentDetail } from "../types/torrent.types";
import { API_ENDPOINTS } from "../constants/api.constants";

interface UseTorrentDetailResult {
  torrentDetail: TorrentDetail | null;
  isLoading: boolean;
  error: string | null;
}

export const useTorrentDetail = (torrentId: string): UseTorrentDetailResult => {
  const [torrentDetail, setTorrentDetail] = useState<TorrentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const fetchTorrentDetail = async () => {
      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setIsLoading(true);
      setError(null);
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(API_ENDPOINTS.torrentDetail(torrentId), {
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch torrent details`);
        }

        const data = (await response.json()) as TorrentDetail;
        setTorrentDetail(data);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return; // Request was cancelled
        }

        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        showToast(Toast.Style.Failure, "Failed to load details", errorMessage);
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    };

    fetchTorrentDetail();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [torrentId]);

  return { torrentDetail, isLoading, error };
};
