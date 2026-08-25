import { Action, ActionPanel, Icon, List, open } from "@raycast/api";
import { Song } from "../types";
import { formatDuration, goToRoot } from "../utils/helpers";
import RefreshAction from "./RefreshAction";

interface SongListItemProps {
  song: Song;
  openFolderTarget: string;
  onRefresh: () => void;
  extraKeywords?: string[];
}

function SongListItem({
  song,
  openFolderTarget,
  onRefresh,
  extraKeywords = [],
}: SongListItemProps) {
  return (
    <List.Item
      key={song.path}
      icon={Icon.Music}
      title={song.title}
      subtitle={song.author}
      accessories={[
        { text: song.album },
        { text: formatDuration(song.duration) },
        { text: song.format },
      ]}
      keywords={[song.title, song.author, song.album, ...extraKeywords]}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Play}
            title="Play"
            onAction={async () => {
              await open(song.path);
              await goToRoot();
            }}
          />
          <Action
            icon={Icon.Folder}
            title="Open in Explorer"
            onAction={async () => {
              await open(openFolderTarget);
              await goToRoot();
            }}
          />
          <RefreshAction onRefresh={onRefresh} />
        </ActionPanel>
      }
    />
  );
}

export default SongListItem;
