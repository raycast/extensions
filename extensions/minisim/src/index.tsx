import { List } from "@raycast/api";
import { Command, DeviceType, Platform } from "./types";
import DeviceList from "./DeviceList";
import useDevices from "./useDevices";
import ErrorScreen from "./ErrorScreen";

export default function Command() {
  const {
    devices: iosPhysicalDevices,
    commands: iosPhysicalDevicesCommands,
    isError: isIosPhysicalDevicesError,
  } = useDevices(Platform.ios, DeviceType.physical);
  const {
    devices: iosVirtualDevices,
    commands: iosVirtualDevicesCommands,
    isError: isIosVirtualDevicesError,
  } = useDevices(Platform.ios, DeviceType.virtual);
  const {
    devices: androidPhysicalDevices,
    commands: androidPhysicalDevicesCommands,
    isError: isAndroidPhysicalDevicesError,
  } = useDevices(Platform.android, DeviceType.physical);
  const {
    devices: androidVirtualDevices,
    commands: androidVirtualDevicesCommands,
    isError: isAndroidVirtualDevicesError,
  } = useDevices(Platform.android, DeviceType.virtual);

  const isLoading =
    iosPhysicalDevices.length === 0 &&
    androidPhysicalDevices.length === 0 &&
    iosVirtualDevices.length === 0 &&
    androidVirtualDevices.length === 0;

  const isError =
    isIosPhysicalDevicesError ||
    isAndroidPhysicalDevicesError ||
    isIosVirtualDevicesError ||
    isAndroidVirtualDevicesError;

  if (isError) {
    return <ErrorScreen />;
  }

  return (
    <List isLoading={isLoading && !isError}>
      <DeviceList name="Android Devices" devices={androidPhysicalDevices} commands={androidPhysicalDevicesCommands} />
      <DeviceList name="Android Emulators" devices={androidVirtualDevices} commands={androidVirtualDevicesCommands} />
      <DeviceList name="iOS Devices" devices={iosPhysicalDevices} commands={iosPhysicalDevicesCommands} />
      <DeviceList name="iOS Simulators" devices={iosVirtualDevices} commands={iosVirtualDevicesCommands} />
    </List>
  );
}
