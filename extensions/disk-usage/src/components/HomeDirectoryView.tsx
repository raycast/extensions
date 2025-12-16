import { homedir } from "node:os";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import type { FC } from "react";
import { useDirectoryData } from "../hooks/use-directory-data";
import { useMemory } from "../hooks/use-memory";
import { useSelection } from "../hooks/use-selection";
import { type DiskUsageSend, type DiskUsageState, matchStatus } from "../machines/disk-usage-machine";
import { FileSection } from "./FileSection";
import { RestrictedSection } from "./RestrictedSection";
import { SearchResultsView } from "./SearchResultView";

const homeDir = homedir();

export const HomeDirectoryComponent: FC<{
  isProcessingDeletion: boolean;
  send: DiskUsageSend;
}> = ({ isProcessingDeletion, send }) => {
  const selection = useSelection();
  const { data, isLoading } = useDirectoryData(homeDir);
  const heapUsed = useMemory();

  if (!isLoading && data.accessible.length === 0 && data.restricted.length === 0) {
    return (
      <List.Section title="Welcome">
        <List.Item
          title="No disk index found"
          subtitle="Click to start scanning your Home directory"
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action title="Start Scan" onAction={() => send({ type: "REFRESH" })} />
            </ActionPanel>
          }
        />
      </List.Section>
    );
  }

  return (
    <>
      <List.Section title="System Stats">
        <List.Item title="Node.js Heap Usage" icon={Icon.MemoryChip} accessories={[{ text: `RAM: ${heapUsed}` }]} />
      </List.Section>

      <FileSection title="Home" items={data.accessible} isDeleting={isProcessingDeletion} send={send} />

      <RestrictedSection items={data.restricted} />

      {selection.size > 0 && (
        <List.Section title="Actions">
          <List.Item
            title={`Delete ${selection.size} Selected Items`}
            icon={Icon.Trash}
            actions={
              <ActionPanel>
                <Action.Trash
                  title="Move All to Trash"
                  paths={selection.getAll()}
                  icon={Icon.Trash}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onTrash={() =>
                    send({
                      type: "DELETE_ITEMS",
                      paths: selection.getAll(),
                    })
                  }
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </>
  );
};

export const HomeDirectoryView: FC<{
  state: DiskUsageState;
  send: DiskUsageSend;
  search: string;
}> = ({ state, send, search }) => {
  return (
    <>
      {matchStatus(state.value, state.context, {
        ready: ({ isProcessingDeletion }) => {
          if (search.trim().length > 0) {
            return <SearchResultsView query={search} isProcessingDeletion={isProcessingDeletion} send={send} />;
          }
          return <HomeDirectoryComponent isProcessingDeletion={isProcessingDeletion} send={send} />;
        },
        _: () => null,
      })}
    </>
  );
};
