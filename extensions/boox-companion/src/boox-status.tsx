import { Icon, launchCommand, LaunchType, MenuBarExtra, openExtensionPreferences } from "@raycast/api";
import { useConnectedBoox } from "./hooks/use-connected-boox";
import { formatBytes } from "./lib/format";

export default function BooxStatus() {
  const connection = useConnectedBoox();
  const device = connection.data?.device;
  const available =
    device?.storageTotal !== undefined && device.storageUsed !== undefined
      ? Math.max(0, device.storageTotal - device.storageUsed)
      : undefined;

  return (
    <MenuBarExtra
      icon={device ? Icon.Mobile : Icon.Mobile}
      tooltip={device ? `${device.model} is online` : "BOOX is unavailable"}
      isLoading={connection.isLoading}
    >
      {device ? (
        <>
          <MenuBarExtra.Item title={device.nickname || device.model} subtitle="Online" />
          {available !== undefined ? (
            <MenuBarExtra.Item title="Available Storage" subtitle={formatBytes(available)} />
          ) : null}
          <MenuBarExtra.Separator />
          <MenuBarExtra.Item
            title="Send to BOOX"
            icon={Icon.Upload}
            onAction={() => launchCommand({ name: "send-to-boox", type: LaunchType.UserInitiated })}
          />
          <MenuBarExtra.Item
            title="Open BOOX"
            icon={Icon.AppWindow}
            onAction={() => launchCommand({ name: "boox", type: LaunchType.UserInitiated })}
          />
          <MenuBarExtra.Item
            title="Open Screen"
            icon={Icon.Monitor}
            onAction={() => launchCommand({ name: "open-boox-screen", type: LaunchType.UserInitiated })}
          />
          <MenuBarExtra.Item
            title="Capture Screen"
            icon={Icon.Camera}
            onAction={() => launchCommand({ name: "capture-boox-screen", type: LaunchType.UserInitiated })}
          />
          <MenuBarExtra.Item
            title="Capture Region"
            icon={Icon.Crop}
            onAction={() => launchCommand({ name: "capture-boox-region", type: LaunchType.UserInitiated })}
          />
        </>
      ) : (
        <MenuBarExtra.Item title="BOOX Unavailable" icon={Icon.WifiDisabled} onAction={connection.revalidate} />
      )}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={connection.revalidate} />
      <MenuBarExtra.Item title="Preferences…" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </MenuBarExtra>
  );
}
