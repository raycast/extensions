import { Action, Alert, Icon, Keyboard, Toast, confirmAlert, showToast } from "@raycast/api";
import * as afs from "fs/promises";
import { speedtestCLIDirectory } from "../lib/cli";
import { ShareMode, canShareMeterImage, shareMeterImage } from "./meter-image";
import { ClipboardData, SpeedtestResult } from "./speedtest.types";
import { pingToString, speedToString } from "./utils";

export const ShowDetailsAction = ({ showDetails }: { showDetails: () => void }) => {
  return <Action title="Show Details" onAction={showDetails} icon={Icon.Eye} />;
};

export const HideDetailsAction = ({ hideDetails }: { hideDetails: () => void }) => {
  return <Action title="Hide Details" onAction={hideDetails} icon={Icon.EyeDisabled} />;
};

export const ShowMeterAction = ({ showMeter }: { showMeter: () => void }) => {
  return (
    <Action
      title="Show Speed Meter"
      onAction={showMeter}
      icon={Icon.Gauge}
      shortcut={{ macOS: { modifiers: ["cmd"], key: "l" }, Windows: { modifiers: ["ctrl"], key: "l" } }}
    />
  );
};

export function ClearCacheAction(props: { isLoading: boolean }) {
  if (props.isLoading) {
    return null;
  }

  const onClearCache = async () => {
    const isConfirmed = await confirmAlert({
      title: "Clear the CLI Cache?",
      icon: Icon.Trash,
      message: "This action cannot be undone.",
      primaryAction: {
        title: "Clear Cache",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (isConfirmed) {
      try {
        const dir = speedtestCLIDirectory();
        await afs.rm(dir, { recursive: true });
        await showToast({ style: Toast.Style.Success, title: "Cache cleared successfully" });
      } catch (error) {
        if (error instanceof Error) {
          await showToast({ style: Toast.Style.Failure, title: "Failed to clear cache", message: error.message });
        } else {
          await showToast({ style: Toast.Style.Failure, title: "Failed to clear cache" });
        }
      }
    }
  };

  return (
    <Action
      title="Clear Cli Cache"
      icon={Icon.XMarkCircle}
      shortcut={Keyboard.Shortcut.Common.Remove}
      style={Action.Style.Destructive}
      onAction={onClearCache}
    />
  );
}

export function CopySummaryAction(props: { result: SpeedtestResult }) {
  const r = props.result;
  const parts: string[] = [
    `ISP: ${r.isp}`,
    `Server: ${r.server.name}`,
    `Ping: ${pingToString(r.ping.latency)}`,
    `Download: ${speedToString(r.download.bandwidth)}`,
    `Upload: ${speedToString(r.upload.bandwidth)}`,
    `Result: ${r.result.url}`,
  ];
  return (
    <Action.CopyToClipboard
      title="Copy Summary to Clipboard"
      content={parts.join("; ")}
      shortcut={Keyboard.Shortcut.Common.Copy}
    />
  );
}

export function CopySpeedtestResultAction({ result }: { result: ClipboardData }) {
  return (
    <Action.CopyToClipboard
      title="Copy Section to Clipboard"
      content={JSON.stringify(result)}
      shortcut={Keyboard.Shortcut.Common.CopyName}
    />
  );
}

/**
 * Copy / paste / save the meter as a PNG. Rendering uses macOS's QuickLook, so the
 * actions are only offered on macOS (see `canShareMeterImage`).
 */
export function MeterImageActions({ markup }: { markup: string }) {
  if (!canShareMeterImage) {
    return null;
  }
  const share = async (mode: ShareMode) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Rendering meter image…" });
    try {
      await shareMeterImage(markup, mode);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not export the meter";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  };
  return (
    <>
      <Action
        title="Copy Meter Image"
        icon={Icon.Image}
        shortcut={Keyboard.Shortcut.Common.Duplicate}
        onAction={() => share("copy")}
      />
      <Action
        title="Paste Meter Image"
        icon={Icon.Clipboard}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "v" },
          Windows: { modifiers: ["ctrl", "shift"], key: "v" },
        }}
        onAction={() => share("paste")}
      />
      <Action
        title="Save Meter Image to Downloads"
        icon={Icon.Download}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "d" },
          Windows: { modifiers: ["ctrl", "shift"], key: "d" },
        }}
        onAction={() => share("save")}
      />
    </>
  );
}

export function RestartAction(props: { isLoading: boolean; revalidate: () => void }) {
  if (props.isLoading) {
    return null;
  }
  return (
    <Action
      title="Restart"
      icon={Icon.RotateAntiClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={props.revalidate}
    />
  );
}
