import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { openCommand } from "./lib/launch";
import { Flow, flowUrl, getFlows } from "./lib/mitm";

function statusIcon(status: number) {
  if (status === 0) {
    return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
  if (status >= 400) {
    return { source: Icon.Circle, tintColor: Color.Red };
  }
  if (status >= 300) {
    return { source: Icon.Circle, tintColor: Color.Yellow };
  }
  return { source: Icon.Circle, tintColor: Color.Green };
}

function formatBytes(bytes: number): string {
  if (!bytes) {
    return "—";
  }
  const units = ["b", "kb", "mb", "gb"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)}${units[exponent]}`;
}

function detail(flow: Flow): string {
  return [
    `**${flow.method}** ${flow.status || "—"}`,
    "",
    flowUrl(flow),
    "",
    `**Size** ${formatBytes(flow.size)} · **Time** ${Math.round(flow.duration * 1000)}ms`,
  ].join("\n");
}

function refreshAction(revalidate: () => void) {
  return (
    <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
  );
}

function openStatusAction() {
  return (
    <Action
      title="Open Proxy Status"
      icon={Icon.Gauge}
      onAction={() => openCommand("status", "Could not open Proxy Status")}
    />
  );
}

export default function Command() {
  const { data, isLoading, error, revalidate } = usePromise(
    () => getFlows(200),
    [],
  );

  const flows = (data ?? []).slice().reverse();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter by host or path"
      isShowingDetail
      // Without this the empty view has no actions at all, so the first flows to
      // arrive after the command opens would stay invisible until it reopened.
      actions={<ActionPanel>{refreshAction(revalidate)}</ActionPanel>}
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Cannot read flows"
          description={error.message}
          actions={
            <ActionPanel>
              {openStatusAction()}
              {refreshAction(revalidate)}
            </ActionPanel>
          }
        />
      ) : null}
      {!error && !isLoading && flows.length === 0 ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No traffic captured"
          description="Start the proxy from Proxy Status, then browse something."
          actions={
            <ActionPanel>
              {openStatusAction()}
              {refreshAction(revalidate)}
            </ActionPanel>
          }
        />
      ) : null}
      {flows.map((flow) => {
        const url = flowUrl(flow);
        return (
          <List.Item
            key={flow.id}
            icon={statusIcon(flow.status)}
            title={flow.host}
            subtitle={flow.path}
            accessories={[
              { text: `${flow.method} ${flow.status || "—"}` },
              { text: formatBytes(flow.size) },
            ]}
            detail={<List.Item.Detail markdown={detail(flow)} />}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy URL" content={url} />
                <Action.OpenInBrowser url={url} />
                {refreshAction(revalidate)}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
