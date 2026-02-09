import { List, Icon } from "@raycast/api";
import type { Device, ErrorDetails } from "../shared";
import DeviceItem from "./DeviceItem";

type DeviceListProps = {
  devices: Device[] | undefined;
  error: ErrorDetails | undefined;
  isLoading: boolean;
  showLoginName?: boolean;
};

export default function DeviceList({ devices, error, isLoading, showLoginName = true }: DeviceListProps) {
  return (
    <List isLoading={isLoading}>
      {error ? (
        <List.EmptyView icon={Icon.Warning} title={error.title} description={error.description} />
      ) : (
        devices?.map((device) => <DeviceItem key={device.key} device={device} showLoginName={showLoginName} />)
      )}
    </List>
  );
}
