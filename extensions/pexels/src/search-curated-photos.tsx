import { useMemo } from "react";
import { CuratedPhotosList } from "./components/curated-photos-list";
import { CuratedPhotosGrid } from "./components/curated-photos-grid";
import { useCuratedPhotos } from "./hooks/useCuratedPhotos";
import { layout } from "./types/preferences";

export default function SearchCuratedPhotos() {
  const { data: photosData, isLoading, pagination } = useCuratedPhotos();

  const photos = useMemo(() => {
    return photosData || [];
  }, [photosData]);

  return layout === "List" ? (
    <CuratedPhotosList photos={photos} isLoading={isLoading} pagination={pagination} />
  ) : (
    <CuratedPhotosGrid photos={photos} isLoading={isLoading} pagination={pagination} />
  );
}
