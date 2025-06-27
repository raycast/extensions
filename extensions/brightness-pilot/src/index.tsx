import { useEffect, useMemo, useState } from "react";
import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getMonitors } from "./utils/get-monitors";
import { Monitor } from "./types";
import { MonitorListItem } from "./components/MonitorListItem";

export default function Command() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [searchText, setSearchText] = useState("");

  const filteredMonitors = useMemo(() => {
    const res = !searchText
      ? monitors
      : monitors.filter(
          (monitor) =>
            monitor.name.toLowerCase().includes(searchText.toLowerCase()) || monitor.id.toString().includes(searchText),
        );

    return {
      builtIn: res.filter((monitor) => monitor.isBuiltIn),
      external: res.filter((monitor) => !monitor.isBuiltIn),
    };
  }, [monitors, searchText]);

  const { data = [], isLoading, error } = useCachedPromise(() => getMonitors());

  useEffect(() => {
    if (isLoading || data.length === 0 || monitors.length > 0) return;
    setMonitors(data);
  }, [isLoading, data, monitors.length]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search monitors..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      <List.EmptyView
        icon={error ? "😩" : "😿"}
        title="No monitors found"
        description={
          error
            ? "Mayday, mayday! Something's broken in monitor-land! Please try again later (or open an issue on GitHub if it persists)."
            : searchText
              ? "Maybe they're hiding, or taking a break? Try connecting one or adjusting your search!"
              : "Something strange happened while fetching monitors"
        }
      />
      <List.Section title="Built-in Monitors">
        {filteredMonitors.builtIn.map((monitor) => (
          <MonitorListItem key={monitor.id} monitor={monitor} setMonitors={setMonitors} />
        ))}
      </List.Section>
      <List.Section title="External Monitors">
        {filteredMonitors.external.map((monitor) => (
          <MonitorListItem key={monitor.id} monitor={monitor} setMonitors={setMonitors} />
        ))}
      </List.Section>
    </List>
  );
}
