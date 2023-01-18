import { getOAuthToken } from "../components/withGoogleAuth";
import fetch from "node-fetch";
import { ListResponse, MediaItem, Error } from "../types/google";
import { useEffect, useState } from "react";
import { getPreferenceValues } from "@raycast/api";
import { URLSearchParams } from "url";
import { isEmpty, categories } from "../utils";
const BASE_URL = "https://photoslibrary.googleapis.com/v1";

const { pageSize } = getPreferenceValues();

export const usePhotos = (type: string, nextpageToken: string) => {
  const [photos, setPhotos] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  const Category = categories.find((category) => category.value === type)?.value;

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
                mediaTypes: Category ? ["ALL_MEDIA"] : [type],
              },
              contentFilter: {
                includedContentCategories: Category ? [Category] : ["NONE"],
              },
            },
          }),
        }).then((res) => res.json());

        // check if response is empty
        if (isEmpty(response as object)) {
          setError({
            type: "Empty Library",
            message: "You have no photos in your library.",
          });
          setLoading(false);
          return;
        }

        const data = response as ListResponse;

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
