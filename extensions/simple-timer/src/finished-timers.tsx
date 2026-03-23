import { useEffect, useState } from "react";
import {
  List,
  Action,
  ActionPanel,
  Icon,
  Color,
  showHUD,
  useNavigation,
  Detail,
} from "@raycast/api";
import {
  TimerEntry,
  getDoneTimers,
  dismissTimer,
  cancelTimer,
} from "./timer-state";
import { stopAlertSound } from "./sound";

interface Props {
  onRefresh?: () => void;
}

function FinishedDetail({
  timer,
  onDismiss,
  onCancel,
}: {
  timer: TimerEntry;
  onDismiss: () => void;
  onCancel: () => void;
}) {
  const { pop } = useNavigation();

  const markdown = [
    `# ${timer.label}`,
    ``,
    timer.note ? timer.note : `*No note*`,
    ``,
    `---`,
    ``,
    `*Timer finished*`,
  ].join("\n");

  return (
    <Detail
      navigationTitle={timer.label}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Dismiss"
            icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
            onAction={() => {
              onDismiss();
              pop();
            }}
          />
          <Action
            title="Cancel"
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "return" }}
            onAction={() => {
              onCancel();
              pop();
            }}
          />
          <Action
            title="Back"
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: [], key: "backspace" }}
            onAction={pop}
          />
        </ActionPanel>
      }
    />
  );
}

export function FinishedTimers({ onRefresh }: Props) {
  const [timers, setTimers] = useState<TimerEntry[]>([]);
  const { pop, push } = useNavigation();

  function refresh() {
    const done = getDoneTimers();
    setTimers(done);
    if (done.length === 0) {
      onRefresh?.();
      pop();
    }
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 500);
    return () => clearInterval(interval);
  }, []);

  if (timers.length === 0) {
    return (
      <List navigationTitle="Finished Timers">
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="No finished timers"
          description="Timers will appear here when they complete"
        />
      </List>
    );
  }

  return (
    <List navigationTitle={`Finished Timers (${timers.length})`}>
      {timers.map((t) => (
        <List.Item
          key={t.id}
          icon={{ source: Icon.CheckCircle, tintColor: Color.Red }}
          title={t.label}
          subtitle={t.note || undefined}
          accessories={[{ text: "Done" }]}
          actions={
            <ActionPanel>
              <Action
                title="Open"
                icon={Icon.Eye}
                onAction={() =>
                  push(
                    <FinishedDetail
                      timer={t}
                      onDismiss={async () => {
                        stopAlertSound(t.id);
                        await dismissTimer(t.id);
                        showHUD(`✅ ${t.label} dismissed`);
                        onRefresh?.();
                        refresh();
                      }}
                      onCancel={() => {
                        stopAlertSound(t.id);
                        cancelTimer(t.id);
                        showHUD(`❌ ${t.label} cancelled`);
                        onRefresh?.();
                        refresh();
                      }}
                    />,
                  )
                }
              />
              <Action
                title="Cancel"
                icon={Icon.XMarkCircle}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "return" }}
                onAction={() => {
                  stopAlertSound(t.id);
                  cancelTimer(t.id);
                  showHUD(`❌ ${t.label} cancelled`);
                  onRefresh?.();
                  refresh();
                }}
              />
              <Action
                title="Dismiss"
                icon={Icon.CheckCircle}
                shortcut={{ modifiers: ["shift"], key: "return" }}
                onAction={async () => {
                  stopAlertSound(t.id);
                  await dismissTimer(t.id);
                  showHUD(`✅ ${t.label} dismissed`);
                  onRefresh?.();
                  refresh();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
