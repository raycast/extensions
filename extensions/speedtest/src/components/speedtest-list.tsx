import { ActionPanel, Color, Icon, List } from "@raycast/api";
import { ListBandwidthItem } from "./bandwidth/component";
import { ActivitySpeedQualityBandwidth } from "./bandwidth/thresholds";
import { ISPListItem } from "./isp";
import { ListItemActions } from "./list-item-actions";
import { PingListItem } from "./ping";
import { ResultListItem } from "./result";
import { ServerListItem } from "./server";
import { SpeedListItem } from "./speed";
import {
  ClearCacheAction,
  CopySummaryAction,
  HideDetailsAction,
  RestartAction,
  ShowDetailsAction,
  ShowMeterAction,
} from "../lib/actions";
import { useDetailedView } from "../lib/hooks";
import { ResultProgress, SpeedSamples, SpeedtestResult } from "../lib/speedtest.types";

type SpeedtestListProps = {
  result: SpeedtestResult;
  isLoading: boolean;
  resultProgress: ResultProgress;
  samples: SpeedSamples;
  revalidate: () => void;
  showMeter: () => void;
};

export function SpeedtestList({
  result,
  isLoading,
  resultProgress,
  samples,
  revalidate,
  showMeter,
}: SpeedtestListProps) {
  const [isDetailedViewEnabled, showDetailedView, hideDetailedView] = useDetailedView();

  const title = isLoading ? "Speedtest running" : "";
  const summaryAction = <CopySummaryAction result={result} />;
  const restartAction = <RestartAction isLoading={isLoading} revalidate={revalidate} />;
  const showDetailsAction = <ShowDetailsAction showDetails={showDetailedView} />;
  const hideDetailsAction = <HideDetailsAction hideDetails={hideDetailedView} />;
  const meterAction = <ShowMeterAction showMeter={showMeter} />;

  return (
    <List isLoading={isLoading} searchBarPlaceholder={title} isShowingDetail={isDetailedViewEnabled}>
      {result.error ? (
        <List.EmptyView
          icon={Icon.LevelMeter}
          title={result.error}
          actions={
            <ActionPanel>
              {restartAction}
              <ClearCacheAction isLoading={isLoading} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title="Speedtest by Ookla">
          <ISPListItem isp={result.interface} name={result.isp}>
            <ListItemActions
              url={result.result.url}
              sectionClipboard={result.interface}
              summary={summaryAction}
              isLoading={isLoading}
              restart={restartAction}
              meter={meterAction}
              isDetailedViewEnabled={isDetailedViewEnabled}
              showViewAction={showDetailsAction}
              hideViewAction={hideDetailsAction}
            />
          </ISPListItem>

          <ServerListItem server={result.server} serverName={result.server.name}>
            <ListItemActions
              url={result.result.url}
              sectionClipboard={result.server}
              summary={summaryAction}
              isLoading={isLoading}
              restart={restartAction}
              meter={meterAction}
              isDetailedViewEnabled={isDetailedViewEnabled}
              showViewAction={showDetailsAction}
              hideViewAction={hideDetailsAction}
            />
          </ServerListItem>

          <PingListItem fullPingData={result.ping} ping={result.ping.latency} progress={resultProgress.ping}>
            <ListItemActions
              url={result.result.url}
              sectionClipboard={result.ping}
              summary={summaryAction}
              isLoading={isLoading}
              restart={restartAction}
              meter={meterAction}
              isDetailedViewEnabled={isDetailedViewEnabled}
              showViewAction={showDetailsAction}
              hideViewAction={hideDetailsAction}
            />
          </PingListItem>

          <SpeedListItem
            type="Download"
            fullSpeedInfo={result.download}
            speed={result.download.bandwidth}
            progress={resultProgress.download}
            samples={samples.download}
          >
            <ListItemActions
              url={result.result.url}
              sectionClipboard={result.download}
              summary={summaryAction}
              isLoading={isLoading}
              restart={restartAction}
              meter={meterAction}
              isDetailedViewEnabled={isDetailedViewEnabled}
              showViewAction={showDetailsAction}
              hideViewAction={hideDetailsAction}
            />
          </SpeedListItem>

          <SpeedListItem
            type="Upload"
            fullSpeedInfo={result.upload}
            speed={result.upload.bandwidth}
            progress={resultProgress.upload}
            samples={samples.upload}
          >
            <ListItemActions
              url={result.result.url}
              sectionClipboard={result.upload}
              summary={summaryAction}
              isLoading={isLoading}
              restart={restartAction}
              meter={meterAction}
              isDetailedViewEnabled={isDetailedViewEnabled}
              showViewAction={showDetailsAction}
              hideViewAction={hideDetailsAction}
            />
          </SpeedListItem>

          <ListBandwidthItem
            speed={{ download: result.download, upload: result.upload }}
            activity={ActivitySpeedQualityBandwidth.voiceCall}
            title="Voice Call"
            icon={{ source: Icon.Phone, tintColor: Color.Blue }}
            isLoading={isLoading}
            actions={
              <ListItemActions
                url={result.result.url}
                sectionClipboard={{ ...result, download: result.download, upload: result.upload }}
                summary={summaryAction}
                isLoading={isLoading}
                restart={restartAction}
                meter={meterAction}
                isDetailedViewEnabled={isDetailedViewEnabled}
                showViewAction={showDetailsAction}
                hideViewAction={hideDetailsAction}
              />
            }
          />

          <ListBandwidthItem
            speed={{ download: result.download, upload: result.upload }}
            activity={ActivitySpeedQualityBandwidth.videoCall}
            title="Video Call"
            icon={{ source: Icon.Video, tintColor: Color.Blue }}
            isLoading={isLoading}
            actions={
              <ListItemActions
                url={result.result.url}
                sectionClipboard={{ ...result, download: result.download, upload: result.upload }}
                summary={summaryAction}
                isLoading={isLoading}
                restart={restartAction}
                meter={meterAction}
                isDetailedViewEnabled={isDetailedViewEnabled}
                showViewAction={showDetailsAction}
                hideViewAction={hideDetailsAction}
              />
            }
          />

          <ListBandwidthItem
            speed={{ download: result.download, upload: result.upload }}
            activity={ActivitySpeedQualityBandwidth.stream}
            title="Streaming"
            icon={{ source: Icon.Livestream, tintColor: Color.Blue }}
            isLoading={isLoading}
            actions={
              <ListItemActions
                url={result.result.url}
                sectionClipboard={{ ...result, download: result.download, upload: result.upload }}
                summary={summaryAction}
                isLoading={isLoading}
                restart={restartAction}
                meter={meterAction}
                isDetailedViewEnabled={isDetailedViewEnabled}
                showViewAction={showDetailsAction}
                hideViewAction={hideDetailsAction}
              />
            }
          />

          <ResultListItem speedtestResult={result} isLoading={isLoading}>
            <ListItemActions
              url={result.result.url}
              sectionClipboard={result}
              summary={summaryAction}
              isLoading={isLoading}
              restart={restartAction}
              meter={meterAction}
              isDetailedViewEnabled={isDetailedViewEnabled}
              showViewAction={showDetailsAction}
              hideViewAction={hideDetailsAction}
            />
          </ResultListItem>
        </List.Section>
      )}
    </List>
  );
}
