import { Form, ActionPanel, Action, showToast, Toast, Icon, List, useNavigation, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import { getCachedDevices } from "./utils/device-cache";
import { sendFiles, getDeviceInfo } from "./utils/localsend";
import { LocalSendDevice } from "./types";
import { DeviceListItem } from "./components/DeviceListItem";
import fs from "node:fs/promises";
import path from "node:path";
import archiver from "archiver";
import os from "node:os";

const STORAGE_KEY = "recent-devices";

export default function Command() {
  const [folder, setFolder] = useState<string[]>([]);
  const [pin, setPin] = useState("");

  const handleSubmit = async (values: { folder: string[]; pin: string }) => {
    if (values.folder.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No folder selected",
      });
      return;
    }

    setFolder(values.folder);
    setPin(values.pin);
  };

  if (folder.length > 0) {
    return <DeviceList folder={folder[0]} pin={pin} />;
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
        id="folder"
        title="Folder"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
        autoFocus
      />
      <Form.TextField id="pin" title="PIN (optional)" placeholder="Enter PIN if required by receiver" />
    </Form>
  );
}

const DeviceList = ({ folder, pin }: { folder: string; pin: string }) => {
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
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to discover devices",
        message: error instanceof Error ? error.message : "Unknown error",
      });
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
      title: "Compressing folder...",
    });

    try {
      const tmpDir = os.tmpdir();
      const folderName = path.basename(folder);
      const zipFileName = `${folderName}.zip`;
      const zipFilePath = path.join(tmpDir, zipFileName);

      const output = await fs.open(zipFilePath, "w");
      const archive = archiver("zip", { zlib: { level: 9 } });

      await new Promise<void>((resolve, reject) => {
        archive.on("error", reject);
        archive.on("end", resolve);
        archive.pipe(output.createWriteStream());
        archive.directory(folder, false);
        archive.finalize();
      });

      await output.close();
      const stats = await fs.stat(zipFilePath);

      const zipFile = {
        path: zipFilePath,
        name: zipFileName,
        size: stats.size,
        type: "application/zip",
      };

      toast.message = "Sending folder...";
      await sendFiles(device, [zipFile], pin || undefined);

      await fs.unlink(zipFilePath);

      toast.style = Toast.Style.Success;
      toast.title = "Folder sent successfully";
      toast.message = `Sent ${folderName} to ${device.alias}`;

      await saveRecentDevice(device);
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to send folder";
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
              <Action title="Send Folder" icon={Icon.Upload} onAction={() => sendToDevice(device)} />
              <Action title="Discover Devices" icon={Icon.MagnifyingGlass} onAction={discoverDevices} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
