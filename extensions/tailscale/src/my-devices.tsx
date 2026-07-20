import { useDeviceList } from "./hooks/useDeviceList";
import DeviceList from "./components/DeviceList";

export default function MyDeviceList() {
  const { devices, error, isLoading } = useDeviceList({
    filter: (device, status) => device.userid === status.Self.UserID.toString(),
    errorMessage: "Couldn't load device list.",
  });

  return <DeviceList devices={devices} error={error} isLoading={isLoading} showLoginName={false} />;
}
