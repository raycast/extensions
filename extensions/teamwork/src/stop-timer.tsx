import { Action, ActionPanel, Icon, List, showHUD } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { completeTimer, formatElapsed, getTimerState } from "./teamwork";

export default function Command() {
  const { data, isLoading } = usePromise(getTimerState, []);
  const running = data?.running;
  const paused = data?.paused ?? [];

  return (
    <List isLoading={isLoading}>
      {!isLoading && !running && paused.length === 0 ? (
        <List.EmptyView title="No Timers Found" />
      ) : null}
      {running ? (
        <List.Section title="Running">
          <List.Item
            title={running.taskName ?? running.description ?? "Teamwork timer"}
            subtitle={running.projectName}
            accessories={[{ text: formatElapsed(running), icon: Icon.Play }]}
            actions={
              <ActionPanel>
                <Action
                  title="Stop and Log Timer"
                  icon={Icon.Stop}
                  onAction={async () => {
                    await completeTimer(running);
                    await showHUD(
                      `Logged ${formatElapsed(running)}: ${running.taskName ?? "Teamwork timer"}`,
                    );
                  }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
      {paused.length > 0 ? (
        <List.Section title="Paused">
          {paused.map((timer) => (
            <List.Item
              key={timer.id}
              title={timer.taskName ?? timer.description ?? "Teamwork timer"}
              subtitle={timer.projectName}
              accessories={[{ text: formatElapsed(timer), icon: Icon.Pause }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Stop and Log Timer"
                    icon={Icon.Stop}
                    onAction={async () => {
                      await completeTimer(timer);
                      await showHUD(
                        `Logged ${formatElapsed(timer)}: ${timer.taskName ?? "Teamwork timer"}`,
                      );
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
