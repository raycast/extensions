import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { homedir } from "os";
import { join } from "path";
import { format } from "date-fns";
import { useRecordings } from "./hooks";

export default function Command() {
  const { recordings, isLoading, error } = useRecordings();

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Error"
          description={error.message}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} isShowingDetail>
      {recordings?.map((recording) => (
        <List.Item
          key={recording.directory}
          icon={Icon.Document}
          title={format(recording.timestamp, "yyyy/MM/dd HH:mm:ss")}
          detail={<List.Item.Detail markdown={recording.meta.rawResult} />}
          actions={
            <ActionPanel>
              <Action.ShowInFinder
                title="Show in Finder"
                path={join(homedir(), "Documents", "superwhisper", "recordings", recording.directory)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
