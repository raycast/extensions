import { Action, ActionPanel, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { readStoredItems } from "./read-stored-items";
import { runControl } from "./run-control";

type Preset = { id: string; name: string };

async function readPresets(): Promise<Preset[]> {
  return readStoredItems<Preset>(
    "caffeinatePresets",
    (preset): preset is Preset =>
      typeof preset === "object" &&
      preset !== null &&
      "id" in preset &&
      typeof preset.id === "string" &&
      "name" in preset &&
      typeof preset.name === "string" &&
      preset.name.length > 0,
  );
}

export default function Command() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();

  async function reload() {
    setIsLoading(true);
    try {
      setPresets(await readPresets());
      setLoadError(undefined);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setLoadError(detail);
      await showFailureToast(error, { title: "Could not load Caffeinate presets" });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Caffeinate presets">
      {presets.length === 0 && !isLoading ? (
        <List.EmptyView
          title={loadError ? "Could not load Caffeinate presets" : "No saved Caffeinate presets found"}
          description={loadError}
          actions={
            <ActionPanel>
              <Action title="Refresh Presets" onAction={reload} />
            </ActionPanel>
          }
        />
      ) : null}
      {presets.map((preset) => (
        <List.Item
          key={preset.id}
          title={preset.name}
          actions={
            <ActionPanel>
              <Action
                title="Run Preset"
                onAction={() =>
                  runControl(`/caffeinate/preset?name=${encodeURIComponent(preset.name)}`, `Run ${preset.name}`)
                }
              />
              <Action title="Refresh Presets" onAction={reload} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
