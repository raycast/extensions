import { MenuBarExtra, Icon, Color, open, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { getDeviceInfo } from "./utils/localsend";
import { startDiscoveryService, stopDiscoveryService, getDiscoveryStatus } from "./utils/discovery-service";
import { startReceiveServer, stopReceiveServer, isServerRunning } from "./utils/receive-server";

interface Preferences {
  httpPort: string;
  enableReceive: boolean;
}

export default function Command() {
  const [discoveryRunning, setDiscoveryRunning] = useState(false);
  const [serverRunning, setServerRunning] = useState(false);
  const [localIPs, setLocalIPs] = useState<string[]>([]);
  const [deviceInfo, setDeviceInfo] = useState(getDeviceInfo());
  const prefs = getPreferenceValues<Preferences>();
  const port = parseInt(prefs.httpPort || "53318", 10);

  useEffect(() => {
    updateStatus();
    const interval = setInterval(updateStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async () => {
    const status = await getDiscoveryStatus();
    setDiscoveryRunning(status.running);
    setServerRunning(await isServerRunning());
    setLocalIPs(status.localIPs);
    setDeviceInfo(getDeviceInfo());
  };

  const toggleDiscovery = async () => {
    if (discoveryRunning) {
      stopDiscoveryService();
    } else {
      // Ensure server is running before starting discovery
      if (!serverRunning) {
        await startReceiveServer(port);
      }
      startDiscoveryService();
    }
    setTimeout(() => updateStatus(), 500);
  };

  const toggleReceiveServer = async () => {
    if (serverRunning) {
      // Stop discovery first if running
      if (discoveryRunning) {
        stopDiscoveryService();
      }
      await stopReceiveServer();
    } else {
      await startReceiveServer(port);
    }
    setTimeout(() => updateStatus(), 500);
  };

  const getStatusIcon = () => {
    // if (discoveryRunning && serverRunning) {
    //   return { source: Icon.Checkmark, tintColor: Color.Green };
    // } else if (discoveryRunning || serverRunning) {
    //   return { source: Icon.Circle, tintColor: Color.Yellow };
    // } else {
    //   return { source: Icon.Circle, tintColor: Color.Red };
    // }

    return { source: Icon.Circle, tintColor: Color.Green };
  };

  const getStatusText = () => {
    if (discoveryRunning && serverRunning) {
      return "Online";
    } else if (discoveryRunning) {
      return "Discoverable";
    } else if (serverRunning) {
      return "Receiving";
    } else {
      return "Offline";
    }
  };

  return (
    <MenuBarExtra icon={getStatusIcon()}>
      <MenuBarExtra.Section title="Device Information">
        <MenuBarExtra.Item title={deviceInfo.alias} icon={Icon.Person} onAction={async () => {}} />
        <MenuBarExtra.Item
          title={deviceInfo.deviceType.charAt(0).toUpperCase() + deviceInfo.deviceType.slice(1)}
          icon={Icon.ComputerChip}
          onAction={async () => {}}
        />
        <MenuBarExtra.Item title={deviceInfo.deviceModel} icon={Icon.Monitor} onAction={async () => {}} />
      </MenuBarExtra.Section>

      <MenuBarExtra.Separator />

      {localIPs.length > 0 && (
        <>
          <MenuBarExtra.Section title="Local IP Addresses">
            {localIPs.map((ip) => (
              <MenuBarExtra.Item key={ip} title={ip} icon={Icon.Network} onAction={async () => {}} />
            ))}
          </MenuBarExtra.Section>
          <MenuBarExtra.Separator />
        </>
      )}

      <MenuBarExtra.Section title="Actions">
        <MenuBarExtra.Item
          title="Send Files"
          icon={Icon.Document}
          onAction={async () => await open("raycast://extensions/kud/localsend/send-files")}
        />
        <MenuBarExtra.Item
          title="Send Media"
          icon={Icon.Image}
          onAction={async () => await open("raycast://extensions/kud/localsend/send-media")}
        />
        <MenuBarExtra.Item
          title="Send Text"
          icon={Icon.Text}
          onAction={async () => await open("raycast://extensions/kud/localsend/send-text")}
        />
        <MenuBarExtra.Item
          title="Send Clipboard"
          icon={Icon.Clipboard}
          onAction={async () => await open("raycast://extensions/kud/localsend/send-clipboard")}
        />
        <MenuBarExtra.Item
          title="Send Folder"
          icon={Icon.Folder}
          onAction={async () => await open("raycast://extensions/kud/localsend/send-folder")}
        />
        <MenuBarExtra.Item
          title="Discover Devices"
          icon={Icon.MagnifyingGlass}
          onAction={async () => await open("raycast://extensions/kud/localsend/discover-devices")}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Separator />

      <MenuBarExtra.Item
        title="Extension Preferences"
        icon={Icon.Gear}
        shortcut={{ modifiers: ["cmd"], key: "," }}
        onAction={async () => await open("raycast://confetti")}
      />
    </MenuBarExtra>
  );
}
