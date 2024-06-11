import { Action, Color, Icon } from "@raycast/api";
import * as afs from "fs/promises";
import { speedtestCLIDirectory } from "../lib/cli";
import { pingToString, speedToString } from "./utils";
import { SpeedtestResult, ClipboardData } from "./speedtest.types";

export const ToggleDetailedViewAction = ({ setDetailedView }: { setDetailedView: () => void }) => {
  return <Action title="Toggle Details" onAction={setDetailedView} icon={Icon.AppWindowSidebarLeft} />;
};

export function ClearCacheAction(props: { isLoading: boolean }) {
  if (props.isLoading) {
    return null;
  }
  const handle = async () => {
    try {
      const d = speedtestCLIDirectory();
      await afs.rm(d, { recursive: true });
    } catch (error) {
      // ignore
    }
  };
  return <Action title="Clear CLI Cache" icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }} onAction={handle} />;
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
