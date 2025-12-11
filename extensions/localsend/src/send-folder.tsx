import { Form, ActionPanel, Action, showToast, Toast, Icon, List, useNavigation, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import { sendFiles, discoverDevicesMulticast } from "./utils/localsend";
import { LocalSendDevice } from "./types";
import fs from "node:fs/promises";
import path from "node:path";
import archiver from "archiver";
import os from "node:os";

const STORAGE_KEY = "recent-devices";

export default function Command() {
  const [devices, setDevices] = useState<LocalSendDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const discoverDevices = async () => {
    setIsLoading(true);
    try {
      const foundDevices = await discoverDevicesMulticast(5000);
      setDevices(foundDevices);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Discovery failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveRecentDevice = async (device: LocalSendDevice) => {
    const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
    const recent = stored ? JSON.parse(stored) : [];
    const filtered = recent.filter((d: LocalSendDevice) => d.fingerprint !== device.fingerprint);
    filtered.unshift(device);
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, 5)));
  };

  useEffect(() => {
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
                title="Send Folder"
                icon={Icon.Upload}
                target={<SendFolderForm device={device} onSuccess={() => saveRecentDevice(device)} />}
              />
              <Action title="Discover Devices" icon={Icon.MagnifyingGlass} onAction={discoverDevices} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function SendFolderForm({ device, onSuccess }: { device: LocalSendDevice; onSuccess: () => void }) {
  const [folder, setFolder] = useState<string[]>([]);
  const [pin, setPin] = useState("");
  const { pop } = useNavigation();

  const handleSubmit = async () => {
    if (folder.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No folder selected",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating archive...",
      message: "Compressing folder contents",
    });

    try {
      const folderPath = folder[0];
      const folderName = path.basename(folderPath);
      const tmpDir = os.tmpdir();
      const timestamp = Date.now();
      const zipFileName = `${folderName}-${timestamp}.zip`;
      const zipPath = path.join(tmpDir, zipFileName);

      // Create zip archive
      const output = (await import("node:fs")).createWriteStream(zipPath);
      const archive = archiver("zip", {
        zlib: { level: 9 },
      });

      await new Promise<void>((resolve, reject) => {
        output.on("close", () => resolve());
        archive.on("error", (err: Error) => reject(err));

        archive.pipe(output);
        archive.directory(folderPath, false);
        archive.finalize();
      });

      const stats = await fs.stat(zipPath);

      const zipFile = {
        path: zipPath,
        name: zipFileName,
        size: stats.size,
        type: "application/zip",
      };

      toast.title = "Sending folder...";
      toast.message = `Sending ${folderName} to ${device.alias}`;
      
      await sendFiles(device, [zipFile], pin || undefined);

      toast.style = Toast.Style.Success;
      toast.title = "Folder sent successfully";
      toast.message = `Sent ${folderName} to ${device.alias}`;

      onSuccess();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to send folder";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Folder" icon={Icon.Upload} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Sending to: ${device.alias} (${device.ip})`} />
      <Form.FilePicker
        id="folder"
        title="Folder"
        value={folder}
        onChange={setFolder}
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
      />
      <Form.TextField id="pin" title="PIN (optional)" placeholder="Enter PIN if required" value={pin} onChange={setPin} />
    </Form>
  );
}

