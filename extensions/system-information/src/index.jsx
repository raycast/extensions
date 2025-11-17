import { Action, ActionPanel, environment, Icon, List } from "@raycast/api";
import { exec } from "child_process";
import macosRelease from "macos-release";
import { macOSVersion } from "macos-version";
import os from "os";
import { useEffect, useState } from "react";
import si from "systeminformation";

import { getStorageInfo } from "swift:../swift";

export default function Command() {
  const [storageInfo, setStorageInfo] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [networkDevices, setNetworkDevices] = useState([]);
  const [processes, setProcesses] = useState([]);

  const releaseImage = () => {
    switch (macosRelease().name) {
      case "Sonoma":
        return `${environment.assetsPath}/macos_sonoma.png`;
      case "Ventura":
        return `${environment.assetsPath}/macos_ventura.png`;
      case "Monterey":
        return `${environment.assetsPath}/macos_monterey.png`;
      default:
        return `${environment.assetsPath}/macos_sequoia.png`;
    }
  };

  useEffect(() => {
    // Use the getStorageInfo function (either from Swift or the fallback)
    getStorageInfo()
      .then((info) => {
        const totalFormatted = info.total.toFixed(2) + " GB";
        const usedFormatted = info.used.toFixed(2) + " GB";
        const freeFormatted = info.free.toFixed(2) + " GB";
        setStorageInfo(`${usedFormatted} used of ${totalFormatted} (${freeFormatted} available)`);
      })
      .catch((error) => {
        console.error("Failed to get storage info:", error);
        setStorageInfo("Failed to retrieve storage information");
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

    si.processes().then((data) => {
      setProcesses(data.list);
    });
  }, []);

  const quitProcess = (pid) => {
    exec(`kill ${pid}`, (error) => {
      if (error) {
        console.error(`Failed to kill process with PID ${pid}: ${error.message}`);
      } else {
        console.log(`Process with PID ${pid} has been killed.`);
        setProcesses((prevProcesses) => prevProcesses.filter((proc) => proc.pid !== pid));
      }
    });
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
      <List.Section title="Storage">
        <List.Item
          icon={Icon.HardDrive}
          title="Macintosh HD"
          accessories={[{ text: storageInfo, tooltip: "Storage information from native Swift API" }]}
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
      <List.Section title="macOS">
        <List.Item
          icon={releaseImage()}
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
      <List.Section title="Network">
        {networkDevices.map((device) => (
          <List.Item
            key={device.name}
            icon={Icon.Globe}
            title={device.name}
            accessories={[{ text: device.ip }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Ip Address" content={device.ip} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Running Processes">
        {processes.map((proc) => (
          <List.Item
            key={proc.pid}
            icon={Icon.Application}
            title={`${proc.name}`}
            accessories={[{ text: `PID: ${proc.pid}` }]}
            actions={
              <ActionPanel>
                <Action title="Quit Process" onAction={() => quitProcess(proc.pid)} />
                <Action.CopyToClipboard title="Copy Process Name" content={proc.name} />
                <Action.CopyToClipboard title="Copy Pid" content={proc.pid.toString()} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
