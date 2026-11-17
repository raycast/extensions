import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { Flow, getFlows } from "./lib/mitm";

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
  const url = `${flow.scheme}://${flow.host}${flow.path}`;
  return [
    `**${flow.method}** ${flow.status || "—"}`,
    "",
    url,
    "",
    `**Size** ${formatBytes(flow.size)} · **Time** ${Math.round(flow.duration * 1000)}ms`,
  ].join("\n");
}

export default function Command() {
  const { data, isLoading, revalidate } = usePromise(() => getFlows(200), []);

  const flows = (data ?? []).slice().reverse();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter by host or path"
      isShowingDetail
    >
      {flows.map((flow) => {
        const url = `${flow.scheme}://${flow.host}${flow.path}`;
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
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
