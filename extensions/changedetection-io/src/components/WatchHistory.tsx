import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useApi, instance_url } from "../api";

const WatchHistory = ({ id }: { id: string }) => {
  interface WatchHistory {
    [timestamp: string]: string;
  }
  const { isLoading, data } = useApi<WatchHistory>(`watch/${id}/history`);

  return (
    <List isLoading={isLoading}>
      {data &&
        Object.keys(data).map((timestamp) => (
          <List.Item
            key={timestamp}
            title={new Date(+timestamp * 1000).toUTCString()}
            accessories={[{ date: new Date(+timestamp * 1000) }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  icon={Icon.ArrowNe}
                  title="View Snapshot"
                  url={`${new URL(`preview/${id}`, instance_url)}?version=${timestamp}#text`}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
};

export default WatchHistory;
