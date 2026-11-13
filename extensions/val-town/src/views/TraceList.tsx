import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getTraces } from "../lib/api";
import { errorMessage, formatDateTime, formatDuration } from "../lib/format";
import { LogList } from "./LogList";

export function TraceList({ fileId, fileName }: { fileId: string; fileName: string }) {
  const { data, isLoading, error, revalidate } = useCachedPromise((id: string) => getTraces(id), [fileId]);

  const traces = data?.traces ?? [];

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Traces · ${fileName}`}
      isShowingDetail={traces.length > 0}
      searchBarPlaceholder="Filter traces"
    >
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Could not load traces"
          description={errorMessage(error)}
        />
      ) : (
        <>
          <List.EmptyView
            icon={Icon.Clock}
            title="No executions in the last hour"
            description="Val Town only keeps a one-hour trace window."
            actions={
              <ActionPanel>
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
              </ActionPanel>
            }
          />
          {traces.map((trace) => {
            const failed = trace.status === "error";
            return (
              <List.Item
                key={trace.traceId}
                icon={{
                  source: failed ? Icon.XMarkCircle : Icon.CheckCircle,
                  tintColor: failed ? Color.Red : Color.Green,
                }}
                title={trace.name}
                accessories={[
                  ...(trace.httpStatus ? [{ tag: String(trace.httpStatus) }] : []),
                  { text: formatDuration(trace.durationMs) },
                ]}
                detail={
                  <List.Item.Detail
                    markdown={trace.error ? `### Error\n\n\`\`\`json\n${trace.error}\n\`\`\`` : "No error recorded."}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.TagList title="Status">
                          <List.Item.Detail.Metadata.TagList.Item
                            text={trace.status}
                            color={failed ? Color.Red : Color.Green}
                          />
                        </List.Item.Detail.Metadata.TagList>
                        <List.Item.Detail.Metadata.Label title="Started" text={formatDateTime(trace.startTime)} />
                        <List.Item.Detail.Metadata.Label title="Duration" text={formatDuration(trace.durationMs)} />
                        {trace.httpMethod ? (
                          <List.Item.Detail.Metadata.Label title="Method" text={trace.httpMethod} />
                        ) : null}
                        {trace.httpUrl ? (
                          <List.Item.Detail.Metadata.Link title="URL" target={trace.httpUrl} text={trace.httpUrl} />
                        ) : null}
                        <List.Item.Detail.Metadata.Label title="Trace" text={trace.traceId} />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Logs for This Trace"
                      icon={Icon.Terminal}
                      target={<LogList fileId={fileId} fileName={fileName} traceId={trace.traceId} />}
                    />
                    <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
                    <Action.CopyToClipboard title="Copy Trace ID" content={trace.traceId} />
                    {trace.error ? <Action.CopyToClipboard title="Copy Error" content={trace.error} /> : null}
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
