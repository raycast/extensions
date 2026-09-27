import { Action, ActionPanel, Icon, List, showHUD, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { JSX } from "react";
import { refreshMenuBar, showSpotifastError } from "./control";
import {
  Device,
  getDevices,
  openSpotifast,
  run,
  SpotifastNotInstalledError,
  SpotifastNotRunningError,
} from "./spotifast";

export default function Command(): JSX.Element {
  const { data, isLoading, error, revalidate } = useCachedPromise(getDevices, [], {
    keepPreviousData: true,
    // The list shows the error itself, so the default failure toast would repeat it.
    onError: () => undefined,
  });

  async function transfer(device: Device) {
    try {
      await run("transfer", device.id);
      await refreshMenuBar();
      await showHUD(`Playing on ${device.name}`);
    } catch (transferError) {
      await showSpotifastError(transferError);
    }
  }

  if (error instanceof SpotifastNotInstalledError || error instanceof SpotifastNotRunningError) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title={error.message}
          actions={
            <ActionPanel>
              {error instanceof SpotifastNotRunningError ? (
                <Action
                  title="Open Spotifast"
                  icon={Icon.AppWindow}
                  onAction={() => openSpotifast().then(revalidate).catch(showSpotifastError)}
                />
              ) : (
                <Action.OpenInBrowser title="Download Spotifast" url="https://spotifast.rocks/download/" />
              )}
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search devices">
      <List.EmptyView
        icon={Icon.Devices}
        title={error ? "Could not list devices" : "No devices found"}
        description={error?.message ?? "Open Spotify on another device to see it here."}
        actions={
          <ActionPanel>
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
          </ActionPanel>
        }
      />
      {data?.map((device) => (
        <List.Item
          key={device.id}
          icon={deviceIcon(device.kind)}
          title={device.name}
          subtitle={device.kind}
          accessories={device.active ? [{ icon: Icon.SpeakerOn, text: "Playing" }] : []}
          actions={
            <ActionPanel>
              <Action title="Transfer Playback" icon={Icon.Play} onAction={() => transfer(device)} />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function deviceIcon(kind: string): Icon {
  switch (kind.toLowerCase()) {
    case "computer":
      return Icon.Desktop;
    case "smartphone":
    case "tablet":
      return Icon.Mobile;
    case "tv":
      return Icon.Monitor;
    default:
      return Icon.Speaker;
  }
}
