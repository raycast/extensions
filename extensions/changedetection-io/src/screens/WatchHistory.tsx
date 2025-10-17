import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { WatchHistoryResponse } from "@/types";
import { getUrl } from "@/utils";
import { useApi } from "@/hooks/use-api";

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
                      url={`${getUrl(`preview/${id}`)}?version=${timestamp}#text`}
                    />
                    {index < arr.length - 1 ? (
                      <Action.OpenInBrowser
                        icon={Icon.ArrowNe}
                        title="View Diff"
                        url={`${getUrl(`diff/${id}`)}?from_version=${arr[index + 1]}&to_version=${timestamp}#text`}
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
