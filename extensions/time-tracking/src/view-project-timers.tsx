import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  List,
  showToast,
  Toast,
  Form,
} from "@raycast/api";

import { useEffect, useState } from "react";
import {
  deleteTimer,
  editTimer,
  exportTimers,
  formatDuration,
  formatDateLabel,
  getDuration,
  getTimers,
  groupTimersByDay,
  Timer,
  TimerList,
} from "./Timers";
import { useForm } from "@raycast/utils";

function parseTimestamp(value: string): Date | null {
  // Accept yyyy-mm-dd hh:mm or yyyy-mm-ddThh:mm
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/);
  if (!match) return null;
  const date = new Date(
    parseInt(match[1]),
    parseInt(match[2]) - 1,
    parseInt(match[3]),
    parseInt(match[4]),
    parseInt(match[5]),
  );
  if (isNaN(date.getTime())) return null;
  return date;
}

function EditForm(props: { timer: Timer; onUpdate: (start: Date, end: Date, name: string, tag: string) => void }) {
  type FormValues = {
    id: string;
    name: string;
    tag: string;
    start: Date | null;
    end: Date | null;
    startText: string;
    endText: string;
  };
  const { itemProps, handleSubmit, values, setValidationError } = useForm<FormValues>({
    onSubmit(values) {
      let start = values.start;
      let end = values.end;

      // Text fields override DatePicker when filled
      if (values.startText.trim()) {
        const parsed = parseTimestamp(values.startText);
        if (!parsed) {
          setValidationError("startText", "Use yyyy-mm-dd hh:mm format");
          return;
        }
        start = parsed;
      }
      if (values.endText.trim()) {
        const parsed = parseTimestamp(values.endText);
        if (!parsed) {
          setValidationError("endText", "Use yyyy-mm-dd hh:mm format");
          return;
        }
        end = parsed;
      }

      if (!start) {
        setValidationError("start", "The item is required");
        return;
      }
      if (!end) {
        setValidationError("end", "The item is required");
        return;
      }
      if (end <= start) {
        setValidationError("endText", "End must be after start");
        return;
      }
      props.onUpdate(start, end, values.name, values.tag);
    },
    initialValues: {
      id: props.timer.id,
      name: props.timer.name || "",
      tag: props.timer.tag || "",
      start: new Date(props.timer.start),
      end: new Date(props.timer.end!),
      startText: "",
      endText: "",
    },
    validation: {
      start(value) {
        if (!value && !values.startText?.trim()) return "The item is required";
        if (value && value > new Date()) return "Start Date must be a date in the past";
      },
      end(value) {
        if (!value && !values.endText?.trim()) return "The item is required";
        if (value && value > new Date()) return "End Date must be a date in the past";
      },
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.EditShape} title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Unnamed timer" {...itemProps.name} />
      <Form.DatePicker title="Start Date" {...itemProps.start} />
      <Form.TextField
        title="Start Override"
        placeholder="yyyy-mm-dd hh:mm (overrides picker above)"
        {...itemProps.startText}
      />
      <Form.DatePicker title="End Date" {...itemProps.end} />
      <Form.TextField
        title="End Override"
        placeholder="yyyy-mm-dd hh:mm (overrides picker above)"
        {...itemProps.endText}
      />
      <Form.TextField title="Tag" placeholder="Tag" {...itemProps.tag} />
    </Form>
  );
}

export default function Command() {
  const [timers, setTimers] = useState<Timer[]>();
  const [filteredTimers, setFilteredTimers] = useState<Timer[]>([]);

  const [search, setSearch] = useState<string>("");

  const [editingTimer, setEditingTimer] = useState<Timer | undefined>(undefined);

  useEffect(() => {
    getTimers().then(refresh);
  }, []);

  useEffect(() => {
    if (!timers) {
      return;
    }

    setFilteredTimers(timers.filter((timer) => timer.name?.toLowerCase().includes(search.toLowerCase())));
  }, [timers, search]);

  function refresh(list: TimerList) {
    const sortedTimers = Object.values(list).sort((a, b) => b.start - a.start);
    setTimers(sortedTimers);
    setFilteredTimers(sortedTimers);
  }

  if (editingTimer) {
    return (
      <EditForm
        timer={editingTimer}
        onUpdate={async (start, end, name, tag) => {
          const result = await editTimer({ ...editingTimer, start: start.getTime(), end: end.getTime(), name, tag });
          if (result === null) {
            showToast({ style: Toast.Style.Failure, title: "Timer no longer exists" });
          } else {
            getTimers().then(refresh);
          }
          setEditingTimer(undefined);
        }}
      />
    );
  }

  // Group filtered timers by day
  const dayGroups = groupTimersByDay(filteredTimers);
  const sortedDayKeys = Array.from(dayGroups.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <List
      isLoading={timers === undefined}
      searchText={search}
      searchBarPlaceholder={"Search timers..."}
      onSearchTextChange={(text) => setSearch(text)}
    >
      {sortedDayKeys.map((dayKey) => {
        const dayTimers = dayGroups.get(dayKey) || [];
        const totalDuration = dayTimers.reduce((sum, t) => sum + getDuration(t), 0);
        return (
          <List.Section key={dayKey} title={formatDateLabel(dayKey)} subtitle={formatDuration(totalDuration)}>
            {dayTimers.map((timer) => (
              <List.Item
                key={timer.id}
                title={timer.name ?? "Unnamed timer"}
                subtitle={
                  timer.end
                    ? new Date(timer.start).toLocaleTimeString() + " - " + new Date(timer.end).toLocaleTimeString()
                    : new Date(timer.start).toLocaleTimeString()
                }
                accessories={[
                  { tag: timer.tag },
                  {
                    text: (timer.end ? "\u2705 " : "\u23f3 ") + formatDuration(getDuration(timer)),
                  },
                ]}
                actions={
                  <ActionPanel>
                    {!timer.end ? (
                      <Action
                        icon={Icon.Stop}
                        title={"Stop Timer"}
                        onAction={() => {
                          launchCommand({
                            name: "stop-timer",
                            type: LaunchType.UserInitiated,
                          });
                        }}
                      />
                    ) : (
                      <Action
                        icon={Icon.Repeat}
                        title={"Start Again"}
                        onAction={() => {
                          launchCommand({
                            name: "start-timer",
                            type: LaunchType.UserInitiated,
                            arguments: {
                              name: timer.name,
                              tag: timer.tag,
                            },
                          });
                        }}
                      />
                    )}
                    <Action.CopyToClipboard
                      icon={Icon.CopyClipboard}
                      title={"Copy Duration"}
                      content={formatDuration(getDuration(timer))}
                    />
                    {!!timer.end && (
                      <Action
                        icon={Icon.EditShape}
                        title={"Edit Timer"}
                        shortcut={Keyboard.Shortcut.Common.Edit}
                        onAction={() => setEditingTimer(timer)}
                      />
                    )}
                    <Action
                      icon={Icon.Trash}
                      title={"Delete Timer"}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      onAction={async () => {
                        if (
                          await confirmAlert({
                            title: "Are you sure you want to delete this timer?",
                            message: "This action cannot be undone.",
                            icon: { source: Icon.Trash, tintColor: Color.Red },
                            primaryAction: {
                              style: Alert.ActionStyle.Destructive,
                              title: "Delete timer",
                            },
                            rememberUserChoice: true,
                          })
                        ) {
                          deleteTimer(timer.id).then(refresh);
                          await showToast({
                            title: "Timer with duration " + formatDuration(getDuration(timer)) + " deleted",
                          });
                        }
                      }}
                      style={Action.Style.Destructive}
                    />
                    <Action
                      icon={Icon.Download}
                      // eslint-disable-next-line @raycast/prefer-title-case
                      title="Export Timers as CSV"
                      shortcut={{
                        macOS: { modifiers: ["cmd"], key: "s" },
                        Windows: { modifiers: ["ctrl"], key: "s" },
                      }}
                      onAction={exportTimers}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
