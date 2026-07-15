import {
  Detail,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { PhotoItem } from "./types";
import { getFinderPhotos } from "./lib/finder";
import { cleanupStagingDir } from "./lib/trash";
import { cleanupThumbnailDir } from "./lib/images";
import { ReviewSession } from "./components/ReviewSession";

export default function ReviewFinderSelectionCommand() {
  const [photos, setPhotos] = useState<PhotoItem[] | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    let cancelled = false;

    async function loadPhotos() {
      const [stagingCount, thumbnailCount] = await Promise.all([
        cleanupStagingDir(),
        cleanupThumbnailDir(),
      ]);
      const count = stagingCount + thumbnailCount;
      if (cancelled) return;

      if (count > 0) {
        await showToast({
          style: Toast.Style.Success,
          title: `Cleaned up ${count} file(s) from previous session`,
          message: "Files were moved to Trash",
        });
      }

      const selectedPhotos = await getFinderPhotos();
      if (cancelled) return;

      setPhotos(selectedPhotos);
      if (selectedPhotos.length > 0) {
        push(<ReviewSession photos={selectedPhotos} />);
      }
    }

    void loadPhotos();

    return () => {
      cancelled = true;
    };
  }, [push]);

  if (photos === null) {
    return <Detail isLoading />;
  }

  if (photos.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No Images Found"
          description="Select some images in Finder and try again."
          icon={Icon.Image}
        />
      </List>
    );
  }

  return <Detail isLoading />;
}
