import { List } from "@raycast/api";
import { useRadioCurrentSong } from "../hooks/useRadioCurrentSong";
import { type Radio } from "../lib/radioDB";
import { COVER_NOT_FOUND } from "../lib/coverNotFound";

interface RadioDetailsProps {
  radio: Radio;
  isActive: boolean;
}

export function RadioDetails(props: RadioDetailsProps) {
  const { isActive, radio } = props;
  const { data: currentSong = null, isLoading: isCurrentSongLoading } = useRadioCurrentSong(
    isActive ? radio.url : null,
  );
  const hasCurrentSongDetails = !!currentSong && typeof currentSong !== "string";
  const coverArt = hasCurrentSongDetails
    ? `![](${currentSong.coverArt || COVER_NOT_FOUND}?raycast-width=130&raycast-height=130)`
    : null;

  return (
    <List.Item.Detail
      isLoading={isCurrentSongLoading}
      markdown={`
${isCurrentSongLoading ? "Loading current song…" : "# Currently playing"}

${!isCurrentSongLoading ? coverArt || currentSong || "Unknown" : ""}
            `}
      metadata={
        hasCurrentSongDetails && (
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Title" text={currentSong.title} />
            <List.Item.Detail.Metadata.Label title="Artist" text={currentSong.artist} />
            <List.Item.Detail.Metadata.Label title="Album" text={currentSong.album} />
            <List.Item.Detail.Metadata.Label title="Release date" text={currentSong.date || "Unknown"} />
          </List.Item.Detail.Metadata>
        )
      }
    ></List.Item.Detail>
  );
}
