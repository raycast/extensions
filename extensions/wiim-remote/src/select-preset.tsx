import { List, ActionPanel, Action, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { WiiMAPI } from "./wiim/api";
import { WiiMAPIError } from "./wiim/errors";
import { resolveDevice } from "./wiim/discovery";

const PRESETS = Array.from({ length: 12 }, (_, i) => ({ index: i, label: `Preset ${i + 1}` }));

export default function Command() {
  const { pop } = useNavigation();

  async function handleSelect(index: number) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Loading Preset ${index + 1}…` });
    try {
      const device = await resolveDevice();
      const api = new WiiMAPI(device);
      await api.selectPreset(index);

      // Wait briefly for the device to start playing, then fetch track info
      await new Promise((r) => setTimeout(r, 1500));
      const status = await api.getPlayerStatus();

      const title = status.title || `Preset ${index + 1}`;
      const message = status.artist ? status.artist : undefined;

      toast.style = Toast.Style.Success;
      toast.title = title;
      toast.message = message;
      pop();
    } catch (error) {
      if (error instanceof WiiMAPIError) {
        const hint = error.getHint();
        showFailureToast(hint.title, { message: hint.message });
      } else {
        showFailureToast("Failed to select preset", { message: String(error) });
      }
    }
  }

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
