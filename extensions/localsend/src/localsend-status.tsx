import {
  MenuBarExtra,
  Icon,
  Color,
  open,
  getPreferenceValues,
  LocalStorage,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getDeviceInfo } from "./utils/localsend";
import { getDiscoveryStatus } from "./utils/discovery-service";

const QUICK_SAVE_KEY = "quick-save-mode";

export default function Command() {
  const [localIPs, setLocalIPs] = useState<string[]>(["Loading..."]);
  const [deviceInfo, setDeviceInfo] = useState(getDeviceInfo());
  const [quickSaveMode, setQuickSaveMode] = useState<"off" | "favorites" | "on">("off");
  const prefs = getPreferenceValues<Preferences>();

  useEffect(() => {
    loadQuickSaveMode();
    updateStatus();
    // Refresh every 30 seconds instead of 2 - IPs don't change that frequently
    const interval = setInterval(updateStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadQuickSaveMode = async () => {
    const stored = await LocalStorage.getItem<string>(QUICK_SAVE_KEY);
    setQuickSaveMode((stored as "off" | "favorites" | "on") || prefs.quickSave || "off");
  };

  const setQuickSave = async (mode: "off" | "favorites" | "on") => {
    await LocalStorage.setItem(QUICK_SAVE_KEY, mode);
    setQuickSaveMode(mode);
  };

  const updateStatus = async () => {
    const status = await getDiscoveryStatus();
    // Only update if we have real IPs (not placeholder), otherwise keep current
    if (status.localIPs.length > 0 && status.localIPs[0] !== "0.0.0.0") {
      setLocalIPs(status.localIPs);
    }
    setDeviceInfo(getDeviceInfo());
  };

  const getStatusIcon = () => {
    // Use custom LocalSend icon for menu bar with tint color for proper display
    return { source: { light: "menubar-icon.svg", dark: "menubar-icon.svg" }, tintColor: Color.PrimaryText };
  };

  return (
    <MenuBarExtra icon={getStatusIcon()}>
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
          title="Receive"
          icon={Icon.Download}
          onAction={async () => await open("raycast://extensions/kud/localsend/receive")}
        />
        <MenuBarExtra.Item
          title="Discover Devices"
          icon={Icon.MagnifyingGlass}
          onAction={async () => await open("raycast://extensions/kud/localsend/discover-devices")}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Separator />

      <MenuBarExtra.Section title="Device Information">
        <MenuBarExtra.Item title={deviceInfo.alias} icon={Icon.Person} onAction={async () => {}} />
        <MenuBarExtra.Item title={deviceInfo.deviceModel || "Unknown"} icon={Icon.Monitor} onAction={async () => {}} />
        <MenuBarExtra.Item
          title={
            (deviceInfo.deviceType || "desktop").charAt(0).toUpperCase() + (deviceInfo.deviceType || "desktop").slice(1)
          }
          icon={Icon.ComputerChip}
          onAction={async () => {}}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Separator />

      <MenuBarExtra.Section title="Local IP Addresses">
        {localIPs.map((ip) => (
          <MenuBarExtra.Item key={ip} title={ip} icon={Icon.Network} onAction={async () => {}} />
        ))}
      </MenuBarExtra.Section>

      <MenuBarExtra.Separator />

      <MenuBarExtra.Submenu title="Quick Save" icon={Icon.Download}>
        <MenuBarExtra.Item
          title="Off - Ask for confirmation"
          icon={quickSaveMode === "off" ? Icon.Checkmark : Icon.Minus}
          onAction={() => setQuickSave("off")}
        />
        <MenuBarExtra.Item
          title="Favorites - Auto-accept favorites only"
          icon={quickSaveMode === "favorites" ? Icon.Checkmark : Icon.Minus}
          onAction={() => setQuickSave("favorites")}
        />
        <MenuBarExtra.Item
          title="On - Auto-accept from everyone"
          icon={quickSaveMode === "on" ? Icon.Checkmark : Icon.Minus}
          onAction={() => setQuickSave("on")}
        />
      </MenuBarExtra.Submenu>

      <MenuBarExtra.Separator />

      <MenuBarExtra.Item
        title="Preferences"
        icon={Icon.Gear}
        shortcut={{ modifiers: ["cmd"], key: "," }}
        onAction={openExtensionPreferences}
      />
    </MenuBarExtra>
  );
}
