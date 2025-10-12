import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useApi, instance_url } from "@/api";
import { WatchHistoryResponse } from "@/types";

// http://brain:5054/diff/ce489c15-dca2-4e5c-83fb-bd84b0a554f5?from_version=1736505830&to_version=1736516635&diff_type=diffLines#text

const WatchHistory = ({ id }: { id: string }) => {
  const { isLoading, data } = useApi<WatchHistoryResponse>(`watch/${id}/history`);

  return (
    <List isLoading={isLoading}>
      {data
        ? Object.keys(data)
            // Sort the timestamps, so the newest is first
            .sort((a, b) => +b - +a)
            .map((timestamp, index, arr) => (
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
                    {index < arr.length - 1 ? (
                      <Action.OpenInBrowser
                        icon={Icon.ArrowNe}
                        title="View Diff"
                        url={`${new URL(`diff/${id}`, instance_url)}?from_version=${arr[index + 1]}&to_version=${timestamp}#text`}
                      />
                    ) : null}
                  </ActionPanel>
                }
              />
            ))
        : null}
    </List>
  );
};

export default WatchHistory;
