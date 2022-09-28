import { getPreferenceValues } from "@raycast/api";
import React, { useState } from "react";
import { getCuratedPhotos } from "./hooks/hooks";
import { Preferences } from "./types/preferences";
import { CuratedPhotosList } from "./components/curated-photos-list";
import { CuratedPhotosGrid } from "./components/curated-photos-grid";

export default function SearchCuratedPhotos() {
  const preferences = getPreferenceValues<Preferences>();
  const [page, setPage] = useState<number>(1);
  const { pexelsPhotos, loading } = getCuratedPhotos(page);

  return preferences.layout === "List" ? (
    <CuratedPhotosList pexelsPhotos={pexelsPhotos} loading={loading} page={page} setPage={setPage} />
  ) : (
    <CuratedPhotosGrid
      preferences={preferences}
      pexelsPhotos={pexelsPhotos}
      loading={loading}
      page={page}
      setPage={setPage}
    />
  );
}
