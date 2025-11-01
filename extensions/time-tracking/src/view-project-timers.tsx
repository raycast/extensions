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
  Form,
} from "@raycast/api";

import { useEffect, useState } from "react";
import {
  deleteTimer,
  editTimer,
  exportTimers,
  formatDuration,
  getDuration,
  getTimers,
  Timer,
  TimerList,
} from "./Timers";

function EditForm(props: { timer: Timer; onUpdate: (start: Date, end: Date, name: string) => void }) {
  const [error, setError] = useState("");
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            onSubmit={(input) => {
              const name: string = input.name;
              const start: Date = input["start-date"];
              const end: Date = input["end-date"];
              if (start >= end) {
                setError("End Date must be after Start Date");
                return false;
              }
              if (end > new Date()) {
                setError("End Date must be a date in the past");
                return false;
              }
              props.onUpdate(start, end, name);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" id="name" defaultValue={props.timer.name || undefined} placeholder="Unnamed timer" />
      <Form.DatePicker
        title="Start Date"
        id={"start-date"}
        defaultValue={new Date(props.timer.start)}
        // This is important to clear the state of the form. Without it, subsequent submits
        // will send stale values.
        onChange={() => setError("")}
      />
      <Form.DatePicker
        error={error}
        title="End Date"
        id={"end-date"}
        defaultValue={new Date(props.timer.end!)}
        // This is important to clear the state of the form. Without it, subsequent submits
        // will send stale values.
        onChange={() => setError("")}
      />
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
    const sortedTimers = Object.values(list)
      .sort((a, b) => b.start - a.start)
      .slice(0, 50);
    setTimers(sortedTimers);
    setFilteredTimers(sortedTimers);
  }

  if (editingTimer) {
    return (
      <EditForm
        timer={editingTimer}
        onUpdate={async (start, end, name) => {
          await editTimer({ ...editingTimer, start: start.getTime(), end: end.getTime(), name });
          getTimers().then(refresh);
          setEditingTimer(undefined);
        }}
      />
    );
  }

  return (
    <List
      isLoading={timers === undefined}
      searchText={search}
      searchBarPlaceholder={"Search timers..."}
      onSearchTextChange={(text) => setSearch(text)}
    >
      {filteredTimers.map((timer) => (
        <List.Item
          key={timer.id}
          title={timer.name ?? "Unnamed timer"}
          subtitle={
            timer.end
              ? new Date(timer.start).toLocaleString() + " - " + new Date(timer.end).toLocaleString()
              : new Date(timer.start).toLocaleString()
          }
          accessories={[
            {
              text: (timer.end ? "✅ " : "⏳ ") + formatDuration(getDuration(timer)),
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
                        style: Alert.ActionStyle.Default,
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
                shortcut={{ modifiers: ["cmd"], key: "s" }}
                onAction={exportTimers}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
