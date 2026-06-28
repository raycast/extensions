import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useNavigation } from "@raycast/api";
import { Playlist } from "../generatePlaylist";

type TuneHistoryListProps = {
  history: Playlist[];
  currentPlaylist: Playlist | null;
  onSelect: (index: number) => void;
};

export function TuneHistoryList({ history, currentPlaylist, onSelect }: TuneHistoryListProps) {
  const { pop } = useNavigation();
  const currentIndex = currentPlaylist ? history.indexOf(currentPlaylist) : -1;

  return (
    <List navigationTitle="Tune History">
      {history.map((version, index) => (
        <List.Item
          key={index}
          icon={index === currentIndex ? Icon.CheckCircle : Icon.Circle}
          title={version.name}
          subtitle={version.prompt}
          accessories={[
            { text: `${version.tracks.filter(Boolean).length} songs` },
            ...(index === currentIndex ? [{ tag: "Current" }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Jump to Version"
                onAction={() => {
                  onSelect(index);
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
