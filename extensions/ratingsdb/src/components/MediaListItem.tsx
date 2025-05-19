import { useEffect, useState } from "react";
import { List, ActionPanel } from "@raycast/api";
import MediaActions from "./MediaActions";
import DetailView from "./Detail";
import { searchID } from "../utils/requests";
import { MediaDetails } from "../types";

const MediaListItem = ({ title, onRemove }: { title: MediaDetails; onRemove?: (id: string) => void }) => {
  const [media, setMedia] = useState<MediaDetails>();

  useEffect(() => {
    const fetchMedia = async () => {
      const data = await searchID(title.imdbID);
      setMedia(data as MediaDetails);
    };
    fetchMedia();
  }, [title.imdbID]);

  if (!media) {
    return null;
  }

  function getTotalSeasons() {
    if (media && media.totalSeasons) {
      const totalSeasons = parseInt(media.totalSeasons, 10);
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
      detail={<DetailView media={media} titleOrId={title.imdbID} poster={title.Poster} />}
      actions={
        <ActionPanel>
          <MediaActions media={media} onRemove={onRemove} />
        </ActionPanel>
      }
    />
  );
};
export default MediaListItem;
