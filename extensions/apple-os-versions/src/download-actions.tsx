import { Action, ActionPanel, Icon } from "@raycast/api";
import { formatBytes, startDownload } from "./downloads";
import { FirmwareList, hasFirmware } from "./firmware";
import { Installer, Platform } from "./sofa";

function installerBaseName(installer: Installer): string {
  return `Install ${installer.name} ${installer.version} (${installer.build})`;
}

function downloadInstaller(installer: Installer) {
  return startDownload({
    url: installer.url,
    fileName: `${installerBaseName(installer)}.pkg`,
    title: `${installer.name} ${installer.version} (${installer.build}) installer`,
    size: installer.size,
  });
}

// Firmware for every platform with restore images, plus full installers for macOS releases SOFA has one for.
export function DownloadActions(props: {
  platform: Platform;
  title: string;
  version: string;
  installers: Installer[];
  withShortcuts?: boolean;
}) {
  const { installers, withShortcuts = false } = props;
  return (
    <>
      {hasFirmware(props.platform) && (
        <Action.Push
          title="Download Firmware…"
          icon={Icon.HardDrive}
          shortcut={withShortcuts ? { modifiers: ["cmd", "shift"], key: "d" } : undefined}
          target={<FirmwareList platform={props.platform} title={props.title} version={props.version} />}
        />
      )}
      {installers.length === 1 && (
        <Action
          title="Download Installer Package"
          icon={Icon.Download}
          shortcut={withShortcuts ? { modifiers: ["cmd", "shift"], key: "i" } : undefined}
          onAction={() => downloadInstaller(installers[0])}
        />
      )}
      {installers.length > 1 && (
        <ActionPanel.Submenu
          title="Download Installer Package…"
          icon={Icon.Download}
          shortcut={withShortcuts ? { modifiers: ["cmd", "shift"], key: "i" } : undefined}
        >
          {installers.map((installer) => (
            <Action
              key={installer.build}
              icon={Icon.Tag}
              title={`${installer.version} (${installer.build})${installer.size ? ` · ${formatBytes(installer.size)}` : ""}`}
              onAction={() => downloadInstaller(installer)}
            />
          ))}
        </ActionPanel.Submenu>
      )}
    </>
  );
}
