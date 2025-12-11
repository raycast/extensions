import { List, ActionPanel, Action, Icon, showToast, Toast, Form, useNavigation, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { discoverDevicesMulticast, sendFiles } from "./utils/localsend";
import { LocalSendDevice } from "./types";
import fs from "node:fs/promises";
import path from "node:path";

const STORAGE_KEY = "recent-devices";

export default function Command() {
  const [devices, setDevices] = useState<LocalSendDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      const foundDevices = await discoverDevicesMulticast(5000);
      if (foundDevices.length > 0) {
        const uniqueDevices = new Map<string, LocalSendDevice>();
        devices.forEach((d) => uniqueDevices.set(d.ip, d));
        foundDevices.forEach((d) => uniqueDevices.set(d.ip, d));
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
    discoverDevices();
  }, []);

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
        <List.Item
          key={device.ip}
          icon={Icon.Mobile}
          title={device.alias}
          subtitle={device.ip}
          accessories={[{ text: device.deviceModel }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Send Files"
                icon={Icon.Upload}
                target={<SendFilesForm device={device} onSuccess={() => saveRecentDevice(device)} />}
              />
              <Action title="Discover Devices" icon={Icon.MagnifyingGlass} onAction={discoverDevices} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function SendFilesForm({ device, onSuccess }: { device: LocalSendDevice; onSuccess: () => void }) {
  const [files, setFiles] = useState<string[]>([]);
  const [pin, setPin] = useState("");
  const { pop } = useNavigation();

  const handleSubmit = async () => {
    if (files.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No files selected",
      });
      return;
    }

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

      onSuccess();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to send files";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Files" icon={Icon.Upload} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Sending to: ${device.alias} (${device.ip})`} />
      <Form.FilePicker
        id="files"
        title="Files"
        allowMultipleSelection={true}
        value={files}
        onChange={setFiles}
        canChooseDirectories={false}
      />
      <Form.TextField
        id="pin"
        title="PIN (optional)"
        placeholder="Enter PIN if required by receiver"
        value={pin}
        onChange={setPin}
      />
    </Form>
  );
}
