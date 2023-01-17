import { getOAuthToken } from "../components/withGoogleAuth";
import fetch from "node-fetch";
import { ListResponse, MediaItem } from "../types/google";
import { useEffect, useState } from "react";
import { getPreferenceValues } from "@raycast/api";
import { URLSearchParams } from "url";
const BASE_URL = "https://photoslibrary.googleapis.com/v1";

const { pageSize } = getPreferenceValues();

export const usePhotos = (type: string, nextpageToken: string) => {
  const [photos, setPhotos] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPhotos() {
      const params = new URLSearchParams();
      params.append("pageToken", nextpageToken);
      setPhotos([]);
      try {
        const token = getOAuthToken();
        const response = await fetch(`${BASE_URL}/mediaItems:search?${params}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pageSize,
            filters: {
              mediaTypeFilter: {
                mediaTypes: [type],
              },
            },
          }),
        });

        const data = (await response.json()) as ListResponse;
        setPhotos(data.mediaItems);
        setNextPageToken(data.nextPageToken);
        setLoading(false);
      } catch (error: any) {
        setError(error.message);
        setLoading(false);
      }
    }
    fetchPhotos();
  }, [type, nextpageToken]);

  return { photos, loading, error, nextPageToken };
};
