import { Action, Icon } from "@raycast/api";
import { DeviceList } from "./components/DeviceList";
import { ScreenPreview } from "./components/ScreenPreview";
export default function Command() {
  return (
    <DeviceList
      actions={(phone, _, enabled) => (
        <Action.Push
          title="View Screen"
          icon={Icon.Mobile}
          target={<ScreenPreview phone={phone} allowControl={enabled} />}
        />
      )}
    />
  );
}
