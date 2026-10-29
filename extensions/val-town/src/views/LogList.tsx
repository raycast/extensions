import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getLogs } from "../lib/api";
import { errorMessage, formatDateTime, truncate } from "../lib/format";

export function LogList({ fileId, fileName, traceId }: { fileId: string; fileName: string; traceId?: string }) {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    (id: string, trace?: string) => getLogs(id, trace ? { traceIds: [trace] } : {}),
    [fileId, traceId],
  );

  const logs = data?.logs ?? [];

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Logs · ${fileName}`}
      isShowingDetail={logs.length > 0}
      searchBarPlaceholder="Filter logs"
    >
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Could not load logs"
          description={errorMessage(error)}
        />
      ) : (
        <>
          <List.EmptyView
            icon={Icon.Terminal}
            title="No logs in the last hour"
            description="Val Town only keeps a one-hour log window."
            actions={
              <ActionPanel>
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
              </ActionPanel>
            }
          />
          {logs.map((log, index) => {
            const isError = log.level === "stderr";
            return (
              <List.Item
                key={`${log.timestamp}-${index}`}
                icon={{
                  source: isError ? Icon.XMarkCircle : Icon.Dot,
                  tintColor: isError ? Color.Red : Color.SecondaryText,
                }}
                title={truncate(log.body.split("\n")[0], 90)}
                accessories={[{ date: new Date(log.timestamp) }]}
                detail={
                  <List.Item.Detail
                    markdown={`\`\`\`\n${log.body}\n\`\`\``}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Level" text={log.level} />
                        <List.Item.Detail.Metadata.Label title="Time" text={formatDateTime(log.timestamp)} />
                        {log.traceId ? <List.Item.Detail.Metadata.Label title="Trace" text={log.traceId} /> : null}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Log Line" content={log.body} />
                    <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
                  </ActionPanel>
                }
              />
            );
          })}
        </>
      )}
    </List>
  );
}
