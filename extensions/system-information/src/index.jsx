import { useState, useEffect } from "react";
import { Icon, List, Action, environment, ActionPanel } from "@raycast/api";
import { macOSVersion } from "macos-version";
import macosRelease from "macos-release";
import os from "os";
import si from "systeminformation";
import { exec } from "child_process";
async function calculateDiskStorage() {
  const disks = await si.fsSize();

  const diskObj = disks[0];
  const totalSize = (diskObj.size / (1024 * 1024 * 1024)).toFixed(2);
  const totalAvailableStorage = (diskObj.available / (1024 * 1024 * 1024)).toFixed(2);

  return `${totalAvailableStorage} GB available of ${totalSize} GB`;
}

export default function Command() {
  const [storageInfo, setStorageInfo] = useState("");
  const [serialNumber, setSerialNumber] = useState("");

  useEffect(() => {
    calculateDiskStorage().then((size) => {
      setStorageInfo(size);
    });

    exec("/usr/sbin/system_profiler SPHardwareDataType", (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
        return;
      }

      const serialNumberMatch = stdout.match(/Serial Number \(system\): (.+)/);
      const serialNumber = serialNumberMatch ? serialNumberMatch[1] : null;

      setSerialNumber(serialNumber);
    });
  }, []);

  const releaseImage = () => {
    switch (macosRelease().name) {
      case "Sonoma":
        return `${environment.assetsPath}/macos_sonoma.png`;
      case "Ventura":
        return `${environment.assetsPath}/macos_ventura.png`;
      case environment.assetsPath + "Monterey":
        return `${environment.assetsPath}/macos_monterey.png`;
      case "Big Sur":
        return `${environment.assetsPath}/macos_big_sur.png`;
      case "Catalina":
        return `${environment.assetsPath}/macos_catalina.png`;
      case "Mojave":
        return "Mojave";
      case "High Sierra":
        return "HighSierra";
      case "Sierra":
        return "Sierra";
      case "El Capitan":
        return "ElCapitan";
      case "Yosemite":
        return "Yosemite";
      case "Mavericks":
        return "Mavericks";
      case "Mountain Lion":
      default:
        return "";
    }
  };

  return (
    <List>
      <List.Section title="Hardware Specifications">
        <List.Item
          icon={Icon.Person}
          title="Hostname"
          accessories={[{ text: os.hostname().replace(/\.local/g, "") }]}
          actions={
            <ActionPanel>
              <Action.Open
                target="x-apple.systempreferences:com.apple.SystemProfiler.AboutExtension"
                title="Open in System Settings"
                icon={Icon.Cog}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.ComputerChip}
          title="Chip"
          accessories={[{ text: os.cpus()[0].model }]}
          actions={
            <ActionPanel>
              <Action.Open
                target="x-apple.systempreferences:com.apple.SystemProfiler.AboutExtension"
                title="Open in System Settings"
                icon={Icon.Cog}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.MemoryChip}
          title="Memory"
          accessories={[{ text: os.totalmem() / (1024 * 1024 * 1024) + " GB" }]}
          actions={
            <ActionPanel>
              <Action.Open
                target="x-apple.systempreferences:com.apple.SystemProfiler.AboutExtension"
                title="Open in System Settings"
                icon={Icon.Cog}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Hashtag}
          title="Serial Number"
          accessories={[{ text: serialNumber || "-" }]}
          actions={
            <ActionPanel>
              <Action.Open
                target="x-apple.systempreferences:com.apple.SystemProfiler.AboutExtension"
                title="Open in System Settings"
                icon={Icon.Cog}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="macOS">
        <List.Item
          icon={releaseImage()}
          title={`macOS ${macosRelease().name}`}
          accessories={[{ text: `Version ${macOSVersion()}` }]}
          actions={
            <ActionPanel>
              <Action.Open
                target="x-apple.systempreferences:com.apple.preferences.softwareupdate?client=softwareupdateapp"
                title="Check for Updates"
                icon={Icon.RotateClockwise}
              />
              <Action.Open
                target="x-apple.systempreferences:com.apple.SystemProfiler.AboutExtension"
                title="Open in System Settings"
                icon={Icon.Cog}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Storage">
        <List.Item
          icon={Icon.HardDrive} //com.apple.settings.Storage
          title="Macintosh HD"
          accessories={[
            {
              text: storageInfo,
              tooltip: "This information may be inaccurate",
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Open target="x-apple.systempreferences:com.apple.settings.Storage" title="Storage Settings" />
              <Action.Open
                target="x-apple.systempreferences:com.apple.SystemProfiler.AboutExtension"
                title="Open in System Settings"
                icon={Icon.Cog}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
