import { List, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { exec } from "child_process";
import { showFailureToast } from "@raycast/utils";

const SCSELECT = "/usr/sbin/scselect";

function parseLocations(output: string): { name: string; active: boolean }[] {
  const lines = output.split("\n").filter((line) => line.trim().length > 0);
  const locations: { name: string; active: boolean }[] = [];
  for (const line of lines) {
    const match = line.match(/(\*?)\s*[A-Fa-f0-9-]+\s+\((.+?)\)/);
    if (match) {
      locations.push({
        name: match[2],
        active: match[1] === "*",
      });
    }
  }
  return locations;
}

export default function Command() {
  const [locations, setLocations] = useState<{ name: string; active: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = useCallback(() => {
    setLoading(true);
    exec(SCSELECT, (error, stdout, stderr) => {
      if (error) {
        setError(stderr || error.message);
        setLoading(false);
        return;
      }
      try {
        const parsed = parseLocations(stdout);
        if (parsed.length === 0) {
          setError("No network locations found or parsing failed.");
        } else {
          setLocations(parsed);
          setError(null);
        }
      } catch (e) {
        setError("Failed to parse locations: " + String(e));
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const switchLocation = (name: string) => {
    try {
      exec(`${SCSELECT} "${name}"`, (error) => {
        if (error) {
          showFailureToast(error, { title: "Failed to switch location" });
        } else {
          showToast({ style: Toast.Style.Success, title: `Switched to ${name}` });
          fetchLocations();
        }
      });
    } catch (error) {
      showFailureToast(error, { title: "Failed to switch location" });
    }
  };

  if (error) {
    return (
      <List isLoading={false}>
        <List.EmptyView title="Error" description={error} />
      </List>
    );
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search locations...">
      {locations.map((loc) => (
        <List.Item
          key={loc.name}
          title={loc.name}
          icon={{
            source: loc.active ? Icon.CheckCircle : Icon.Circle,
            tintColor: loc.active ? "#34C759" : "#8E8E93",
          }}
          accessories={[{ text: loc.active ? "Active" : "" }]}
          actions={
            <ActionPanel>
              {!loc.active && <Action title={`Switch to ${loc.name}`} onAction={() => switchLocation(loc.name)} />}
              <Action title="Refresh" onAction={fetchLocations} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
