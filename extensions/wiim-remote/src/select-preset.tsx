import { List, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { WiiMAPI } from "./wiim/api";
import { WiiMAPIError } from "./wiim/errors";
import { resolveDevice } from "./wiim/discovery";

const PRESETS = Array.from({ length: 12 }, (_, i) => ({ index: i, label: `Preset ${i + 1}` }));

async function handleSelect(index: number) {
  try {
    const device = await resolveDevice();
    const api = new WiiMAPI(device);
    await api.selectPreset(index);
    showToast({ style: Toast.Style.Success, title: `Preset ${index + 1} selected` });
  } catch (error) {
    if (error instanceof WiiMAPIError) {
      const hint = error.getHint();
      showFailureToast(hint.title, { message: hint.message });
    } else {
      showFailureToast("Failed to select preset", { message: String(error) });
    }
  }
}

export default function Command() {
  return (
    <List navigationTitle="Select Preset">
      {PRESETS.map((preset) => (
        <List.Item
          key={preset.index}
          icon={Icon.Music}
          title={preset.label}
          actions={
            <ActionPanel>
              <Action title="Play Preset" onAction={() => handleSelect(preset.index)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
