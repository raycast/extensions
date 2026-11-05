import { Action, Icon } from "@raycast/api";
import { DeviceList } from "./components/DeviceList";
import { ScreenTextView } from "./components/ScreenTextView";
export default function Command() {
  return (
    <DeviceList
      title="Read Screen Text"
      actions={(phone, _, enabled) =>
        enabled && <Action.Push title="Read Screen Text" icon={Icon.Text} target={<ScreenTextView phone={phone} />} />
      }
    />
  );
}
