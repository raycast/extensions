import { Action, Icon } from "@raycast/api";
import { DeviceList } from "./components/DeviceList";
import { ScreenTextView } from "./components/ScreenTextView";
export default function Command() {
  return (
    <DeviceList
      actions={(phone, _, enabled) =>
        enabled && <Action.Push title="Read Screen Text" icon={Icon.Text} target={<ScreenTextView phone={phone} />} />
      }
    />
  );
}
