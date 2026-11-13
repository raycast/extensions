import { Action, ActionPanel, Icon } from "@raycast/api";
import { formatBytes, startDownload } from "./downloads";
import { FirmwareList, hasFirmware } from "./firmware";
import { Installer, Platform } from "./sofa";

function installerBaseName(installer: Installer): string {
  return `Install ${installer.name} ${installer.version} (${installer.build})`;
}

function InstallerFormatActions({ installer, withShortcuts }: { installer: Installer; withShortcuts: boolean }) {
  const label = `${installer.name} ${installer.version} (${installer.build})`;
  return (
    <>
      <Action
        title="Download Installer Package"
        icon={Icon.Download}
        shortcut={withShortcuts ? { modifiers: ["cmd", "shift"], key: "i" } : undefined}
        onAction={() =>
          startDownload({
            url: installer.url,
            fileName: `${installerBaseName(installer)}.pkg`,
            title: `${label} installer`,
            size: installer.size,
          })
        }
      />
      <Action
        title="Create Installer ISO"
        icon={Icon.Cd}
        shortcut={withShortcuts ? { modifiers: ["cmd", "opt"], key: "i" } : undefined}
        onAction={() =>
          startDownload({
            url: installer.url,
            fileName: `${installerBaseName(installer)}.iso`,
            title: `${label} ISO`,
            size: installer.size,
            buildIso: true,
          })
        }
      />
    </>
  );
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
      {installers.length === 1 && <InstallerFormatActions installer={installers[0]} withShortcuts={withShortcuts} />}
      {installers.length > 1 && (
        <ActionPanel.Submenu
          title="Download Installer…"
          icon={Icon.Download}
          shortcut={withShortcuts ? { modifiers: ["cmd", "shift"], key: "i" } : undefined}
        >
          {installers.map((installer) => (
            <ActionPanel.Submenu
              key={installer.build}
              icon={Icon.Tag}
              title={`${installer.version} (${installer.build})${installer.size ? ` · ${formatBytes(installer.size)}` : ""}…`}
            >
              <InstallerFormatActions installer={installer} withShortcuts={false} />
            </ActionPanel.Submenu>
          ))}
        </ActionPanel.Submenu>
      )}
    </>
  );
}
