import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";

import { executeElsewhereCommand } from "./command-runner";
import { ElsewhereStateList } from "./elsewhere-state-list";

export default function Command() {
  return (
    <ElsewhereStateList searchBarPlaceholder="Search Spaces…">
      {(snapshot, refresh) => (
        <List.Section title="Spaces" subtitle={`${snapshot.spaces.length}`}>
          {snapshot.spaces.map((space) => {
            const isActive = space.id === snapshot.activeSpaceId;
            return (
              <List.Item
                key={space.id}
                icon={
                  space.color
                    ? {
                        source: Icon.CircleFilled,
                        tintColor: { light: space.color, dark: space.color, adjustContrast: true },
                      }
                    : { source: Icon.CircleFilled, tintColor: Color.SecondaryText }
                }
                title={space.name}
                subtitle={space.description}
                accessories={isActive ? [{ text: "Active" }] : undefined}
                actions={
                  <ActionPanel>
                    {isActive ? (
                      <Action title="Refresh Spaces" icon={Icon.ArrowClockwise} onAction={refresh} />
                    ) : (
                      <Action
                        title={`Switch to ${space.name}`}
                        icon={Icon.CheckCircle}
                        onAction={() =>
                          executeElsewhereCommand(
                            { kind: "space", action: "select", id: space.id },
                            { successTitle: `Switched to ${space.name}`, onSettled: refresh },
                          )
                        }
                      />
                    )}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </ElsewhereStateList>
  );
}
