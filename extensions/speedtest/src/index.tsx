import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import * as afs from "fs/promises";
import { speedtestCLIDirectory } from "./lib/cli";
import { Result } from "./lib/speedtest";
import { pingToString, speedToString } from "./lib/utils";
import { useSpeedtest } from "./lib/hooks";
import { ListBandwidthItem } from "./lib/bandwidth/component";
import { ActivitySpeedQualityBandwidth } from "./lib/bandwidth/thresholds";

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

function ClearCacheAction(props: { isLoading: boolean }) {
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

function ISPListItem(props: {
  url: string | undefined;
  name: string | undefined;
  summary: JSX.Element;
  isLoading: boolean;
  restart: JSX.Element;
}): JSX.Element {
  const n = props.name;
  const url = props.url;
  return (
    <List.Item
      title="Internet Service Provider"
      icon={{ source: Icon.Globe, tintColor: Color.Green }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {props.summary}
            {n && <Action.CopyToClipboard content={n} />}
          </ActionPanel.Section>
          <ActionPanel.Section>
            {url && (
              <Action.OpenInBrowser
                title="Open Results in Browser"
                url={url ?? ""}
                shortcut={{ modifiers: ["opt"], key: "enter" }}
              />
            )}
            {props.restart}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ClearCacheAction isLoading={props.isLoading} />
          </ActionPanel.Section>
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
  restart: JSX.Element;
  isLoading: boolean;
}): JSX.Element {
  const sn = props.serverName;
  const url = props.url;
  return (
    <List.Item
      title="Server"
      icon={{ source: Icon.HardDrive, tintColor: Color.Green }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {props.summary}
            {sn && <Action.CopyToClipboard content={sn} />}
          </ActionPanel.Section>
          <ActionPanel.Section>
            {url && (
              <Action.OpenInBrowser
                title="Open Results in Browser"
                url={url ?? ""}
                shortcut={{ modifiers: ["opt"], key: "enter" }}
              />
            )}
            {props.restart}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ClearCacheAction isLoading={props.isLoading} />
          </ActionPanel.Section>
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
  restart: JSX.Element;
  isLoading: boolean;
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
          <ActionPanel.Section>
            {props.summary}
            {p && <Action.CopyToClipboard content={pingToString(p)} />}
          </ActionPanel.Section>
          <ActionPanel.Section>
            {url && (
              <Action.OpenInBrowser
                title="Open Results in Browser"
                url={url ?? ""}
                shortcut={{ modifiers: ["opt"], key: "enter" }}
              />
            )}
            {props.restart}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ClearCacheAction isLoading={props.isLoading} />
          </ActionPanel.Section>
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
  restart: JSX.Element;
  isLoading: boolean;
}): JSX.Element {
  const d = props.download;
  const url = props.url;
  return (
    <List.Item
      title="Download"
      subtitle={percentageToString(props.progress)}
      icon={{ source: Icon.ArrowDownCircle, tintColor: Color.Blue }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {props.summary}
            {d && <Action.CopyToClipboard content={speedToString(d)} />}
          </ActionPanel.Section>
          <ActionPanel.Section>
            {url && (
              <Action.OpenInBrowser
                title="Open Results in Browser"
                url={url ?? ""}
                shortcut={{ modifiers: ["opt"], key: "enter" }}
              />
            )}
            {props.restart}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ClearCacheAction isLoading={props.isLoading} />
          </ActionPanel.Section>
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
  restart: JSX.Element;
  isLoading: boolean;
}): JSX.Element {
  const u = props.upload;
  const url = props.url;
  return (
    <List.Item
      title="Upload"
      subtitle={percentageToString(props.progress)}
      icon={{ source: Icon.ArrowUpCircle, tintColor: "#bf71ff" }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {props.summary}
            {u && <Action.CopyToClipboard content={speedToString(u)} />}
          </ActionPanel.Section>
          <ActionPanel.Section>
            {url && (
              <Action.OpenInBrowser
                title="Open Results in Browser"
                url={url ?? ""}
                shortcut={{ modifiers: ["opt"], key: "enter" }}
              />
            )}
            {props.restart}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ClearCacheAction isLoading={props.isLoading} />
          </ActionPanel.Section>
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

function ResultListItem(props: {
  result: Result;
  isLoading: boolean;
  summary: JSX.Element;
  restart: JSX.Element;
}): JSX.Element {
  const url = props.result?.url;
  return (
    <List.Item
      title="Result Link"
      icon={{ source: Icon.CheckCircle, tintColor: Color.Blue }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {props.summary}
            {!props.isLoading && <Action.CopyToClipboard content={url ?? ""} />}
          </ActionPanel.Section>
          <ActionPanel.Section>
            {!props.isLoading && (
              <Action.OpenInBrowser
                title="Open Results in Browser"
                url={url ?? ""}
                shortcut={{ modifiers: ["opt"], key: "enter" }}
              />
            )}
            {props.restart}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ClearCacheAction isLoading={props.isLoading} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[
        {
          text: props.isLoading ? "?" : `${props.result.url || "?"}`,
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

function RestartAction(props: { isLoading: boolean; revalidate: () => void }) {
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

export default function SpeedtestList() {
  const { result, error, isLoading, resultProgress, revalidate } = useSpeedtest();

  if (error || result.error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Speedtest failed",
      message: error,
    });
  }
  const title = isLoading ? "Speedtest running" : undefined;
  const summaryAction = <CopySummaryAction result={result} />;
  const restartAction = <RestartAction isLoading={isLoading} revalidate={revalidate} />;

  return (
    <List isLoading={isLoading} searchBarPlaceholder={title}>
      {result.error ? (
        <List.EmptyView icon={Icon.LevelMeter} title={result.error} />
      ) : (
        <>
          <ISPListItem
            url={result.url}
            name={result.isp}
            summary={summaryAction}
            isLoading={isLoading}
            restart={restartAction}
          />
          <ServerListItem
            url={result.url}
            isLoading={isLoading}
            serverName={result.serverName}
            summary={summaryAction}
            restart={restartAction}
          />
          <PingListItem
            url={result.url}
            isLoading={isLoading}
            ping={result.ping}
            progress={resultProgress.ping}
            summary={summaryAction}
            restart={restartAction}
          />
          <DownloadListItem
            url={result.url}
            isLoading={isLoading}
            download={result.download}
            progress={resultProgress.download}
            summary={summaryAction}
            restart={restartAction}
          />
          <UploadListItem
            url={result.url}
            isLoading={isLoading}
            upload={result.upload}
            progress={resultProgress.upload}
            summary={summaryAction}
            restart={restartAction}
          />
          <ListBandwidthItem
            speed={{ download: result.download, upload: result.upload }}
            activity={ActivitySpeedQualityBandwidth.voiceCall}
            result={result}
            title="Voice Call"
            icon={Icon.Phone}
            isLoading={isLoading}
            summary={summaryAction}
            restart={restartAction}
          />
          <ListBandwidthItem
            speed={{ download: result.download, upload: result.upload }}
            activity={ActivitySpeedQualityBandwidth.videoCall}
            result={result}
            title="Video Call"
            icon={Icon.Video}
            isLoading={isLoading}
            summary={summaryAction}
            restart={restartAction}
          />
          <ListBandwidthItem
            speed={{ download: result.download, upload: result.upload }}
            activity={ActivitySpeedQualityBandwidth.stream}
            result={result}
            title="Streaming"
            icon={Icon.GameController}
            isLoading={isLoading}
            summary={summaryAction}
            restart={restartAction}
          />
          <ResultListItem result={result} isLoading={isLoading} summary={summaryAction} restart={restartAction} />
        </>
      )}
    </List>
  );
}
