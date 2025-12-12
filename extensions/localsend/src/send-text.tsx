import { Form, ActionPanel, Action, showToast, Toast, Icon, List, useNavigation, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import { sendFiles, getDeviceInfo } from "./utils/localsend";
import { getCachedDevices } from "./utils/device-cache";
import { LocalSendDevice } from "./types";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const STORAGE_KEY = "recent-devices";

export default function Command() {
  const [devices, setDevices] = useState<LocalSendDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const discoverDevices = async () => {
    setIsLoading(true);
    try {
      const foundDevices = await getCachedDevices();
      const myFingerprint = getDeviceInfo().fingerprint;
      const filtered = foundDevices.filter((d) => d.fingerprint !== myFingerprint);
      setDevices(filtered);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load devices",
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
                title="Send Text"
                icon={Icon.Upload}
                target={<SendTextForm device={device} onSuccess={() => saveRecentDevice(device)} />}
              />
              <Action title="Discover Devices" icon={Icon.MagnifyingGlass} onAction={discoverDevices} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function SendTextForm({ device, onSuccess }: { device: LocalSendDevice; onSuccess: () => void }) {
  const [text, setText] = useState("");
  const [pin, setPin] = useState("");
  const { pop } = useNavigation();

  const handleSubmit = async () => {
    if (!text || text.trim().length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text entered",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Preparing to send text...",
    });

    try {
      const tmpDir = os.tmpdir();
      const timestamp = Date.now();
      const fileName = `text-${timestamp}.txt`;
      const filePath = path.join(tmpDir, fileName);

      await fs.writeFile(filePath, text, "utf-8");
      const stats = await fs.stat(filePath);

      const textFile = {
        path: filePath,
        name: fileName,
        size: stats.size,
        type: "text/plain",
      };

      toast.message = "Sending text...";
      await sendFiles(device, [textFile], pin || undefined);

      toast.style = Toast.Style.Success;
      toast.title = "Text sent successfully";
      toast.message = `Sent to ${device.alias}`;

      onSuccess();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to send text";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Text" icon={Icon.Upload} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Sending to: ${device.alias} (${device.ip})`} />
      <Form.TextArea id="text" title="Text" placeholder="Enter text to send..." value={text} onChange={setText} />
      <Form.TextField id="pin" title="PIN (optional)" placeholder="Enter PIN if required" value={pin} onChange={setPin} />
    </Form>
  );
}

