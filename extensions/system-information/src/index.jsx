import { useState, useEffect } from "react";
import { Icon, List } from "@raycast/api";
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
      case "Ventura":
        return "https://tinyurl.com/29meyokw";
      case "Monterey":
        return "https://tinyurl.com/2cyba7vz";
      case "Big Sur":
        return "https://tinyurl.com/27m5gg8g";
      case "Catalina":
        return "https://tinyurl.com/2ybemhbe";
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
        />
        <List.Item icon={Icon.ComputerChip} title="Chip" accessories={[{ text: os.cpus()[0].model }]} />
        <List.Item
          icon={Icon.MemoryChip}
          title="Memory"
          accessories={[{ text: os.totalmem() / (1024 * 1024 * 1024) + " GB" }]}
        />
        <List.Item icon={Icon.Hashtag} title="Serial Number" accessories={[{ text: serialNumber || "-" }]} />
      </List.Section>

      <List.Section title="macOS">
        <List.Item
          icon={releaseImage()}
          title={`macOS ${macosRelease().name}`}
          accessories={[{ text: `Version ${macOSVersion()}` }]}
        />
      </List.Section>

      <List.Section title="Storage">
        <List.Item
          icon={Icon.HardDrive}
          title="Macintosh HD"
          accessories={[{ text: storageInfo }, { tooltip: "This information may be inaccurate" }]}
        />
      </List.Section>
    </List>
  );
}
