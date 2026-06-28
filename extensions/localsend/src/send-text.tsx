import { Form, ActionPanel, Action, showToast, Toast, Icon, List, useNavigation, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import { sendFiles, getDeviceInfo } from "./utils/localsend";
import { getCachedDevices } from "./utils/device-cache";
import { LocalSendDevice } from "./types";
import { DeviceListItem } from "./components/DeviceListItem";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const STORAGE_KEY = "recent-devices";

export default function Command() {
  const [text, setText] = useState("");
  const [pin, setPin] = useState("");

  const handleSubmit = async (values: { text: string; pin: string }) => {
    if (!values.text || values.text.trim().length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text entered",
      });
      return;
    }

    setText(values.text);
    setPin(values.pin);
  };

  if (text.length > 0) {
    return <DeviceList text={text} pin={pin} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Choose Device" icon={Icon.ArrowRight} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" title="Text" placeholder="Enter text to send..." autoFocus />
      <Form.TextField id="pin" title="PIN (optional)" placeholder="Enter PIN if required" />
    </Form>
  );
}

const DeviceList = ({ text, pin }: { text: string; pin: string }) => {
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

      await saveRecentDevice(device);
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to send text";
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
              <Action title="Send Text" icon={Icon.Upload} onAction={() => sendToDevice(device)} />
              <Action title="Discover Devices" icon={Icon.MagnifyingGlass} onAction={discoverDevices} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
