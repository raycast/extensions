import { List } from "@raycast/api";
import { Command, Platform } from "./types";
import DeviceList from "./DeviceList";
import useDevices from "./useDevices";
import ErrorScreen from "./ErrorScreen";

export default function Command() {
  const { devices: iosDevices, commands: iosCommands, isError: isIosError } = useDevices(Platform.ios);
  const { devices: androidDevices, commands: androidCommands, isError: isAndroidError } = useDevices(Platform.android);

  const isLoading = androidDevices.length === 0 && iosDevices.length === 0;
  const isError = isAndroidError || isIosError;

  if (isError) {
    return <ErrorScreen />;
  }

  return (
    <List isLoading={isLoading && !isError}>
      <DeviceList name="Android" platform={Platform.android} devices={androidDevices} commands={androidCommands} />
      <DeviceList name="iOS" platform={Platform.ios} devices={iosDevices} commands={iosCommands} />
    </List>
  );
}
