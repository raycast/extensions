import { ActionPanel, Color, CopyToClipboardAction, Icon, List, showToast, ToastStyle } from "@raycast/api";
import { useState, useEffect } from "react";
import { SpeedTestHelp } from "./components/help";
import { isSpeedtestCliInstalled, Result, runSpeedTest } from "./lib/speedtest";
import { pingToString, speedToString } from "./lib/utils";

function ISPListItem(props: { name: string | undefined }): JSX.Element {
  const n = props.name;
  return (
    <List.Item
      title="Internet Service Provider"
      icon={{ source: Icon.Globe, tintColor: Color.Green }}
      accessoryTitle={`${n ? n : "?"}`}
      actions={<ActionPanel>{n && <CopyToClipboardAction content={n} />}</ActionPanel>}
    />
  );
}

function ServerListItem(props: { serverName: string | undefined }): JSX.Element {
  const sn = props.serverName;
  return (
    <List.Item
      title="Server"
      icon={{ source: "server.png" }}
      accessoryTitle={`${sn ? sn : "?"}`}
      actions={<ActionPanel>{sn && <CopyToClipboardAction content={sn} />}</ActionPanel>}
    />
  );
}

function PingListItem(props: { ping: number | undefined }): JSX.Element {
  const p = props.ping;
  return (
    <List.Item
      title="Ping"
      icon={{ source: Icon.LevelMeter, tintColor: Color.Blue }}
      accessoryTitle={`${pingToString(p)}`}
      actions={<ActionPanel>{p && <CopyToClipboardAction content={pingToString(p)} />}</ActionPanel>}
    />
  );
}

function DownloadListItem(props: { download: number | undefined }): JSX.Element {
  const d = props.download;
  return (
    <List.Item
      title="Download"
      icon={{ source: "download.png", tintColor: Color.Blue }}
      accessoryTitle={`${speedToString(d)}`}
      actions={<ActionPanel>{d && <CopyToClipboardAction content={speedToString(d)} />}</ActionPanel>}
    />
  );
}

function UploadListItem(props: { upload: number | undefined }): JSX.Element {
  const u = props.upload;
  return (
    <List.Item
      title="Upload"
      icon={{ source: "download.png", tintColor: "#bf71ff" }}
      accessoryTitle={`${speedToString(u)}`}
      actions={<ActionPanel>{u && <CopyToClipboardAction content={speedToString(u)} />}</ActionPanel>}
    />
  );
}

export default function SpeedtestList() {
  if (!isSpeedtestCliInstalled()) {
    return <SpeedTestHelp />;
  }
  const { result, error, isLoading } = useSpeedtest();
  if (error) {
    showToast(ToastStyle.Failure, "Speedtest failed", error);
  }
  const title = isLoading ? "Speedtest running" : undefined;
  return (
    <List isLoading={isLoading} searchBarPlaceholder={title}>
      <ISPListItem name={result.isp} />
      <ServerListItem serverName={result.serverName} />
      <PingListItem ping={result.ping} />
      <DownloadListItem download={result.download} />
      <UploadListItem upload={result.upload} />
    </List>
  );
}

function useSpeedtest(): { result: Result; error: string | undefined; isLoading: boolean } {
  const [result, setResult] = useState<Result>({
    isp: undefined,
    location: undefined,
    serverName: undefined,
    download: undefined,
    upload: undefined,
    ping: undefined,
  });
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  let cancel = false;
  useEffect(() => {
    function runTest() {
      try {
        if (!isSpeedtestCliInstalled()) {
          throw Error("Speedtest CLI is not installed");
        }
        runSpeedTest(
          (r: Result) => {
            if (!cancel) {
              setResult({ ...r });
            }
          },
          (r: Result) => {
            if (!cancel) {
              setResult({ ...r });
              setIsLoading(false);
            }
          },
          (err: Error) => {
            if (!cancel) {
              setError(err instanceof Error ? err.message : "unknown error");
            }
          }
        );
      } catch (err) {
        if (!cancel) {
          setError(err instanceof Error ? err.message : "unknown error");
          setIsLoading(false);
        }
      }
    }
    runTest();
    return () => {
      cancel = true;
    };
  }, []);
  return { result, error, isLoading };
}
