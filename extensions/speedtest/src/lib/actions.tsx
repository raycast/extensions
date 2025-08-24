import { Action, Alert, Icon, Toast, confirmAlert, showToast } from "@raycast/api";
import * as afs from "fs/promises";
import { speedtestCLIDirectory } from "../lib/cli";
import { ClipboardData, SpeedtestResult } from "./speedtest.types";
import { pingToString, speedToString } from "./utils";

export const ShowDetailsAction = ({ showDetails }: { showDetails: () => void }) => {
  return <Action title="Show Details" onAction={showDetails} icon={Icon.Eye} />;
};

export const HideDetailsAction = ({ hideDetails }: { hideDetails: () => void }) => {
  return <Action title="Hide Details" onAction={hideDetails} icon={Icon.EyeDisabled} />;
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
      title="Clear CLI Cache"
      icon={Icon.XMarkCircle}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      style={Action.Style.Destructive}
      onAction={onClearCache}
    />
  );
}

export function CopySummaryAction(props: { result: SpeedtestResult }): JSX.Element {
  const r = props.result;
  const parts: string[] = [
    `ISP: ${r.isp}`,
    `Server: ${r.server.name}`,
    `Ping: ${pingToString(r.ping.latency)}`,
    `Download: ${speedToString(r.download.bandwidth)}`,
    `Upload: ${speedToString(r.upload.bandwidth)}`,
    `Result: ${r.result.url}`,
  ];
  return <Action.CopyToClipboard title="Copy Summary to Clipboard" content={parts.join("; ")} />;
}

export function CopySpeedtestResultAction({ result }: { result: ClipboardData }): JSX.Element {
  return <Action.CopyToClipboard title="Copy Section to Clipboard" content={JSON.stringify(result)} />;
}

export function RestartAction(props: { isLoading: boolean; revalidate: () => void }) {
  if (props.isLoading) {
    return null;
  }
  return (
    <Action
      title="Restart"
      icon={Icon.RotateAntiClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={props.revalidate}
    />
  );
}
