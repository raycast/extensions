import { ActionPanel, Color, Icon, List, showToast, Action, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { ensureCLI, speedtestCLIDirectory } from "./lib/cli";
import { Result, ResultProgress, runSpeedTest } from "./lib/speedtest";
import { pingToString, speedToString } from "./lib/utils";
import * as afs from "fs/promises";

function percentageToString(val: number | undefined): string | undefined {
  if (val === undefined) {
    return undefined;
  }
  const v = Math.round(val * 100);
  if (v === 100) {
    return undefined;
  }
  return `${v}%`;
}

function ClearCacheAction(): JSX.Element {
  const handle = async () => {
    try {
      const d = speedtestCLIDirectory();
      await afs.rm(d, { recursive: true });
    } catch (error) {
      // ignore
    }
  };
  return <Action title="Clear CLI Cache" icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }} onAction={handle} />;
}

function ISPListItem(props: { url: string | undefined; name: string | undefined; summary: JSX.Element }): JSX.Element {
  const n = props.name;
  const url = props.url;
  return (
    <List.Item
      title="Internet Service Provider"
      icon={{ source: Icon.Globe, tintColor: Color.Green }}
      actions={
        <ActionPanel>
          {props.summary}
          {n && <Action.CopyToClipboard content={n} />}
          {url && (
            <Action.OpenInBrowser
              title="Open Results in Browser"
              url={url ?? ""}
              shortcut={{ modifiers: ["opt"], key: "enter" }}
            />
          )}
          <ClearCacheAction />
        </ActionPanel>
      }
      accessories={[
        {
          text: `${n ? n : "?"}`,
        },
      ]}
    />
  );
}

function ServerListItem(props: {
  url: string | undefined;
  serverName: string | undefined;
  summary: JSX.Element;
}): JSX.Element {
  const sn = props.serverName;
  const url = props.url;
  return (
    <List.Item
      title="Server"
      icon={{ source: "server.png" }}
      actions={
        <ActionPanel>
          {props.summary}
          {sn && <Action.CopyToClipboard content={sn} />}
          {url && (
            <Action.OpenInBrowser
              title="Open Results in Browser"
              url={url ?? ""}
              shortcut={{ modifiers: ["opt"], key: "enter" }}
            />
          )}
        </ActionPanel>
      }
      accessories={[
        {
          text: `${sn ? sn : "?"}`,
        },
      ]}
    />
  );
}

function PingListItem(props: {
  url: string | undefined;
  ping: number | undefined;
  progress: number | undefined;
  summary: JSX.Element;
}): JSX.Element {
  const p = props.ping;
  const url = props.url;
  return (
    <List.Item
      title="Ping"
      subtitle={percentageToString(props.progress)}
      icon={{ source: Icon.LevelMeter, tintColor: Color.Blue }}
      actions={
        <ActionPanel>
          {props.summary}
          {p && <Action.CopyToClipboard content={pingToString(p)} />}
          {url && (
            <Action.OpenInBrowser
              title="Open Results in Browser"
              url={url ?? ""}
              shortcut={{ modifiers: ["opt"], key: "enter" }}
            />
          )}
        </ActionPanel>
      }
      accessories={[
        {
          text: `${pingToString(p)}`,
        },
      ]}
    />
  );
}

function DownloadListItem(props: {
  url: string | undefined;
  download: number | undefined;
  progress: number | undefined;
  summary: JSX.Element;
}): JSX.Element {
  const d = props.download;
  const url = props.url;
  return (
    <List.Item
      title="Download"
      subtitle={percentageToString(props.progress)}
      icon={{ source: "download.png", tintColor: Color.Blue }}
      actions={
        <ActionPanel>
          {props.summary}
          {d && <Action.CopyToClipboard content={speedToString(d)} />}
          {url && (
            <Action.OpenInBrowser
              title="Open Results in Browser"
              url={url ?? ""}
              shortcut={{ modifiers: ["opt"], key: "enter" }}
            />
          )}
        </ActionPanel>
      }
      accessories={[
        {
          text: `${speedToString(d)}`,
        },
      ]}
    />
  );
}

function UploadListItem(props: {
  url: string | undefined;
  upload: number | undefined;
  progress: number | undefined;
  summary: JSX.Element;
}): JSX.Element {
  const u = props.upload;
  const url = props.url;
  return (
    <List.Item
      title="Upload"
      subtitle={percentageToString(props.progress)}
      icon={{ source: "upload.png", tintColor: "#bf71ff" }}
      actions={
        <ActionPanel>
          {props.summary}
          {u && <Action.CopyToClipboard content={speedToString(u)} />}
          {url && (
            <Action.OpenInBrowser
              title="Open Results in Browser"
              url={url ?? ""}
              shortcut={{ modifiers: ["opt"], key: "enter" }}
            />
          )}
        </ActionPanel>
      }
      accessories={[
        {
          text: `${speedToString(u)}`,
        },
      ]}
    />
  );
}

function ResultListItem(props: { result: Result; isLoading: boolean; summary: JSX.Element }): JSX.Element {
  const url = props.result?.url;
  return (
    <List.Item
      title="Result Link"
      icon={{ source: "results.png", tintColor: Color.Blue }}
      actions={
        <ActionPanel>
          {props.summary}
          {!props.isLoading && <Action.CopyToClipboard content={url ?? ""} />}
          {!props.isLoading && (
            <Action.OpenInBrowser
              title="Open Results in Browser"
              url={url ?? ""}
              shortcut={{ modifiers: ["opt"], key: "enter" }}
            />
          )}
        </ActionPanel>
      }
      accessories={[
        {
          text: props.isLoading ? "?" : `${props.result.url}`,
        },
      ]}
    />
  );
}

function CopySummaryAction(props: { result: Result }): JSX.Element {
  const r = props.result;
  const parts: string[] = [
    `ISP: ${r.isp || "?"}`,
    `Server: ${r.serverName || "?"}`,
    `Ping: ${pingToString(r.ping)}`,
    `Download: ${speedToString(r.download)}`,
    `Upload: ${speedToString(r.upload)}`,
    `Result: ${r.url || "?"}`,
  ];
  return <Action.CopyToClipboard title="Copy Summary to Clipboard" content={parts.join("; ")} />;
}

export default function SpeedtestList() {
  const { result, error, isLoading, resultProgress } = useSpeedtest();
  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Speedtest failed",
      message: error,
    });
  }
  const title = isLoading ? "Speedtest running" : undefined;
  const summaryAction = <CopySummaryAction result={result} />;
  return (
    <List isLoading={isLoading} searchBarPlaceholder={title}>
      <ISPListItem url={result.url} name={result.isp} summary={summaryAction} />
      <ServerListItem url={result.url} serverName={result.serverName} summary={summaryAction} />
      <PingListItem url={result.url} ping={result.ping} progress={resultProgress.ping} summary={summaryAction} />
      <DownloadListItem
        url={result.url}
        download={result.download}
        progress={resultProgress.download}
        summary={summaryAction}
      />
      <UploadListItem
        url={result.url}
        upload={result.upload}
        progress={resultProgress.upload}
        summary={summaryAction}
      />
      <ResultListItem result={result} isLoading={isLoading} summary={summaryAction} />
    </List>
  );
}

function useSpeedtest(): {
  result: Result;
  error: string | undefined;
  isLoading: boolean;
  resultProgress: ResultProgress;
} {
  const [result, setResult] = useState<Result>({
    isp: undefined,
    location: undefined,
    serverName: undefined,
    download: undefined,
    upload: undefined,
    ping: undefined,
    url: undefined,
  });
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [resultProgress, setResultProgress] = useState<ResultProgress>({
    download: undefined,
    upload: undefined,
    ping: undefined,
  });
  let cancel = false;
  useEffect(() => {
    async function runTest() {
      try {
        await ensureCLI();
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
              setError(err.message);
            }
          },
          (prog: ResultProgress) => {
            if (!cancel) {
              setResultProgress(prog);
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
  return { result, error, isLoading, resultProgress };
}
