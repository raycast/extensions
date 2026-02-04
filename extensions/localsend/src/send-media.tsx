import { List, ActionPanel, Action, Icon, showToast, Toast, Form, useNavigation, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { getCachedDevices } from "./utils/device-cache";
import { sendFiles, getDeviceInfo } from "./utils/localsend";
import { LocalSendDevice } from "./types";
import { DeviceListItem } from "./components/DeviceListItem";
import fs from "node:fs/promises";
import path from "node:path";

const STORAGE_KEY = "recent-devices";

export default function Command() {
  const [files, setFiles] = useState<string[]>([]);
  const [pin, setPin] = useState("");

  const handleSubmit = async (values: { files: string[]; pin: string }) => {
    if (values.files.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No files selected",
      });
      return;
    }

    setFiles(values.files);
    setPin(values.pin);
  };

  if (files.length > 0) {
    return <DeviceList files={files} pin={pin} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Choose Device" icon={Icon.ArrowRight} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="files"
        title="Media Files"
        allowMultipleSelection={true}
        canChooseDirectories={false}
        autoFocus
      />
      <Form.TextField id="pin" title="PIN (optional)" placeholder="Enter PIN if required by receiver" />
    </Form>
  );
}

const DeviceList = ({ files, pin }: { files: string[]; pin: string }) => {
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
      title: "Preparing to send files...",
    });

    try {
      const fileInfos = await Promise.all(
        files.map(async (filePath) => {
          const stats = await fs.stat(filePath);
          return {
            path: filePath,
            name: path.basename(filePath),
            size: stats.size,
            type: "application/octet-stream",
          };
        }),
      );

      toast.message = "Sending files...";
      await sendFiles(device, fileInfos, pin || undefined);

      toast.style = Toast.Style.Success;
      toast.title = "Files sent successfully";
      toast.message = `Sent ${files.length} file${files.length !== 1 ? "s" : ""} to ${device.alias}`;

      await saveRecentDevice(device);
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to send files";
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
              <Action title="Send Files" icon={Icon.Upload} onAction={() => sendToDevice(device)} />
              <Action title="Discover Devices" icon={Icon.MagnifyingGlass} onAction={discoverDevices} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
