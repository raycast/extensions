import { getOAuthToken } from "../components/withGoogleAuth";
import fetch from "node-fetch";
import { MediaItem } from "../types/google";
import { useEffect, useState } from "react";

const BASE_URL = "https://photoslibrary.googleapis.com/v1";

export const usePhoto = (id: string) => {
  const [photo, setPhoto] = useState<MediaItem>();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPhoto = async () => {
      setLoading(true);
      setPhoto(undefined);
      try {
        const token = getOAuthToken();
        const res = await fetch(`${BASE_URL}/mediaItems/${id}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        const data = (await res.json()) as MediaItem;
        setPhoto(data);
        setLoading(false);
      } catch (error: any) {
        setError(error.message);
        setLoading(false);
      }
    };
    fetchPhoto();
  }, [id]);

  return { photo, loading, error };
};
