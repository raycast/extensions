import { useDeviceList } from "./hooks/useDeviceList";
import { MULLVAD_DEVICE_TAG } from "./shared";
import DeviceList from "./components/DeviceList";

export default function AllDevices() {
  const { devices, error, isLoading } = useDeviceList({
    filter: (device) => !device.tags?.includes(MULLVAD_DEVICE_TAG),
    errorMessage: "Couldn't load device list.",
  });

  return <DeviceList devices={devices} error={error} isLoading={isLoading} showLoginName={true} />;
}
