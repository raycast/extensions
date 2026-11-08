import { Action, Icon } from "@raycast/api";
import { DeviceList } from "./components/DeviceList";
import { QuickActions } from "./components/QuickActions";
export default function Command() {
  return (
    <DeviceList
      actions={(phone, _, enabled) =>
        enabled && <Action.Push title="Open Quick Actions" icon={Icon.Bolt} target={<QuickActions phone={phone} />} />
      }
    />
  );
}
