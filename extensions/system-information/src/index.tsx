import { Action, ActionPanel, environment, Icon, Keyboard, List } from "@raycast/api";
import { exec } from "child_process";
import macosRelease from "macos-release";
import { macOSVersion } from "macos-version";
import os from "node:os";
import { useEffect, useState } from "react";
import si from "systeminformation";

const isWindows = process.platform === "win32";

const formatGigabytes = (bytes: number) => {
  const gb = bytes / 1024 ** 3;
  return Number.isInteger(gb) ? `${gb} GB` : `${gb.toFixed(2)} GB`;
};

const formatStorage = (bytes: number) => `${(bytes / 1e9).toFixed(2)} GB`;

const getWindowsBuildNumber = (): Promise<string> =>
  new Promise((resolve) => {
    exec('reg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion" /v UBR', (error, stdout) => {
      if (error) {
        resolve("");
        return;
      }
      const hexMatch = stdout.match(/0x[0-9a-fA-F]+/);
      if (!hexMatch) {
        resolve("");
        return;
      }
      const ubr = parseInt(hexMatch[0], 16);
      resolve(Number.isFinite(ubr) ? `.${ubr}` : "");
    });
  });

const getStorageInfo = async () => {
  if (isWindows) {
    const [disks, fs] = await Promise.all([si.diskLayout(), si.fsSize()]);
    const totalBytes = fs.reduce((sum, f) => sum + f.size, 0);
    const freeBytes = fs.reduce((sum, f) => sum + f.available, 0);
    const usedBytes = totalBytes - freeBytes;
    const isSingleDisk = disks.length === 1;
    const diskType = isSingleDisk ? disks[0].type : "";
    const diskName = isSingleDisk ? disks[0].name : "";
    const name = diskType ? `${Math.round(totalBytes / 1e9)} GB ${diskType}` : "Storage";
    return {
      title: name,
      model: diskName,
      text: `${formatStorage(usedBytes)} used of ${formatStorage(totalBytes)} (${formatStorage(freeBytes)} available)`,
    };
  }

  const { getStorageInfo } = await import("swift:../swift");
  const info = await getStorageInfo();
  return {
    title: "Macintosh HD",
    model: "",
    text: `${info.used.toFixed(2)} GB used of ${info.total.toFixed(2)} GB (${info.free.toFixed(2)} GB available)`,
  };
};

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [storageInfo, setStorageInfo] = useState("");
  const [storageTitle, setStorageTitle] = useState(isWindows ? "" : "Macintosh HD");
  const [storageModel, setStorageModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [networkDevices, setNetworkDevices] = useState<{ name: string; ip: string }[]>([]);
  const [processes, setProcesses] = useState<si.Systeminformation.ProcessesProcessData[]>([]);
  const [memory, setMemory] = useState("");
  const [osTitle, setOsTitle] = useState("");
  const [osVersion, setOsVersion] = useState("");
  const [kernel, setKernel] = useState("");

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
    const loadWindowsInfo = async () => {
      const [system, memLayout, osInfo, ubr] = await Promise.all([
        si.system(),
        si.memLayout(),
        si.osInfo(),
        getWindowsBuildNumber(),
      ]);
      const memoryBytes = memLayout.reduce((sum, stick) => sum + (stick.size || 0), 0);
      setMemory(formatGigabytes(memoryBytes));
      setSerialNumber(system.serial || "Not available");
      const distro = osInfo.distro.replace(/^Microsoft /, "");
      setOsTitle(`${distro} ${osInfo.codename}`);
      setOsVersion(`OS Build ${osInfo.build}${ubr}`);
      setKernel(osInfo.kernel);
    };

    const loadMacOSInfo = (): Promise<void> =>
      new Promise((resolve) => {
        setMemory(formatGigabytes(os.totalmem()));
        exec("/usr/sbin/system_profiler SPHardwareDataType", (error, stdout, stderr) => {
          if (error || stderr) {
            setSerialNumber("Unable to retrieve");
          } else {
            const serialNumberMatch = stdout.match(/Serial Number \(system\): (.+)/);
            setSerialNumber(serialNumberMatch ? serialNumberMatch[1] : "Not available");
          }
          resolve();
        });
        const majorVersion = macOSVersion()?.split(".")[0];
        setOsTitle(`macOS ${macosRelease().name == "Unknown" ? majorVersion : macosRelease().name}`);
        setOsVersion(`Version ${macOSVersion() ?? ""}`);
        setKernel(os.version().replace("Darwin Kernel", "").trim());
      });

    const networkInterfaces = os.networkInterfaces();
    const devices: { name: string; ip: string }[] = [];

    for (const [name, interfaces] of Object.entries(networkInterfaces)) {
      for (const interfaceObj of interfaces ?? []) {
        if (interfaceObj.family === "IPv4" && !interfaceObj.internal) {
          devices.push({ name, ip: interfaceObj.address });
        }
      }
    }

    setNetworkDevices(devices);

    const tasks = [
      getStorageInfo()
        .then((info) => {
          setStorageTitle(info.title);
          setStorageModel(info.model);
          setStorageInfo(info.text);
        })
        .catch((error) => {
          console.error("Failed to get storage info:", error);
          setStorageInfo("Failed to retrieve storage information");
        }),
      si.processes().then((data) => {
        setProcesses(data.list);
      }),
    ];

    if (isWindows) {
      tasks.push(
        loadWindowsInfo().catch((error) => {
          console.error("Failed to load Windows info:", error);
        }),
      );
    } else {
      tasks.push(loadMacOSInfo());
    }

    Promise.allSettled(tasks).then(() => setIsLoading(false));
  }, []);

  const quitProcess = (pid: number) => {
    const command = isWindows ? `taskkill /PID ${pid} /F` : `kill ${pid}`;
    exec(command, (error) => {
      if (error) {
        console.error(`Failed to kill process with PID ${pid}: ${error.message}`);
      } else {
        console.log(`Process with PID ${pid} has been killed.`);
        setProcesses((prevProcesses) => prevProcesses.filter((proc) => proc.pid !== pid));
      }
    });
  };

  return (
    <List isLoading={isLoading}>
      <List.Section title={isWindows ? "About This PC" : "About This Mac"}>
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
          title={isWindows ? "Processor" : "Chip"}
          accessories={[{ text: os.cpus()[0].model.trim() }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Processor Model" content={os.cpus()[0].model.trim()} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.MemoryChip}
          title="Memory"
          accessories={[{ text: memory }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Memory" content={memory} />
            </ActionPanel>
          }
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
          title={storageTitle}
          accessories={[{ text: storageInfo, tooltip: storageModel || undefined }]}
          actions={
            <ActionPanel>
              <Action.Open
                target={isWindows ? "ms-settings:storagesense" : "x-apple.systempreferences:com.apple.settings.Storage"}
                title="Open Storage Settings"
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title={isWindows ? "Windows" : "macOS"}>
        <List.Item
          icon={isWindows ? Icon.Monitor : releaseImage()}
          title={osTitle}
          accessories={[{ text: osVersion }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy OS Version" content={`${osTitle} ${osVersion}`} />
            </ActionPanel>
          }
        />

        <List.Item
          icon={Icon.Info}
          title={isWindows ? "Windows Kernel" : "Darwin Kernel"}
          accessories={[{ text: kernel }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Kernel Version" content={kernel} />
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

      <List.Section title="Running Processes">
        {processes.map((proc) => (
          <List.Item
            key={proc.pid}
            icon={Icon.Terminal}
            title={`${proc.name}`}
            accessories={[{ text: `PID: ${proc.pid}` }]}
            actions={
              <ActionPanel>
                <Action title="Quit Process" icon={Icon.XMarkCircle} onAction={() => quitProcess(proc.pid)} />
                <Action.CopyToClipboard
                  title="Copy Process Name"
                  content={proc.name}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action.CopyToClipboard
                  title="Copy PID"
                  content={proc.pid.toString()}
                  shortcut={Keyboard.Shortcut.Common.CopyName}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
