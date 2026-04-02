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
import { ReviewSession } from "./components/ReviewSession";

export default function ReviewFinderSelectionCommand() {
  const [photos, setPhotos] = useState<PhotoItem[] | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    cleanupStagingDir().then(async (count) => {
      if (count > 0) {
        await showToast({
          style: Toast.Style.Success,
          title: `Cleaned up ${count} file(s) from previous session`,
          message: "Files were moved to Trash",
        });
      }
    });
    getFinderPhotos().then((p) => {
      setPhotos(p);
      if (p.length > 0) {
        push(<ReviewSession photos={p} />);
      }
    });
  }, []);

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
