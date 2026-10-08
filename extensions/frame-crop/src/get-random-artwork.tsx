import { Detail, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import DisplayArtwork from "./display-artwork";
import { Artwork } from "./types";
import { FRAME_CROP_API_URL } from "../config.json";

export default function Command() {
  const [refresh, setRefresh] = useState(0);
  const { data, error, isLoading } = useFetch<Artwork>(
    `${FRAME_CROP_API_URL}/raycast/popular/random?refresh=${refresh}`,
    {
      method: "GET",
      headers: {
        Authorization: "FC-RAYCAST",
        "Content-Type": "application/json",
        "X-Extension-Origin": "raycast-extension",
      },
    },
  );

  useEffect(() => {
    if (error) {
      showToast(Toast.Style.Failure, "Failed to fetch artwork", error.message);
    }
  }, [error]);

  if (isLoading) {
    return <Detail markdown="Loading..." />;
  }

  if (error) {
    return <Detail markdown={`Error: ${error.message}`} />;
  }

  if (data) {
    return <DisplayArtwork artwork={data} onRefresh={() => setRefresh((prev) => prev + 1)} />;
  }

  return null; // Fallback if no data
}
