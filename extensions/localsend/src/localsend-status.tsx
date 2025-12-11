import { MenuBarExtra, Icon, Color, open, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
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
  const prefs = getPreferenceValues<Preferences>();
  const port = parseInt(prefs.httpPort || "53318", 10);

  useEffect(() => {
    updateStatus();
    const interval = setInterval(updateStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = () => {
    const status = getDiscoveryStatus();
    setDiscoveryRunning(status.running);
    setServerRunning(isServerRunning());
    setLocalIPs(status.localIPs);
  };

  const toggleDiscovery = async () => {
    if (discoveryRunning) {
      stopDiscoveryService();
    } else {
      startDiscoveryService();
    }
    updateStatus();
  };

  const toggleReceiveServer = async () => {
    if (serverRunning) {
      await stopReceiveServer();
    } else {
      await startReceiveServer(port);
    }
    updateStatus();
  };

  const getStatusIcon = () => {
    if (discoveryRunning && serverRunning) {
      return { source: Icon.Checkmark, tintColor: Color.Green };
    } else if (discoveryRunning || serverRunning) {
      return { source: Icon.Circle, tintColor: Color.Yellow };
    } else {
      return { source: Icon.Circle, tintColor: Color.Red };
    }
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
    <MenuBarExtra icon={getStatusIcon()} tooltip={`LocalSend: ${getStatusText()}`}>
      <MenuBarExtra.Section title="Status">
        <MenuBarExtra.Item
          title={discoveryRunning ? "Discovery Active" : "Discovery Inactive"}
          icon={discoveryRunning ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.XMarkCircle}
          onAction={toggleDiscovery}
        />
        <MenuBarExtra.Item
          title={serverRunning ? `Server Active (Port ${port})` : "Server Inactive"}
          icon={serverRunning ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.XMarkCircle}
          onAction={toggleReceiveServer}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Separator />

      {localIPs.length > 0 && (
        <>
          <MenuBarExtra.Section title="Local IP Addresses">
            {localIPs.map((ip) => (
              <MenuBarExtra.Item key={ip} title={ip} icon={Icon.Network} />
            ))}
          </MenuBarExtra.Section>
          <MenuBarExtra.Separator />
        </>
      )}

      <MenuBarExtra.Section title="Actions">
        <MenuBarExtra.Item
          title="Send Files"
          icon={Icon.Upload}
          onAction={async () => await open("raycast://extensions/kud/localsend/send-files")}
        />
        <MenuBarExtra.Item
          title="Discover Devices"
          icon={Icon.MagnifyingGlass}
          onAction={async () => await open("raycast://extensions/kud/localsend/discover-devices")}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Separator />

      <MenuBarExtra.Item
        title="Preferences"
        icon={Icon.Gear}
        onAction={async () => await open("raycast://extensions/kud/localsend")}
      />
    </MenuBarExtra>
  );
}
