import { List, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/query-client";
import { DeviceItem } from "./components/DeviceItem";
import { CredentialsRequiredEmptyView, NoDevicesEmptyView } from "./components/EmptyStates";
import { useAtombergDevices } from "./hooks";
import { groupDevicesByRoom, getSortedRooms, hasValidCredentials } from "./utils/device-utils";
import type { Preferences } from "./types";

function DeviceListContent() {
  const preferences = getPreferenceValues<Preferences>();
  const { devices, isLoading, refreshDevices, toggleDevice } = useAtombergDevices(preferences);

  const credentialsValid = hasValidCredentials(preferences.apiKey, preferences.refreshToken);

  if (!credentialsValid && !isLoading) {
    return (
      <List>
        <CredentialsRequiredEmptyView onOpenPreferences={openExtensionPreferences} />
      </List>
    );
  }

  if (!devices || devices.length === 0) {
    return (
      <List>
        <NoDevicesEmptyView onAction={refreshDevices} onOpenPreferences={openExtensionPreferences} />
      </List>
    );
  }

  const devicesByRoom = groupDevicesByRoom(devices);
  const sortedRooms = getSortedRooms(devicesByRoom);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search devices...">
      {sortedRooms.map((room) => (
        <List.Section key={room} title={room}>
          {devicesByRoom[room].map((device) => (
            <DeviceItem
              key={device.device_id}
              device={device}
              onToggle={toggleDevice}
              onRefresh={refreshDevices}
              onOpenPreferences={openExtensionPreferences}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

export default function Command() {
  return (
    <QueryClientProvider client={queryClient}>
      <DeviceListContent />
    </QueryClientProvider>
  );
}
