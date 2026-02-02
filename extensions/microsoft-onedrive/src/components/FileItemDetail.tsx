import { List } from "@raycast/api";
import type { DriveItem } from "../types";
import { getDriveName, getMarkdownPreview } from "../utils/display";
import { formatDate, formatFileSize, formatFileType } from "../utils/formatters";

interface FileItemDetailProps {
  item: DriveItem;
  /** Fallback location to show when item.parentReference.path is not available */
  whereFallback?: string;
  /** Whether to hide the "Where" field entirely */
  hideWhere?: boolean;
  lastAccessedDateTime?: string;
}

export function FileItemDetail({ item, whereFallback, hideWhere, lastAccessedDateTime }: FileItemDetailProps) {
  const whereText = item.parentReference?.path ? item.parentReference.path.split(":")[1] || "/" : whereFallback || "/";

  return (
    <List.Item.Detail
      markdown={getMarkdownPreview(item)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={item.name} />

          {item.parentReference?.driveType && (
            <List.Item.Detail.Metadata.Label title="Drive" text={getDriveName(item.parentReference.driveType)} />
          )}

          {!hideWhere && <List.Item.Detail.Metadata.Label title="Where" text={whereText} />}

          {(item.folder || item.file) && (
            <List.Item.Detail.Metadata.Label
              title="Type"
              text={item.folder ? "Folder" : formatFileType(item.file?.mimeType)}
            />
          )}

          {item.size !== undefined && <List.Item.Detail.Metadata.Label title="Size" text={formatFileSize(item.size)} />}

          {item.image && (
            <List.Item.Detail.Metadata.Label title="Dimensions" text={`${item.image.width} × ${item.image.height}`} />
          )}

          {lastAccessedDateTime && (
            <List.Item.Detail.Metadata.Label title="Last Accessed" text={formatDate(lastAccessedDateTime)} />
          )}

          {item.createdDateTime && (
            <List.Item.Detail.Metadata.Label title="Created" text={formatDate(item.createdDateTime)} />
          )}

          {item.createdBy?.user?.displayName && (
            <List.Item.Detail.Metadata.Label title="Created By" text={item.createdBy.user.displayName} />
          )}

          {item.lastModifiedDateTime && (
            <List.Item.Detail.Metadata.Label title="Modified" text={formatDate(item.lastModifiedDateTime)} />
          )}

          {item.lastModifiedBy?.user?.displayName && (
            <List.Item.Detail.Metadata.Label title="Modified By" text={item.lastModifiedBy.user.displayName} />
          )}

          {(item.image || item.photo || item.video) && <List.Item.Detail.Metadata.Separator />}

          {item.photo?.takenDateTime && (
            <List.Item.Detail.Metadata.Label title="Captured" text={formatDate(item.photo.takenDateTime)} />
          )}

          {item.photo?.cameraMake && (
            <List.Item.Detail.Metadata.Label
              title="Camera"
              text={`${item.photo.cameraMake}${item.photo.cameraModel ? ` ${item.photo.cameraModel}` : ""}`}
            />
          )}

          {item.photo?.iso && <List.Item.Detail.Metadata.Label title="ISO" text={item.photo.iso.toString()} />}

          {item.photo?.fNumber && <List.Item.Detail.Metadata.Label title="Aperture" text={`ƒ${item.photo.fNumber}`} />}

          {item.photo?.exposureNumerator && item.photo?.exposureDenominator && (
            <List.Item.Detail.Metadata.Label
              title="Shutter Speed"
              text={`${item.photo.exposureNumerator}/${item.photo.exposureDenominator}s`}
            />
          )}

          {item.photo?.focalLength && (
            <List.Item.Detail.Metadata.Label title="Focal Length" text={`${item.photo.focalLength} mm`} />
          )}

          {item.location && (item.location.latitude || item.location.longitude) && (
            <List.Item.Detail.Metadata.Link
              title="Location"
              text={`${item.location.latitude?.toFixed(6)}, ${item.location.longitude?.toFixed(6)}`}
              target={`https://www.google.com/maps?q=${item.location.latitude},${item.location.longitude}`}
            />
          )}

          {item.video?.duration && (
            <List.Item.Detail.Metadata.Label
              title="Duration"
              text={`${Math.floor(item.video.duration / 1000 / 60)}:${String(Math.floor((item.video.duration / 1000) % 60)).padStart(2, "0")}`}
            />
          )}

          {item.video?.width && item.video?.height && (
            <List.Item.Detail.Metadata.Label title="Resolution" text={`${item.video.width} × ${item.video.height}`} />
          )}

          {item.video?.frameRate && (
            <List.Item.Detail.Metadata.Label title="Frame Rate" text={`${item.video.frameRate.toFixed(0)} fps`} />
          )}

          {item.video?.bitrate && (
            <List.Item.Detail.Metadata.Label
              title="Bitrate"
              text={`${(item.video.bitrate / 1000000).toFixed(1)} Mbps`}
            />
          )}

          {item.video?.audioFormat && (
            <List.Item.Detail.Metadata.Label title="Audio Format" text={item.video.audioFormat} />
          )}

          {item.video?.audioChannels && (
            <List.Item.Detail.Metadata.Label
              title="Audio Channels"
              text={
                item.video.audioChannels === 1
                  ? "Mono"
                  : item.video.audioChannels === 2
                    ? "Stereo"
                    : `${item.video.audioChannels} channels`
              }
            />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
