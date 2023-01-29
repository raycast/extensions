import { List, showToast, Toast } from "@raycast/api";
import { useGetMyDevices } from "./spotify/client";
import { SpotifyProvider } from "./utils/context";
import PlaybackDeviceItem from "./components/PlaybackDeviceItem";

function TransferPlaybackToDevice() {
  const response = useGetMyDevices();

  if (response.error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Unable to retrieve device list.",
      message: response.error,
    });
  }

  const devices = response.result?.devices.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "accent" })
  );

  return (
    <List searchBarPlaceholder="Search devices..." isLoading={response.isLoading} throttle enableFiltering>
      {devices?.map((d, idx) => (
        <PlaybackDeviceItem key={d.id ?? idx} device={d} />
      ))}
    </List>
  );
}

export default () => (
  <SpotifyProvider>
    <TransferPlaybackToDevice />
  </SpotifyProvider>
);
