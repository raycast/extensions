import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Clipboard,
  useNavigation,
  LocalStorage,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { getCachedDevices } from "./utils/device-cache";
import { sendFiles, getDeviceInfo } from "./utils/localsend";
import { LocalSendDevice } from "./types";
import { DeviceListItem } from "./components/DeviceListItem";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

const STORAGE_KEY = "recent-devices";

export default function Command() {
  const [clipboardText, setClipboardText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadClipboard = async () => {
      try {
        const text = await Clipboard.readText();
        if (!text) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Clipboard is empty",
            message: "Please copy some text first",
          });
          setIsLoading(false);
          return;
        }
        setClipboardText(text);
      } catch (error) {
        await showFailureToast(error);
      } finally {
        setIsLoading(false);
      }
    };
    loadClipboard();
  }, []);

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (!clipboardText) {
    return null;
  }

  return <DeviceList clipboardText={clipboardText} />;
}

const DeviceList = ({ clipboardText }: { clipboardText: string }) => {
  const [devices, setDevices] = useState<LocalSendDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { pop } = useNavigation();

  const loadRecentDevices = async () => {
    const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (stored) {
      try {
        const recent = JSON.parse(stored) as LocalSendDevice[];
        setDevices(recent);
      } catch (error) {
        console.error("Failed to parse recent devices:", error);
      }
    }
  };

  const saveRecentDevice = async (device: LocalSendDevice) => {
    const existing = devices.filter((d) => d.ip !== device.ip);
    const updated = [device, ...existing].slice(0, 10);
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setDevices(updated);
  };

  const discoverDevices = async () => {
    setIsLoading(true);
    try {
      const foundDevices = await getCachedDevices();
      const myFingerprint = getDeviceInfo().fingerprint;
      const filtered = foundDevices.filter((d) => d.fingerprint !== myFingerprint);
      if (filtered.length > 0) {
        const uniqueDevices = new Map<string, LocalSendDevice>();
        devices.forEach((d) => uniqueDevices.set(d.ip, d));
        filtered.forEach((d) => uniqueDevices.set(d.ip, d));
        setDevices(Array.from(uniqueDevices.values()));
      }
    } catch (error) {
      await showFailureToast(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecentDevices();
    const loadDevices = async () => {
      setIsLoading(true);
      try {
        const foundDevices = await getCachedDevices();
        const myFingerprint = getDeviceInfo().fingerprint;
        const filtered = foundDevices.filter((d) => d.fingerprint !== myFingerprint);
        if (filtered.length > 0) {
          const uniqueDevices = new Map<string, LocalSendDevice>();
          devices.forEach((d) => uniqueDevices.set(d.ip, d));
          filtered.forEach((d) => uniqueDevices.set(d.ip, d));
          setDevices(Array.from(uniqueDevices.values()));
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to discover devices",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadDevices();
  }, []);

  const sendToDevice = async (device: LocalSendDevice) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Preparing to send clipboard...",
    });

    try {
      const tmpDir = os.tmpdir();
      const fileName = `clipboard-${Date.now()}.txt`;
      const filePath = path.join(tmpDir, fileName);

      await fs.writeFile(filePath, clipboardText, "utf-8");

      const clipFile = {
        path: filePath,
        name: fileName,
        size: Buffer.byteLength(clipboardText, "utf-8"),
        type: "text/plain",
      };

      toast.message = "Sending clipboard...";
      await sendFiles(device, [clipFile], undefined);

      await fs.unlink(filePath);

      toast.style = Toast.Style.Success;
      toast.title = "Clipboard sent successfully";
      toast.message = `Sent to ${device.alias}`;

      await saveRecentDevice(device);
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to send clipboard";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search devices...">
      <List.EmptyView
        icon={Icon.Network}
        title="No LocalSend Devices Found"
        description="Make sure LocalSend is running on nearby devices"
        actions={
          <ActionPanel>
            <Action title="Discover Devices" icon={Icon.MagnifyingGlass} onAction={discoverDevices} />
          </ActionPanel>
        }
      />
      {devices.map((device) => (
        <DeviceListItem
          key={device.ip}
          device={device}
          actions={
            <ActionPanel>
              <Action title="Send Clipboard" icon={Icon.Upload} onAction={() => sendToDevice(device)} />
              <Action title="Discover Devices" icon={Icon.MagnifyingGlass} onAction={discoverDevices} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
