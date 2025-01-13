import { List } from "@raycast/api";
import { useQueue } from "./hooks/useQueue";
import TrackListItem from "./components/TrackListItem";
import EpisodeListItem from "./components/EpisodeListItem";
import { transformTrackToMinimal } from "./helpers/transformers";
import { TrackObject, EpisodeObject } from "./helpers/spotify.api";

export default function Command() {
  const { queueData: queue, queueIsLoading: isLoading } = useQueue();

  return (
    <List isLoading={isLoading}>
      {queue?.map((queueItem, i) => {
        if (queueItem.type === "episode") {
          return <EpisodeListItem episode={queueItem as EpisodeObject} key={`${queueItem.id}-${i}`} />;
        }
        return <TrackListItem track={transformTrackToMinimal(queueItem as TrackObject)} key={`${queueItem.id}-${i}`} />;
      })}
    </List>
  );
}
