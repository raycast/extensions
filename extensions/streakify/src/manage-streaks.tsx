import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { deleteStreak, getStreaks, updateStreak } from "./storage";
import {
  getDisplayEmoji,
  isCheckedToday,
  parseWholeNumber,
  Streak,
  todayDateString,
  yesterdayDateString,
} from "./types";

export default function ManageStreaks() {
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  const load = useCallback(async () => {
    setIsLoading(true);
    const data = await getStreaks();
    data.sort((a, b) => {
      if (a.frozen !== b.frozen) return a.frozen ? 1 : -1;
      const aChecked = isCheckedToday(a) ? 1 : 0;
      const bChecked = isCheckedToday(b) ? 1 : 0;
      if (aChecked !== bChecked) return aChecked - bChecked;
      return b.count - a.count;
    });
    setStreaks(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCheckIn(streak: Streak) {
    if (streak.frozen) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Streak is frozen",
        message: "Unfreeze it first to check in",
      });
      return;
    }
    if (isCheckedToday(streak)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Already checked in today",
      });
      return;
    }

    const updated: Streak = {
      ...streak,
      count: streak.count + 1,
      lastCheckedDate: todayDateString(),
    };
    await updateStreak(updated);
    await showToast({
      style: Toast.Style.Success,
      title: "Streak updated!",
      message: `${updated.emoji} ${updated.name} — day ${updated.count}`,
    });
    await load();
  }

  async function handleUncheck(streak: Streak) {
    if (!isCheckedToday(streak)) return;

    const confirmed = await confirmAlert({
      title: "Undo today's check-in?",
      message: `This will decrease "${streak.name}" from day ${streak.count} to day ${Math.max(0, streak.count - 1)}.`,
      primaryAction: {
        title: "Undo",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    const newCount = Math.max(0, streak.count - 1);
    // Keep a valid date so auto-reset does not wipe the remaining streak:
    // - count > 0 → yesterday (still within the continuation window)
    // - count === 0 → null
    const updated: Streak = {
      ...streak,
      count: newCount,
      lastCheckedDate: newCount > 0 ? yesterdayDateString() : null,
    };
    await updateStreak(updated);
    await showToast({
      style: Toast.Style.Success,
      title: "Check-in undone",
      message: `${updated.emoji} ${updated.name} — day ${updated.count}`,
    });
    await load();
  }

  async function handleToggleFreeze(streak: Streak) {
    if (streak.frozen) {
      const updated: Streak = {
        ...streak,
        frozen: false,
        lastCheckedDate: todayDateString(),
      };
      await updateStreak(updated);
      await showToast({
        style: Toast.Style.Success,
        title: "Streak unfrozen",
        message: `${updated.emoji} ${updated.name} — day ${updated.count}`,
      });
    } else {
      const confirmed = await confirmAlert({
        title: "Freeze Streak?",
        message: `"${streak.name}" will be protected from auto-reset while frozen. You won't need to check in.`,
        primaryAction: {
          title: "Freeze",
        },
      });
      if (!confirmed) return;

      const updated: Streak = {
        ...streak,
        frozen: true,
      };
      await updateStreak(updated);
      await showToast({
        style: Toast.Style.Success,
        title: "Streak frozen 🧊",
        message: `${updated.emoji} ${updated.name}`,
      });
    }
    await load();
  }

  async function handleToggleMenuBar(streak: Streak) {
    const updated: Streak = {
      ...streak,
      showInMenuBar: !streak.showInMenuBar,
    };
    await updateStreak(updated);
    await showToast({
      style: Toast.Style.Success,
      title: updated.showInMenuBar ? "Shown in Menu Bar" : "Hidden from Menu Bar",
      message: `${updated.emoji} ${updated.name}`,
    });
    await load();
  }

  async function handleDelete(streak: Streak) {
    const confirmed = await confirmAlert({
      title: "Delete Streak?",
      message: `Are you sure you want to delete "${streak.name}"? This cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    await deleteStreak(streak.id);
    await showToast({
      style: Toast.Style.Success,
      title: "Streak deleted",
      message: streak.name,
    });
    await load();
  }

  async function handleReset(streak: Streak) {
    const confirmed = await confirmAlert({
      title: "Reset Streak?",
      message: `Reset "${streak.name}" back to day 0?`,
      primaryAction: {
        title: "Reset",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    const updated: Streak = {
      ...streak,
      count: 0,
      lastCheckedDate: null,
      frozen: false,
    };
    await updateStreak(updated);
    await showToast({
      style: Toast.Style.Success,
      title: "Streak reset",
      message: `${updated.emoji} ${updated.name}`,
    });
    await load();
  }

  function statusTag(streak: Streak): { value: string; color: Color } {
    if (streak.frozen) {
      return { value: "Frozen", color: Color.Blue };
    }
    if (isCheckedToday(streak)) {
      return { value: "Done today", color: Color.Green };
    }
    return { value: "Not yet", color: Color.Orange };
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search streaks...">
      {streaks.length === 0 && !isLoading ? (
        <List.EmptyView
          icon="🔥"
          title="No streaks yet"
          description="Use the Create Streak command to add your first one"
        />
      ) : (
        streaks.map((streak) => {
          const checked = isCheckedToday(streak);
          const statusEmoji = getDisplayEmoji(streak);
          const tag = statusTag(streak);
          return (
            <List.Item
              key={streak.id}
              title={`${streak.emoji} ${streak.name}`}
              subtitle={`Day ${streak.count}`}
              accessories={[
                ...(streak.showInMenuBar
                  ? []
                  : [
                      {
                        tag: { value: "Hidden", color: Color.SecondaryText },
                      },
                    ]),
                {
                  tag: {
                    value: tag.value,
                    color: tag.color,
                  },
                },
                {
                  text: statusEmoji,
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    {!streak.frozen &&
                      (!checked ? (
                        <Action title="Check in Today" icon={Icon.CheckCircle} onAction={() => handleCheckIn(streak)} />
                      ) : (
                        <Action title="Undo Today's Check-in" icon={Icon.Undo} onAction={() => handleUncheck(streak)} />
                      ))}
                    <Action
                      title={streak.frozen ? "Unfreeze Streak" : "Freeze Streak"}
                      icon={streak.frozen ? Icon.Play : Icon.Pause}
                      onAction={() => handleToggleFreeze(streak)}
                    />
                    <Action
                      title={streak.showInMenuBar ? "Hide from Menu Bar" : "Show in Menu Bar"}
                      icon={streak.showInMenuBar ? Icon.EyeDisabled : Icon.Eye}
                      onAction={() => handleToggleMenuBar(streak)}
                    />
                    <Action
                      title="Edit Streak"
                      icon={Icon.Pencil}
                      onAction={() => push(<EditStreakForm streak={streak} onSave={load} />)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Reset to Day 0"
                      icon={Icon.ArrowCounterClockwise}
                      style={Action.Style.Destructive}
                      onAction={() => handleReset(streak)}
                    />
                    <Action
                      title="Delete Streak"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => handleDelete(streak)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

interface EditFormValues {
  name: string;
  emoji: string;
  checkedEmoji: string;
  uncheckedEmoji: string;
  count: string;
  showInMenuBar: boolean;
}

function EditStreakForm({ streak, onSave }: { streak: Streak; onSave: () => Promise<void> }) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [countError, setCountError] = useState<string | undefined>();

  async function handleSubmit(values: EditFormValues) {
    const name = values.name?.trim();
    if (!name) {
      setNameError("Name is required");
      return;
    }

    const countRaw = values.count?.trim() ?? "0";
    const count = parseWholeNumber(countRaw === "" ? "0" : countRaw);
    if (count === null) {
      setCountError("Must be a non-negative whole number");
      return;
    }

    // Keep dates consistent with count so auto-reset does not wipe the edit
    let lastCheckedDate = streak.lastCheckedDate;
    if (count === 0) {
      lastCheckedDate = null;
    } else if (!lastCheckedDate || lastCheckedDate !== todayDateString()) {
      // Positive count after edit → treat as checked today so it doesn't break
      lastCheckedDate = todayDateString();
    }

    const updated: Streak = {
      ...streak,
      name,
      emoji: values.emoji?.trim() || streak.emoji,
      checkedEmoji: values.checkedEmoji?.trim() || streak.checkedEmoji,
      uncheckedEmoji: values.uncheckedEmoji?.trim() || streak.uncheckedEmoji,
      count,
      lastCheckedDate,
      showInMenuBar: values.showInMenuBar ?? streak.showInMenuBar,
    };

    await updateStreak(updated);
    await showToast({
      style: Toast.Style.Success,
      title: "Streak updated",
      message: `${updated.emoji} ${updated.name}`,
    });
    await onSave();
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={streak.name}
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextField id="emoji" title="Streak Emoji" defaultValue={streak.emoji} />
      <Form.TextField id="checkedEmoji" title="Checked Today Emoji" defaultValue={streak.checkedEmoji} />
      <Form.TextField id="uncheckedEmoji" title="Not Checked Today Emoji" defaultValue={streak.uncheckedEmoji} />
      <Form.TextField
        id="count"
        title="Current Day"
        defaultValue={String(streak.count)}
        error={countError}
        onChange={() => setCountError(undefined)}
        info="You can manually set the day count here"
      />
      <Form.Checkbox id="showInMenuBar" label="Show in Menu Bar" defaultValue={streak.showInMenuBar} title="Menu Bar" />
    </Form>
  );
}
