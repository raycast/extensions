import {
  Action,
  ActionPanel,
  closeMainWindow,
  Icon,
  List,
  openExtensionPreferences,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  getToolchain,
  launchScrcpy,
  listConnectedDevices,
  recordingDirectory,
  screenshotDirectory,
  setShowTouches,
  takeScreenshot,
  type AndroidDevice,
} from "./android-tools";

async function runScrcpy(
  device: AndroidDevice,
  options: { record?: boolean; showTouches?: boolean },
) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: options.record
      ? "Starting recorded scrcpy session"
      : "Opening scrcpy",
    message: device.name,
  });

  try {
    const result = await launchScrcpy(device, options);
    toast.style = Toast.Style.Success;
    toast.title = options.record ? "Recording started" : "scrcpy opened";
    toast.message = result.recordingPath ?? device.name;
    await closeMainWindow();
    await showHUD(
      result.recordingPath
        ? `Recording ${device.name} to ${result.recordingPath}`
        : `Opened ${device.name} with scrcpy`,
    );
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not open scrcpy";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

async function captureScreenshot(device: AndroidDevice) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Taking Android screenshot",
    message: device.name,
  });

  try {
    const outputPath = await takeScreenshot(device);
    toast.style = Toast.Style.Success;
    toast.title = "Screenshot saved";
    toast.message = outputPath;
    await closeMainWindow();
    await showHUD(`Screenshot saved to ${outputPath}`);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not take screenshot";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

async function changeShowTouches(device: AndroidDevice, enabled: boolean) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: enabled ? "Enabling show touches" : "Disabling show touches",
    message: device.name,
  });

  try {
    await setShowTouches(device, enabled);
    toast.style = Toast.Style.Success;
    toast.title = enabled ? "Show touches enabled" : "Show touches disabled";
    await closeMainWindow();
    await showHUD(enabled ? "Show touches enabled" : "Show touches disabled");
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not change show touches";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

function DeviceCommands({ device }: { device: AndroidDevice }) {
  return (
    <List
      navigationTitle={device.name}
      searchBarPlaceholder="Search Android commands..."
    >
      <List.Section title="scrcpy">
        <List.Item
          icon={Icon.Desktop}
          title="Open Standard scrcpy Session"
          subtitle="Mirror and control the device"
          actions={
            <ActionPanel>
              <Action
                title="Run Standard Scrcpy Session"
                icon={Icon.Play}
                onAction={() => runScrcpy(device, {})}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Fingerprint}
          title="Open scrcpy with Show Touches"
          subtitle="Mirror the device and temporarily display physical touch points"
          actions={
            <ActionPanel>
              <Action
                title="Open Scrcpy with Show Touches"
                icon={Icon.Play}
                onAction={() => runScrcpy(device, { showTouches: true })}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Video}
          title="Record scrcpy Session"
          subtitle="Mirror the device and record the session as MP4"
          actions={
            <ActionPanel>
              <Action
                title="Start Recording"
                icon={Icon.CircleFilled}
                onAction={() => runScrcpy(device, { record: true })}
              />
              <Action.Open
                title="Open Recordings Folder"
                target={recordingDirectory}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Video}
          title="Record with Show Touches"
          subtitle="Record an MP4 while displaying physical touch points"
          actions={
            <ActionPanel>
              <Action
                title="Start Recording with Show Touches"
                icon={Icon.CircleFilled}
                onAction={() =>
                  runScrcpy(device, { record: true, showTouches: true })
                }
              />
              <Action.Open
                title="Open Recordings Folder"
                target={recordingDirectory}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="adb">
        <List.Item
          icon={Icon.Camera}
          title="Take Screenshot"
          subtitle="Save a lossless PNG from the device"
          actions={
            <ActionPanel>
              <Action
                title="Take Screenshot"
                icon={Icon.Camera}
                onAction={() => captureScreenshot(device)}
              />
              <Action.Open
                title="Open Screenshots Folder"
                target={screenshotDirectory}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Fingerprint}
          title="Enable Show Touches"
          subtitle="Keep Android touch indicators enabled"
          actions={
            <ActionPanel>
              <Action
                title="Enable Show Touches"
                onAction={() => changeShowTouches(device, true)}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Fingerprint}
          title="Disable Show Touches"
          subtitle="Turn Android touch indicators off"
          actions={
            <ActionPanel>
              <Action
                title="Disable Show Touches"
                onAction={() => changeShowTouches(device, false)}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Settings">
        <List.Item
          icon={Icon.Folder}
          title="Output Folders"
          subtitle="Choose where screenshots and recordings are saved"
          actions={
            <ActionPanel>
              <Action
                title="Configure Output Folders"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
              <Action.Open
                title="Open Screenshots Folder"
                target={screenshotDirectory}
              />
              <Action.Open
                title="Open Recordings Folder"
                target={recordingDirectory}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

export default function DeviceCommandPicker() {
  const [devices, setDevices] = useState<AndroidDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      const { adb } = await getToolchain();
      setDevices(await listConnectedDevices(adb));
    } catch (loadError) {
      setDevices([]);
      setError(
        loadError instanceof Error ? loadError.message : String(loadError),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Choose an Android device..."
    >
      {devices.length === 0 ? (
        <List.EmptyView
          icon={Icon.Mobile}
          title={
            error
              ? "Could not load Android devices"
              : "No connected Android devices"
          }
          description={
            error ??
            "Start an emulator or connect a device with USB debugging enabled."
          }
          actions={
            <ActionPanel>
              <Action
                title="Reload"
                icon={Icon.ArrowClockwise}
                onAction={reload}
              />
            </ActionPanel>
          }
        />
      ) : (
        devices.map((device) => (
          <List.Item
            key={device.serial}
            icon={device.isEmulator ? Icon.Desktop : Icon.Mobile}
            title={device.name}
            subtitle={device.serial}
            accessories={device.detail ? [{ text: device.detail }] : undefined}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Device Commands"
                  icon={Icon.List}
                  target={<DeviceCommands device={device} />}
                />
                <Action
                  title="Reload"
                  icon={Icon.ArrowClockwise}
                  onAction={reload}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
