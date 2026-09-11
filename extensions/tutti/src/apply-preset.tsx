import { Action, ActionPanel, closeMainWindow, Icon, List } from "@raycast/api";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { runTuttiAction } from "./tutti";

interface Preset {
  id: string;
  name: string;
  icon?: string;
}

// Mirror of Tutti's Preset Export path (PresetExport.fileURL). A cache that may
// lag by one save; addressed by id, displayed by name/icon.
const EXPORT_PATH = join(homedir(), "Library", "Application Support", "Tutti", "presets.json");

function readPresets(): Preset[] {
  try {
    if (!existsSync(EXPORT_PATH)) return [];
    const data: unknown = JSON.parse(readFileSync(EXPORT_PATH, "utf8"));
    if (!Array.isArray(data)) return [];
    return data.filter((p): p is Preset => typeof p?.id === "string" && typeof p?.name === "string");
  } catch {
    return [];
  }
}

export default function ApplyPreset() {
  const presets = readPresets();

  async function apply(preset: Preset) {
    await closeMainWindow();
    await runTuttiAction(`tutti://preset?id=${encodeURIComponent(preset.id)}`, `Applied ${preset.name}`);
  }

  return (
    <List>
      {presets.length === 0 ? (
        <List.EmptyView
          icon={Icon.SpeakerHigh}
          title="No Presets"
          description="Save a preset in Tutti (requires Tutti Pro) to see it here."
        />
      ) : (
        presets.map((preset) => (
          <List.Item
            key={preset.id}
            title={preset.name}
            icon={preset.icon ? preset.icon : Icon.SpeakerHigh}
            actions={
              <ActionPanel>
                <Action title="Apply Preset" icon={Icon.Play} onAction={() => apply(preset)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
