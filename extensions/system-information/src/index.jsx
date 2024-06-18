import { Action, ActionPanel, environment, Icon, List } from "@raycast/api";
import { exec } from "child_process";
import macosRelease from "macos-release";
import { macOSVersion } from "macos-version";
import os from "os";
import { useEffect, useState } from "react";
import si from "systeminformation";

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
  const [networkDevices, setNetworkDevices] = useState([]);

  useEffect(() => {
    calculateDiskStorage().then((size) => {
      setStorageInfo(size);
    });

    exec("/usr/sbin/system_profiler SPHardwareDataType", (error, stdout, stderr) => {
      if (error) {
        setSerialNumber(`Error: ${error.message}`);
        return;
      }
      if (stderr) {
        setSerialNumber(`stderr: ${stderr}`);
        return;
      }

      const serialNumberMatch = stdout.match(/Serial Number \(system\): (.+)/);
      const serialNumber = serialNumberMatch ? serialNumberMatch[1] : null;

      setSerialNumber(serialNumber);
    });

    const networkInterfaces = os.networkInterfaces();
    const devices = [];

    for (const [name, interfaces] of Object.entries(networkInterfaces)) {
      for (const interfaceObj of interfaces) {
        if (interfaceObj.family === "IPv4" && !interfaceObj.internal) {
          devices.push({ name, ip: interfaceObj.address });
        }
      }
    }

    setNetworkDevices(devices);
  }, []);

  const releaseImage = () => {
    switch (macosRelease().name) {
      // TODO: macOS 15 betas doesn't report themselves as "Sequoia", instead "macOS 15" shows up
      // case "Sequoia":
      //   return `${environment.assetsPath}/macos_sequoia.png`;
      case "Sonoma":
        return `${environment.assetsPath}/macos_sonoma.png`;
      case "Ventura":
        return `${environment.assetsPath}/macos_ventura.png`;
      case "Monterey":
        return `${environment.assetsPath}/macos_monterey.png`;
      default:
        return "ERROR";
    }
  };

  return (
    <List>
      <List.Section title={`About This Mac`}>
        <List.Item
          icon={Icon.Person}
          title="Hostname"
          accessories={[{ text: os.hostname().replace(/\.local/g, "") }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Hostname" content={os.hostname().replace(/\.local/g, "")} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.ComputerChip}
          title="Chip"
          accessories={[{ text: os.cpus()[0].model }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Chip Model" content={os.cpus()[0].model} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.MemoryChip}
          title="Memory"
          accessories={[{ text: os.totalmem() / (1024 * 1024 * 1024) + " GB" }]}
        />
        <List.Item
          icon={Icon.Hashtag}
          title="Serial Number"
          accessories={[{ text: serialNumber || "-" }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title={`Copy Serial Number`} content={serialNumber || "-"} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="macOS">
        <List.Item
          icon={releaseImage() == "ERROR" ? Icon.Gear : releaseImage()}
          title={`macOS ${macosRelease().name == "Unknown" ? macOSVersion().split(".")[0] : `${macosRelease().name}`}`}
          accessories={[{ text: `Version ${macOSVersion()}` }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy macOS Version"
                content={`macOS ${macosRelease().name == "Unknown" ? macOSVersion() : `${macosRelease().name}`}`}
              />
            </ActionPanel>
          }
        />

        <List.Item
          icon={Icon.Info}
          title={`Darwin Kernel`}
          accessories={[{ text: `${os.version().replace("Darwin Kernel", "")}` }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Kernel Version" content={os.version()} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Storage">
        <List.Item
          icon={Icon.HardDrive}
          title="Macintosh HD"
          accessories={[{ text: storageInfo, tooltip: "This information may be inaccurate" }]}
          actions={
            <ActionPanel>
              <Action.Open
                target="x-apple.systempreferences:com.apple.settings.Storage"
                title="Open Storage Settings"
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Network">
        {networkDevices.map((device) => (
          <List.Item
            key={device.name}
            icon={Icon.Globe}
            title={device.name}
            accessories={[{ text: device.ip }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy IP Address" content={device.ip} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
