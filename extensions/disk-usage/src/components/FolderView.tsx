import { Action, ActionPanel, Icon, List } from "@raycast/api";
import type { FC } from "react";
import { useDirectoryData } from "../hooks/use-directory-data";
import { useMemory } from "../hooks/use-memory";
import { useSelection } from "../hooks/use-selection";
import type { DiskUsageSend } from "../machines/disk-usage-machine";
import { FileSection } from "./FileSection";
import { RestrictedSection } from "./RestrictedSection";

export const FolderView: FC<{
  title: string;
  rootPath: string;
  send: DiskUsageSend;
  isDeleting: boolean;
}> = ({ title, rootPath, send, isDeleting }) => {
  const selection = useSelection();
  const heapUsed = useMemory();
  const { data, isLoading } = useDirectoryData(rootPath);

  const selectionInfo = selection.size > 0 ? `(${selection.size} selected)` : "";

  return (
    <List
      navigationTitle={`${title} ${selectionInfo}`}
      searchBarPlaceholder={`Search in ${title}...`}
      isLoading={isLoading}
    >
      <List.Section title="System Stats">
        <List.Item
          title="Node.js Heap Usage"
          icon={Icon.MemoryChip}
          accessories={[{ text: `RAM: ${heapUsed}` }]}
          actions={
            <ActionPanel>
              <Action title="Refresh View" onAction={() => send({ type: "REFRESH" })} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      </List.Section>

      {data.accessible.length > 0 && (
        <FileSection title={title} items={data.accessible} send={send} isDeleting={isDeleting} />
      )}

      {!isLoading && data.accessible.length === 0 && data.restricted.length === 0 && (
        <List.EmptyView
          title="Empty or File"
          description="This is either an empty folder or a file."
          icon={{ fileIcon: rootPath }}
        />
      )}

      {data.restricted.length > 0 && <RestrictedSection items={data.restricted} />}
    </List>
  );
};
