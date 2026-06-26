import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { NotInstalled } from "./components/NotInstalled";
import { getAndroidCliPath, installAndroidCli } from "./util/androidCli";
import {
  captureScreenshot,
  ConnectedDevice,
  getConnectedDevices,
  saveScreenshotAs,
  ScreenshotCapture,
} from "./util/androidScreen";
import { screenshotMarkdown } from "./util/screenshot";

type CliState = "checking" | "missing" | "ready";

export default function Command() {
  const [cliState, setCliState] = useState<CliState>("checking");

  useEffect(() => {
    getAndroidCliPath()
      .then((path) => setCliState(path ? "ready" : "missing"))
      .catch((error) => {
        console.error("[android] Capture: CLI resolution failed:", error);
        setCliState("missing");
      });
  }, []);

  async function handleInstall() {
    const path = await installAndroidCli();
    if (path) {
      setCliState("ready");
    }
  }

  if (cliState === "missing") {
    return <NotInstalled onInstall={handleInstall} />;
  }

  return <DeviceList isLoading={cliState === "checking"} />;
}

function DeviceList({ isLoading }: { isLoading: boolean }) {
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    if (isLoading) {
      return;
    }
    getConnectedDevices()
      .then(setDevices)
      .catch((error) => {
        console.error("[android] Capture: list devices failed:", error);
        return showToast(
          Toast.Style.Failure,
          "Couldn't list devices",
          String(error)
        );
      })
      .finally(() => setLoadingDevices(false));
  }, [isLoading]);

  async function capture(device: ConnectedDevice) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Capturing ${device.label}…`,
    });
    try {
      const result = await captureScreenshot(device);
      toast.style = Toast.Style.Success;
      toast.title = "Screenshot captured";
      push(<ScreenshotDetail device={device} capture={result} />);
    } catch (error) {
      console.error("[android] Capture: screenshot failed:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Capture failed";
      toast.message = String(error);
    }
  }

  return (
    <List isLoading={isLoading || loadingDevices}>
      <List.EmptyView
        icon={Icon.Mobile}
        title="No connected devices"
        description="Connect a device or start an emulator, then reopen this command."
      />
      {devices.map((device) => (
        <List.Item
          key={device.serial}
          icon={Icon.Mobile}
          title={device.label}
          subtitle={device.serial}
          actions={
            <ActionPanel>
              <Action
                title="Capture Screenshot"
                icon={Icon.Camera}
                onAction={() => capture(device)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ScreenshotDetail({
  device,
  capture,
}: {
  device: ConnectedDevice;
  capture: ScreenshotCapture;
}) {
  async function saveAs() {
    try {
      const destination = await saveScreenshotAs(capture);
      if (destination) {
        await showToast(Toast.Style.Success, "Saved", destination);
      }
    } catch (error) {
      console.error("[android] Capture: save screenshot failed:", error);
      await showToast(
        Toast.Style.Failure,
        "Couldn't save screenshot",
        String(error)
      );
    }
  }

  return (
    <Detail
      navigationTitle={`Screenshot — ${device.label}`}
      markdown={screenshotMarkdown(capture.path)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Device" text={device.label} />
          <Detail.Metadata.Label title="Serial" text={device.serial} />
          {capture.resolution ? (
            <Detail.Metadata.Label
              title="Resolution"
              text={capture.resolution}
            />
          ) : null}
          <Detail.Metadata.Label title="Size" text={capture.size} />
          <Detail.Metadata.Label
            title="Captured"
            text={capture.capturedAt.toLocaleString()}
          />
          <Detail.Metadata.Label title="Saved To" text={capture.path} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Image"
            icon={Icon.Clipboard}
            content={{ file: capture.path }}
          />
          <Action title="Save As…" icon={Icon.SaveDocument} onAction={saveAs} />
          <Action.ShowInFinder title="Reveal in Finder" path={capture.path} />
        </ActionPanel>
      }
    />
  );
}
