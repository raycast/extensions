import { List, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { WiiMAPI } from "./wiim/api";
import { WiiMAPIError } from "./wiim/errors";
import { resolveDevice } from "./wiim/discovery";
import type { InputSource } from "./wiim/types";

const INPUTS: { source: InputSource; title: string; icon: Icon }[] = [
  { source: "wifi", title: "WiFi / Streaming", icon: Icon.Wifi },
  { source: "bluetooth", title: "Bluetooth", icon: Icon.Bluetooth },
  { source: "line-in", title: "Line In", icon: Icon.Plug },
  { source: "optical", title: "Optical", icon: Icon.Circle },
  { source: "usb", title: "USB", icon: Icon.Desktop },
];

export default function Command() {
  async function handleSelect(source: InputSource) {
    try {
      const device = await resolveDevice();
      const api = new WiiMAPI(device);
      await api.switchInput(source);
      const label = INPUTS.find((i) => i.source === source)?.title ?? source;
      await showToast({ style: Toast.Style.Success, title: `Switched to ${label}` });
    } catch (error) {
      if (error instanceof WiiMAPIError) {
        const hint = error.getHint();
        showFailureToast(hint.title, { message: hint.message });
      } else {
        showFailureToast("Failed to switch input", { message: String(error) });
      }
    }
  }

  return (
    <List navigationTitle="Switch Input">
      {INPUTS.map((input) => (
        <List.Item
          key={input.source}
          icon={input.icon}
          title={input.title}
          actions={
            <ActionPanel>
              <Action title="Select Input" onAction={() => handleSelect(input.source)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
