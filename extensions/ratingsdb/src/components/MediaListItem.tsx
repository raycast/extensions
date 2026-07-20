import { useEffect, useState } from "react";
import { List, ActionPanel } from "@raycast/api";
import MediaActions from "./MediaActions";
import DetailView from "./Detail";
import { searchID } from "../utils/requests";
import { MediaDetails } from "../types";
import { showFailureToast } from "@raycast/utils";

const MediaListItem = ({ title, onRemove }: { title: MediaDetails; onRemove?: (id: string) => void }) => {
  const [media, setMedia] = useState<MediaDetails>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const data = await searchID(title.imdbID);
        setMedia(data as MediaDetails);
      } catch (error) {
        showFailureToast(error, { title: "Failed to fetch media details" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchMedia();
  }, [title.imdbID]);

  if (!media) {
    return <List.Item title={title.Title} />;
  }

  function getTotalSeasons() {
    if (media && media.totalSeasons) {
      const totalSeasons = media.totalSeasons;
      if (isNaN(totalSeasons)) {
        return null;
      }
      return totalSeasons > 1 ? `${totalSeasons} Seasons` : `${totalSeasons} Season`;
    } else {
      return "N/A";
    }
  }

  const seasons = media.Type === "series" ? { tag: { value: getTotalSeasons() || "N/A" } } : undefined;

  return (
    <List.Item
      key={title.imdbID}
      title={title.Title}
      accessories={seasons ? [seasons] : []}
      detail={
        isLoading ? (
          <List.Item.Detail markdown="Loading..." />
        ) : (
          <DetailView media={media} titleOrId={title.imdbID} poster={title.Poster} />
        )
      }
      actions={
        <ActionPanel>
          <MediaActions media={media} onRemove={onRemove} />
        </ActionPanel>
      }
    />
  );
};
export default MediaListItem;
