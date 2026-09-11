import { Action, ActionPanel, Icon, List, showHUD } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { formatElapsed, getTimerState, resumeTimer } from "./teamwork";

export default function Command() {
  const { data, isLoading } = usePromise(getTimerState, []);
  const paused = data?.paused ?? [];

  return (
    <List isLoading={isLoading}>
      {paused.length === 0 && !isLoading ? (
        <List.EmptyView title="No Paused Timers" />
      ) : (
        paused.map((timer) => (
          <List.Item
            key={timer.id}
            title={timer.taskName ?? timer.description ?? "Teamwork timer"}
            subtitle={timer.projectName}
            accessories={[{ text: formatElapsed(timer) }]}
            actions={
              <ActionPanel>
                <Action
                  title="Resume Timer"
                  icon={Icon.Play}
                  onAction={async () => {
                    await resumeTimer(timer.id);
                    await showHUD(
                      `Resumed: ${timer.taskName ?? "Teamwork timer"}`,
                    );
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
