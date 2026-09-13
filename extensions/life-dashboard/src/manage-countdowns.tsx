import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { breakdown, breakdownLine, deleteCountdown, getCountdowns } from "./countdowns";
import CountdownForm from "./CountdownForm";

export default function Command() {
  const { isLoading, data, revalidate } = usePromise(getCountdowns, []);

  const refreshMenubar = async () => {
    try {
      await launchCommand({ name: "life-menubar", type: LaunchType.Background });
    } catch {
      // refreshes on its own interval
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search countdowns…">
      <List.EmptyView
        icon="🎯"
        title="No Countdowns Yet"
        description="Create one — it shows up in Life Progress and the menu bar."
        actions={
          <ActionPanel>
            <Action.Push title="Create Countdown" icon={Icon.Plus} target={<CountdownForm onDone={revalidate} />} />
          </ActionPanel>
        }
      />
      {(data ?? []).map((c) => {
        const b = breakdown(c.date);
        return (
          <List.Item
            key={c.id}
            icon={c.emoji || "🎯"}
            title={c.name}
            subtitle={c.date}
            accessories={[
              { text: breakdownLine(c.date) },
              ...(b.passed ? [{ tag: { value: "Passed", color: "#9AA0A6" } }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Countdown"
                  icon={Icon.Pencil}
                  target={<CountdownForm countdown={c} onDone={revalidate} />}
                />
                <Action.Push
                  title="Create Countdown"
                  icon={Icon.Plus}
                  target={<CountdownForm onDone={revalidate} />}
                  shortcut={Keyboard.Shortcut.Common.New}
                />
                <Action
                  title="Delete Countdown"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={async () => {
                    const ok = await confirmAlert({
                      title: `Delete “${c.name}”?`,
                      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                    });
                    if (!ok) return;
                    await deleteCountdown(c.id);
                    await refreshMenubar();
                    await showToast({ style: Toast.Style.Success, title: "Countdown deleted" });
                    revalidate();
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy Countdown"
                  content={`${c.name}: ${breakdownLine(c.date)} (${c.date})`}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
