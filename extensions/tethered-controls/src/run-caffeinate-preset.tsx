import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
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

  async function reload() {
    setIsLoading(true);
    try {
      setPresets(await readPresets());
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not load Caffeinate presets",
        message: detail,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Caffeinate presets">
      {presets.length === 0 && !isLoading ? <List.EmptyView title="No saved Caffeinate presets found" /> : null}
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
