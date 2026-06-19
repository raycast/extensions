import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  Countdown,
  CountdownState,
  createCountdownId,
  dateToKey,
  formatCountdownSummary,
  formatDateLabel,
  formatShortDaysLabel,
  getCountdownState,
  getDaysUntil,
  keyToDate,
  saveCountdownState,
  sortCountdowns,
} from "./countdowns";

interface CountdownFormValues extends Form.Values {
  title: string;
  targetDate: Date;
}

export default function Command() {
  const [state, setState] = useState<CountdownState>({
    countdowns: [],
    pinnedIds: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void reloadState();
  }, []);

  async function reloadState() {
    setIsLoading(true);
    setState(await getCountdownState());
    setIsLoading(false);
  }

  async function persistState(nextState: CountdownState) {
    const countdowns = sortCountdowns(nextState.countdowns);
    const countdownIds = new Set(countdowns.map((countdown) => countdown.id));
    const pinnedIdSet = new Set(
      nextState.pinnedIds.filter((id) => countdownIds.has(id)),
    );
    const pinnedIds = countdowns
      .filter((countdown) => pinnedIdSet.has(countdown.id))
      .map((countdown) => countdown.id);
    const sortedState = { countdowns, pinnedIds };

    await saveCountdownState(sortedState);
    setState(sortedState);
  }

  async function saveCountdown(countdown: Countdown) {
    const countdowns = sortCountdowns([
      ...state.countdowns.filter(
        (existingCountdown) => existingCountdown.id !== countdown.id,
      ),
      countdown,
    ]);

    await persistState({ countdowns, pinnedIds: state.pinnedIds });
    await showToast({
      style: Toast.Style.Success,
      title: "Countdown Saved",
    });
  }

  async function deleteCountdown(countdown: Countdown) {
    const confirmed = await confirmAlert({
      title: `Delete ${countdown.title}?`,
      message: "This action cannot be undone.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    const countdowns = state.countdowns.filter(
      (existingCountdown) => existingCountdown.id !== countdown.id,
    );

    await persistState({
      countdowns,
      pinnedIds: state.pinnedIds.filter((id) => id !== countdown.id),
    });
    await showToast({
      style: Toast.Style.Success,
      title: "Countdown Deleted",
    });
  }

  async function pinCountdown(countdown: Countdown) {
    await persistState({
      ...state,
      pinnedIds: [
        countdown.id,
        ...state.pinnedIds.filter((id) => id !== countdown.id),
      ],
    });
    await showToast({
      style: Toast.Style.Success,
      title: "Countdown Pinned",
    });
  }

  async function unpinCountdown(countdown: Countdown) {
    await persistState({
      ...state,
      pinnedIds: state.pinnedIds.filter((id) => id !== countdown.id),
    });
    await showToast({
      style: Toast.Style.Success,
      title: "Countdown Unpinned",
    });
  }

  const visibleCountdowns = getVisibleCountdowns(state);
  const pinnedIdSet = new Set(state.pinnedIds);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search countdowns...">
      <List.EmptyView
        title="No Countdowns"
        description="Create one with a date to see how many days are left."
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Countdown"
              icon={Icon.Plus}
              target={<CountdownForm onSave={saveCountdown} />}
            />
          </ActionPanel>
        }
      />

      {visibleCountdowns.map((countdown) => (
        <CountdownItem
          key={countdown.id}
          countdown={countdown}
          isPinned={pinnedIdSet.has(countdown.id)}
          onDelete={deleteCountdown}
          onPin={pinCountdown}
          onUnpin={unpinCountdown}
          onSave={saveCountdown}
        />
      ))}
    </List>
  );
}

function CountdownItem(props: {
  countdown: Countdown;
  isPinned: boolean;
  onDelete: (countdown: Countdown) => Promise<void>;
  onPin: (countdown: Countdown) => Promise<void>;
  onUnpin: (countdown: Countdown) => Promise<void>;
  onSave: (countdown: Countdown) => Promise<void>;
}) {
  const { countdown, isPinned, onDelete, onPin, onUnpin, onSave } = props;
  const days = getDaysUntil(countdown.targetDate);
  const daysLabel = formatShortDaysLabel(days);

  return (
    <List.Item
      id={countdown.id}
      title={countdown.title}
      subtitle={formatDateLabel(countdown.targetDate)}
      keywords={[
        countdown.targetDate,
        formatDateLabel(countdown.targetDate),
        daysLabel,
      ]}
      accessories={[
        ...(isPinned
          ? [
              {
                icon: {
                  source: Icon.Pin,
                  tintColor: Color.SecondaryText,
                },
                tooltip: "Pinned",
              },
            ]
          : []),
        {
          tag: {
            value: daysLabel,
            color: getCountdownColor(days),
          },
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Edit Countdown"
              icon={Icon.Pencil}
              target={<CountdownForm countdown={countdown} onSave={onSave} />}
            />
            <Action
              title={isPinned ? "Unpin Countdown" : "Pin Countdown"}
              icon={isPinned ? Icon.PinDisabled : Icon.Pin}
              onAction={() =>
                void (isPinned ? onUnpin(countdown) : onPin(countdown))
              }
            />
            <Action.Push
              title="Create Countdown"
              icon={Icon.Plus}
              shortcut={Keyboard.Shortcut.Common.New}
              target={<CountdownForm onSave={onSave} />}
            />
            <Action.CopyToClipboard
              title="Copy Summary"
              content={formatCountdownSummary(countdown)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Delete Countdown"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={() => void onDelete(countdown)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function getVisibleCountdowns(state: CountdownState): Countdown[] {
  const pinnedIdSet = new Set(state.pinnedIds);
  const pinnedCountdowns = state.countdowns.filter((countdown) =>
    pinnedIdSet.has(countdown.id),
  );
  const unpinnedCountdowns = state.countdowns.filter(
    (countdown) => !pinnedIdSet.has(countdown.id),
  );

  return [...pinnedCountdowns, ...unpinnedCountdowns];
}

function CountdownForm(props: {
  countdown?: Countdown;
  onSave: (countdown: Countdown) => Promise<void>;
}) {
  const { countdown, onSave } = props;
  const { pop } = useNavigation();
  const [titleError, setTitleError] = useState<string>();
  const [dateError, setDateError] = useState<string>();
  const [targetDate, setTargetDate] = useState<Date | null>(
    countdown ? keyToDate(countdown.targetDate) : new Date(),
  );

  async function handleSubmit(values: CountdownFormValues) {
    const title = values.title.trim();

    if (!title) {
      setTitleError("Enter a name.");
      return;
    }

    if (!(targetDate instanceof Date) || Number.isNaN(targetDate.getTime())) {
      setDateError("Select a date.");
      return;
    }

    await onSave({
      id: countdown?.id ?? createCountdownId(),
      title,
      targetDate: dateToKey(targetDate),
      createdAt: countdown?.createdAt ?? new Date().toISOString(),
    });
    pop();
  }

  return (
    <Form
      navigationTitle={countdown ? "Edit Countdown" : "Create Countdown"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={countdown ? "Save Countdown" : "Create Countdown"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Name"
        placeholder="Vacation, birthday, deadline..."
        defaultValue={countdown?.title}
        error={titleError}
        onChange={() => setTitleError(undefined)}
        onBlur={(event) => {
          if (!event.target.value?.trim()) {
            setTitleError("Enter a name.");
          }
        }}
      />
      <Form.DatePicker
        id="targetDate"
        title="Date"
        type={Form.DatePicker.Type.Date}
        value={targetDate}
        error={dateError}
        onChange={(date) => {
          setTargetDate(date);
          setDateError(undefined);
        }}
      />
    </Form>
  );
}

function getCountdownColor(days: number): Color {
  if (days < 0) {
    return Color.Red;
  }

  if (days === 0) {
    return Color.Green;
  }

  if (days <= 7) {
    return Color.Orange;
  }

  return Color.SecondaryText;
}
