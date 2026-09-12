import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import {
  ClearCacheAction,
  CopySpeedtestResultAction,
  CopySummaryAction,
  MeterImageActions,
  RestartAction,
} from "../lib/actions";
import { DASHBOARD_W, TestPhase, dashboardSvg } from "../lib/charts";
import { ResultProgress, SpeedSamples, SpeedtestResult } from "../lib/speedtest.types";
import { mdImg } from "../lib/svg";
import { percentageToString } from "../lib/utils";
import { ActivitySpeedQualityBandwidth } from "./bandwidth/thresholds";
import { convertBitsToMbps, speedToAvailableActivityQuality } from "./bandwidth/utils";
import { getFlatMetadata, reorderResult } from "./list-item-metadata";

type SpeedtestDashboardProps = {
  result: SpeedtestResult;
  error?: string;
  isLoading: boolean;
  resultProgress: ResultProgress;
  samples: SpeedSamples;
  revalidate: () => void;
  showList: () => void;
};

function currentPhase(
  isLoading: boolean,
  result: SpeedtestResult,
  error: string | undefined,
  p: ResultProgress,
): TestPhase {
  if (error || result.error) return "error";
  if (!isLoading) return "done";
  if (p.upload !== undefined) return "upload";
  if (p.download !== undefined) return "download";
  if (p.ping !== undefined) return "ping";
  return "starting";
}

function phaseLabel(phase: TestPhase, p: ResultProgress): string {
  switch (phase) {
    case "starting":
      return "Starting…";
    case "ping":
      return "Measuring latency…";
    case "download":
      return `Downloading ${percentageToString(p.download) ?? ""}`.trim();
    case "upload":
      return `Uploading ${percentageToString(p.upload) ?? ""}`.trim();
    case "done":
      return "Finished";
    case "error":
      return "Failed";
  }
}

const activities = [
  { title: "Voice Call", icon: Icon.Phone, activity: ActivitySpeedQualityBandwidth.voiceCall },
  { title: "Video Call", icon: Icon.Video, activity: ActivitySpeedQualityBandwidth.videoCall },
  { title: "Streaming", icon: Icon.Livestream, activity: ActivitySpeedQualityBandwidth.stream },
];

export function SpeedtestDashboard(props: SpeedtestDashboardProps) {
  const { result, error, isLoading, resultProgress, samples, revalidate, showList } = props;
  const phase = currentPhase(isLoading, result, error, resultProgress);
  const errorMessage = error ?? result.error;

  const image = dashboardSvg({ phase, result, progress: resultProgress, samples, errorMessage });
  // The alt text changes with every update so Raycast never serves a cached frame.
  const frameKey = `${phase}-${samples.download.length}-${samples.upload.length}-${result.ping.latency}`;
  const markdown = mdImg(image, `speedtest-${frameKey}`, DASHBOARD_W);

  const speedMbps = {
    download: convertBitsToMbps(result.download.bandwidth),
    upload: convertBitsToMbps(result.upload.bandwidth),
  };
  const hasSpeeds = speedMbps.download > 0 && speedMbps.upload > 0;
  const flat = getFlatMetadata(reorderResult(result));
  const url = result.result.url;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text={phaseLabel(phase, resultProgress)}
            icon={
              phase === "error"
                ? { source: Icon.XMarkCircle, tintColor: Color.Red }
                : phase === "done"
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : { source: Icon.CircleProgress, tintColor: Color.Blue }
            }
          />
          <Detail.Metadata.Separator />
          {activities.map(({ title, icon, activity }) => {
            const qualities = hasSpeeds ? speedToAvailableActivityQuality(speedMbps, activity) : [];
            return qualities.length > 0 ? (
              <Detail.Metadata.TagList key={title} title={title}>
                {qualities.map((q) => (
                  <Detail.Metadata.TagList.Item key={q} text={q} color={Color.Blue} icon={icon} />
                ))}
              </Detail.Metadata.TagList>
            ) : (
              <Detail.Metadata.Label
                key={title}
                title={title}
                text={hasSpeeds ? "Not enough bandwidth" : "?"}
                icon={{ source: hasSpeeds ? Icon.LivestreamDisabled : icon, tintColor: Color.Blue }}
              />
            );
          })}
          <Detail.Metadata.Separator />
          {flat.map((el, i) =>
            el.isSeparator ? (
              <Detail.Metadata.Separator key={i} />
            ) : el.title === "URL" && el.value ? (
              <Detail.Metadata.Link key={i} title={el.title} text={el.value} target={el.value} />
            ) : (
              <Detail.Metadata.Label key={i} icon={el.icon} title={el.title} text={el.value} />
            ),
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Show Detailed List"
              icon={Icon.List}
              shortcut={{ macOS: { modifiers: ["cmd"], key: "l" }, Windows: { modifiers: ["ctrl"], key: "l" } }}
              onAction={showList}
            />
            {url && <Action.OpenInBrowser title="Open Results in Browser" url={url} />}
            <RestartAction isLoading={isLoading} revalidate={revalidate} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CopySummaryAction result={result} />
            <CopySpeedtestResultAction result={result} />
            <MeterImageActions markup={image} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ClearCacheAction isLoading={isLoading} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
