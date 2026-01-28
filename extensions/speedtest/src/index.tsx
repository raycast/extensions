import { Color, Icon, List, Toast, showToast } from "@raycast/api";
import { ListBandwidthItem } from "./components/bandwidth/component";
import { ActivitySpeedQualityBandwidth } from "./components/bandwidth/thresholds";
import { ISPListItem } from "./components/isp";
import { ListItemActions } from "./components/list-item-actions";
import { PingListItem } from "./components/ping";
import { ResultListItem } from "./components/result";
import { ServerListItem } from "./components/server";
import { SpeedListItem } from "./components/speed";
import { CopySummaryAction, HideDetailsAction, RestartAction, ShowDetailsAction } from "./lib/actions";
import { useDetailedView, useSpeedtest } from "./lib/hooks";

export default function SpeedtestList() {
  const { result, error, isLoading, resultProgress, revalidate } = useSpeedtest();
  const [isDetailedViewEnabled, showDetailedView, hideDetailedView] = useDetailedView();

  if (error || result.error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Speedtest failed",
      message: error,
    });
  }

  const title = isLoading ? "Speedtest running" : "";
  const summaryAction = <CopySummaryAction result={result} />;
  const restartAction = <RestartAction isLoading={isLoading} revalidate={revalidate} />;
  const showDetailsAction = <ShowDetailsAction showDetails={showDetailedView} />;
  const hideDetailsAction = <HideDetailsAction hideDetails={hideDetailedView} />;

  return (
    <List isLoading={isLoading} searchBarPlaceholder={title} isShowingDetail={isDetailedViewEnabled}>
      {result.error ? (
        <List.EmptyView icon={Icon.LevelMeter} title={result.error} />
      ) : (
        <List.Section title="Speedtest by Ookla">
          <ISPListItem isp={result.interface} name={result.isp}>
            <ListItemActions
              url={result.result.url}
              sectionClipboard={result.interface}
              summary={summaryAction}
              isLoading={isLoading}
              restart={restartAction}
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
              isDetailedViewEnabled={isDetailedViewEnabled}
              showViewAction={showDetailsAction}
              hideViewAction={hideDetailsAction}
            />
          </ServerListItem>

          <PingListItem fullPingData={result.ping} ping={result.ping.latency}>
            <ListItemActions
              url={result.result.url}
              sectionClipboard={result.ping}
              summary={summaryAction}
              isLoading={isLoading}
              restart={restartAction}
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
          >
            <ListItemActions
              url={result.result.url}
              sectionClipboard={result.download}
              summary={summaryAction}
              isLoading={isLoading}
              restart={restartAction}
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
          >
            <ListItemActions
              url={result.result.url}
              sectionClipboard={result.upload}
              summary={summaryAction}
              isLoading={isLoading}
              restart={restartAction}
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
