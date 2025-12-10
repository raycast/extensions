import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { homedir } from "node:os";
import { type FC } from "react";
import type { FileSystemIndex } from "../types";
import { DiskUsageState, matchStatus, type DiskUsageSend } from "../machines/disk-usage-machine";
import { useSelection } from "../hooks/use-selection";
import { FileSection } from "./FileSection";
import { RestrictedSection } from "./RestrictedSection";
import { SearchResultsView } from "./SearchResultView";

const homeDir = homedir();

export const HomeDirectoryComponent: FC<{
  fsIndex: FileSystemIndex;
  isProcessingDeletion: boolean;
  send: DiskUsageSend;
}> = ({ fsIndex, isProcessingDeletion, send }) => {
  const selection = useSelection();

  const snapshot = fsIndex?.[homeDir] || { accessible: [], restricted: [] };

  return (
    <>
      <FileSection title="Home" items={snapshot.accessible} isDeleting={isProcessingDeletion} send={send} />

      <RestrictedSection items={snapshot.restricted} />

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
        ready: ({ fsIndex, isProcessingDeletion }) => {
          if (!fsIndex) return null;

          if (search.trim().length > 0) {
            return (
              <SearchResultsView
                fsIndex={fsIndex}
                query={search}
                isProcessingDeletion={isProcessingDeletion}
                send={send}
              />
            );
          }

          return <HomeDirectoryComponent fsIndex={fsIndex} isProcessingDeletion={isProcessingDeletion} send={send} />;
        },
        _: () => null,
      })}
    </>
  );
};
