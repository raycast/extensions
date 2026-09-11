import { Action, ActionPanel, Icon, List } from "@raycast/api";
import type { FC } from "react";
import { type DiskUsageSend, type DiskUsageState, matchStatus } from "../machines/disk-usage-machine";
import type { Volume } from "../types";
import { formatSize } from "../utils/format";

const VolumeSummary: FC<{
  volume: Volume;
  onRefresh?: () => void;
}> = ({ volume, onRefresh }) => {
  const free = `Free: ${formatSize(volume.freeBytes, 1000)}`;
  const total = `Total: ${formatSize(volume.totalBytes, 1000)}`;
  const usage = `${volume.usageLabel} Used`;

  return (
    <List.Item
      title={`${free} | ${total}`}
      accessories={[{ text: usage }]}
      actions={
        onRefresh ? (
          <ActionPanel>
            <Action title="Refresh Disk Info" onAction={onRefresh} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
};

export const StatusView: FC<{
  state: DiskUsageState;
  send: DiskUsageSend;
}> = ({ state, send }) => {
  return (
    <List.Section title="💾 Macintosh HD">
      {matchStatus(
        state.value,
        { ...state.context, send },
        {
          loadingUsage: () => <List.Item title="Fetching volume stats..." icon={Icon.CircleProgress} />,
          scanning: ({ volume, activePath }) => (
            <>
              <VolumeSummary volume={volume} />
              <List.Item
                subtitle={activePath}
                title="Indexing..."
                icon={Icon.CircleProgress}
                actions={
                  <ActionPanel>
                    <Action
                      title="Restart Scan"
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={() => send({ type: "REFRESH" })}
                    />
                  </ActionPanel>
                }
              />
            </>
          ),
          ready: ({ volume, send }) => <VolumeSummary volume={volume} onRefresh={() => send({ type: "REFRESH" })} />,
          error: ({ error, send }) => (
            <List.Item
              title="Error"
              subtitle={error || "Unknown error"}
              icon={Icon.Warning}
              actions={
                <ActionPanel>
                  <Action title="Retry" onAction={() => send({ type: "RETRY" })} />
                </ActionPanel>
              }
            />
          ),
        },
      )}
    </List.Section>
  );
};
