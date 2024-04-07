import { Action, ActionPanel, launchCommand, LaunchType, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { deleteTimer, formatDuration, getDuration, getTimers, Timer, TimerList } from "./Timers";

export default function Command() {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [filteredTimers, setFilteredTimers] = useState<Timer[]>([]);

  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    getTimers().then(refresh);
  }, []);

  useEffect(() => {
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
    <List searchText={search} searchBarPlaceholder={"Search timers..."} onSearchTextChange={(text) => setSearch(text)}>
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
              <Action
                title={"Delete Timer"}
                onAction={() => {
                  deleteTimer(timer.id).then(refresh);
                }}
                style={Action.Style.Destructive}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
