import { useCallback, useEffect, useState } from "react";

import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";

import CommandForm from "./components/CommandForm";
import CommandListItem from "./components/CommandListItem";
import { defaultValues, parseTemplate } from "./lib/parser";
import { readLibrary } from "./lib/store";
import { readUsageState, saveUsage } from "./lib/usage";
import type { SavedCommand } from "./lib/types";
import type { CommandUsage, LastAction, UsageState } from "./lib/usage";

export default function SearchCommands() {
  const [commands, setCommands] = useState<SavedCommand[]>([]);
  const [usage, setUsage] = useState<UsageState>({});
  const [loadError, setLoadError] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const { push } = useNavigation();
  const { data: sortedCommands, visitItem } = useFrecencySorting(commands, {
    key: (item) => item.id,
  });

  const reload = useCallback(() => {
    try {
      setCommands(readLibrary().commands);
      setLoadError(undefined);
    } catch (error) {
      setCommands([]);
      setLoadError(String(error));
    }
    void readUsageState().then(setUsage);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const recordUse = useCallback(
    (
      command: SavedCommand,
      action: LastAction,
      values: Record<string, string>,
    ) => {
      // store only genuine overrides — a default the user merely accepted must keep tracking future template edits
      const defaults = defaultValues(parseTemplate(command.template));
      const overrides: Record<string, string> = {};
      for (const [name, value] of Object.entries(values)) {
        if (value !== "" && value !== defaults[name]) {
          overrides[name] = value;
        }
      }
      const entry: CommandUsage = {
        action,
        values: overrides,
        usedAt: new Date().toISOString(),
      };
      setUsage((previous) => ({ ...previous, [command.id]: entry }));
      void saveUsage(command.id, entry);
      void visitItem(command);
    },
    [visitItem],
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail && sortedCommands.length > 0}
      searchBarPlaceholder="Search your spellbook…"
    >
      <List.EmptyView
        icon={loadError === undefined ? Icon.Book : Icon.Warning}
        title={
          loadError === undefined
            ? "Your Spellbook is empty"
            : "Failed to load library"
        }
        description={
          loadError === undefined
            ? "Save your first command with {{param=default}} placeholders"
            : `${loadError} — fix the file and reload`
        }
        actions={
          <ActionPanel>
            <Action
              title="Save First Command"
              icon={Icon.Plus}
              onAction={() => push(<CommandForm onSaved={reload} />)}
            />
            <Action
              title="Reload Library"
              icon={Icon.ArrowClockwise}
              onAction={reload}
            />
          </ActionPanel>
        }
      />
      {sortedCommands.map((command) => (
        <CommandListItem
          key={command.id}
          command={command}
          usage={usage[command.id]}
          isShowingDetail={isShowingDetail}
          onToggleDetail={() => setIsShowingDetail((previous) => !previous)}
          onReload={reload}
          onUsed={(action, values) => recordUse(command, action, values)}
        />
      ))}
    </List>
  );
}
