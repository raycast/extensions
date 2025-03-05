import { List, Icon, Action, ActionPanel } from "@raycast/api";
import { memo, useMemo } from "react";

import { useCommandExecution } from "../../../hooks/useCommandExecution";
import { useHarmony } from "../../../hooks/useHarmony";
import { HarmonyCommand } from "../../../types/core/harmony";

interface CommandsViewProps {
  commands: HarmonyCommand[];
  onBack?: () => void;
}

function CommandsViewImpl({ commands, onBack }: CommandsViewProps): JSX.Element {
  const { refresh, clearCache } = useHarmony();
  const { execute } = useCommandExecution();

  // Memoize command groups
  const { commandGroups, commandsByGroup } = useMemo(() => {
    const groups = new Set<string>();
    const byGroup = new Map<string, HarmonyCommand[]>();

    commands.forEach((command) => {
      const group = command.group || "Default";
      groups.add(group);
      const groupCommands = byGroup.get(group) || [];
      groupCommands.push(command);
      byGroup.set(group, groupCommands);
    });

    return {
      commandGroups: Array.from(groups).sort(),
      commandsByGroup: byGroup,
    };
  }, [commands]);

  // Memoize command list items
  const renderCommandItem = useMemo(
    () => (command: HarmonyCommand) => (
      <List.Item
        key={command.id}
        title={command.label}
        subtitle={command.name}
        icon={Icon.Terminal}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action title="Execute Command" icon={Icon.Terminal} onAction={() => execute(command)} />
            </ActionPanel.Section>
            <ActionPanel.Section>
              {refresh && <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />}
              {clearCache && <Action title="Clear Cache" icon={Icon.Trash} onAction={clearCache} />}
              {onBack && <Action title="Back" icon={Icon.ArrowLeft} onAction={onBack} />}
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    ),
    [execute, refresh, clearCache, onBack],
  );

  return (
    <List
      navigationTitle="Commands"
      searchBarPlaceholder="Search commands..."
      isLoading={false}
      isShowingDetail={false}
    >
      {commandGroups.map((group) => {
        const groupCommands = commandsByGroup.get(group) || [];
        return (
          <List.Section key={group} title={group}>
            {groupCommands.map(renderCommandItem)}
          </List.Section>
        );
      })}
    </List>
  );
}

export const CommandsView = memo(CommandsViewImpl);
