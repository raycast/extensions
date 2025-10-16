import { ActionPanel, Action, List } from "@raycast/api";
import { spawnSync } from "child_process";
import { v4 as uuidv4 } from "uuid";

class Preset {
  constructor(public id?: string, public name?: string, public url?: string) {
    this.id = uuidv4();
    this.name = name ?? "";
    this.url = url ?? "writerbrew://";
  }
}

function retrievePresets() {
  const out = spawnSync("defaults read com.pradeepb28.writersbrew-AI listOfPresets", { shell: true });
  const result = String(out.output[1]).trim();

  const presetItems = result.split(",");

  const presets: Preset[] = [];

  for (const presetItem of presetItems) {
    const preset = new Preset();

    if (presetItem.startsWith("(\n")) {
      const filteredPresetItem = presetItem.replace("(\n", "").trim().replaceAll('"', "").replace("\n)", "");

      preset.name = filteredPresetItem;
      preset.url = "writerbrew://" + filteredPresetItem.replace(/ /g, "").toLowerCase();
    } else if (presetItem.endsWith("\n)")) {
      const filteredPresetItem = presetItem.replace("\n)", "").replace("\n", "").trim().replaceAll('"', "");

      preset.name = filteredPresetItem;
      preset.url = "writerbrew://" + filteredPresetItem.replace(/ /g, "").toLowerCase();
    } else {
      const filteredPresetItem = presetItem.replace("\n", "").trim().replaceAll('"', "");

      preset.name = filteredPresetItem;
      preset.url = "writerbrew://" + filteredPresetItem.replace(/ /g, "").toLowerCase();
    }

    presets.push(preset);
  }

  return presets;
}

export default function Command() {
  const presets = retrievePresets();

  if (presets.length > 0) {
    return (
      <List isLoading={false} searchBarPlaceholder="Search by preset name...">
        {presets.map((preset) => (
          <List.Item
            key={preset.id}
            title={preset.name!}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={preset.url!} />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  } else {
    return (
      <List isLoading={false}>
        <List.Item
          key="1"
          title="No presets available. Double click or tap enter here to learn more about the app."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url="https://writersbrew.app" />
            </ActionPanel>
          }
        />
      </List>
    );
  }
}
