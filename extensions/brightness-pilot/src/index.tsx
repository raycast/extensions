import { useEffect, useMemo, useState } from "react";
import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
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

  const { data = [], isLoading, error, revalidate } = usePromise(getMonitors);

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
        title={error ? "Extension Error" : "No Monitors Found"}
        description={
          error
            ? error.message
            : searchText
              ? "Maybe they're hiding, or taking a break? Try connecting one or adjusting your search!"
              : "Something strange happened while fetching monitors"
        }
      />
      <List.Section title="Built-in Monitors">
        {filteredMonitors.builtIn.map((monitor) => (
          <MonitorListItem
            key={monitor.id}
            monitor={monitor}
            setMonitors={setMonitors}
            revalidate={async () => {
              setMonitors([]);
              await revalidate();
            }}
          />
        ))}
      </List.Section>
      <List.Section title="External Monitors">
        {filteredMonitors.external.map((monitor) => (
          <MonitorListItem
            key={monitor.id}
            monitor={monitor}
            setMonitors={setMonitors}
            revalidate={async () => {
              setMonitors([]);
              await revalidate();
            }}
          />
        ))}
      </List.Section>
    </List>
  );
}