import { ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { DownloadItemData, MediaType } from "../schema";
import {
  formatDateTime,
  formatFileSize,
  formatMediaDuration,
  getYouTubeThumbnail,
  parseFileType,
  readDownloadDetails,
  readStreamingDetails,
} from "../utils";
import { DownloadActions } from ".";
import { useStreaming } from "../hooks";

interface DownloadViewProps {
  downloadItem: DownloadItemData;
  revalidate: () => void;
}

export const DownloadView: React.FC<DownloadViewProps> = ({ downloadItem, revalidate }) => {
  const { getStreamingInfo } = useStreaming();
  const { isDownloadItemPlayable } = useStreaming();
  const youtubeThumbnail = getYouTubeThumbnail(downloadItem);

  const { data: streamingInfo } = getStreamingInfo(downloadItem.id, {
    isPlayable: isDownloadItemPlayable(downloadItem),
    isYouTube: Boolean(youtubeThumbnail),
  });

  return streamingInfo ? (
    <Detail
      markdown={readStreamingDetails(streamingInfo, downloadItem)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Media Type" icon={Icon.FilmStrip} text={MediaType[streamingInfo.type]} />
          {streamingInfo.type === "show" && (
            <Detail.Metadata.TagList title="">
              <Detail.Metadata.TagList.Item text={`Season ${streamingInfo.season}`} color={Color.Purple} />
              <Detail.Metadata.TagList.Item text={`Episode ${streamingInfo.episode}`} color={Color.Green} />
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />

          <Detail.Metadata.TagList title="Metadata">
            <Detail.Metadata.TagList.Item text={formatFileSize(streamingInfo.size)} />
            <Detail.Metadata.TagList.Item text={formatMediaDuration(streamingInfo.duration)} />
          </Detail.Metadata.TagList>
          {streamingInfo.availableFormats && (
            <Detail.Metadata.TagList title="Available Formats">
              {Object.entries(streamingInfo.availableFormats).map(([key, value]) => {
                return <Detail.Metadata.TagList.Item key={key} text={value.toUpperCase()} />;
              })}
            </Detail.Metadata.TagList>
          )}
          {streamingInfo.availableQualities && (
            <Detail.Metadata.TagList title="Available Qualities">
              {Object.entries(streamingInfo.availableQualities).map(([key]) => {
                return <Detail.Metadata.TagList.Item key={key} text={key} />;
              })}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <DownloadActions downloadItem={downloadItem} revalidate={revalidate} popOnSuccess />
        </ActionPanel>
      }
    />
  ) : (
    <Detail
      markdown={readDownloadDetails(downloadItem, youtubeThumbnail)}
      metadata={
        <Detail.Metadata>
          {downloadItem?.host && (
            <Detail.Metadata.TagList title="Host">
              <Detail.Metadata.TagList.Item text={downloadItem.host} color={Color.Purple} />
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />

          <Detail.Metadata.TagList title="Metadata">
            {downloadItem && <Detail.Metadata.TagList.Item text={parseFileType(downloadItem)} />}

            {downloadItem?.filesize !== 0 && (
              <Detail.Metadata.TagList.Item text={formatFileSize(downloadItem.filesize)} />
            )}

            {downloadItem?.type && <Detail.Metadata.TagList.Item text={downloadItem.type} />}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />

          {downloadItem?.generated && (
            <Detail.Metadata.Label
              icon={Icon.Clock}
              title="Date Added"
              text={formatDateTime(downloadItem.generated, "date")}
            />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <DownloadActions downloadItem={downloadItem} revalidate={revalidate} popOnSuccess />
        </ActionPanel>
      }
    />
  );
};

export default DownloadView;
