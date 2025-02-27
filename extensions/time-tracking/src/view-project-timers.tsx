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
} from "@raycast/api";
import { useEffect, useState } from "react";
import { deleteTimer, exportTimers, formatDuration, getDuration, getTimers, Timer, TimerList } from "./Timers";

export default function Command() {
  const [timers, setTimers] = useState<Timer[]>();
  const [filteredTimers, setFilteredTimers] = useState<Timer[]>([]);

  const [search, setSearch] = useState<string>("");

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
