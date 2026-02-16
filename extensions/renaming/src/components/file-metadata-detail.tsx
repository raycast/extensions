/**
 * Component for rendering file metadata in a List.Item.Detail
 */

import { List } from "@raycast/api";
import { basename, dirname } from "path";
import type { FileMetadata } from "../lib/metadata";
import { isPreviewableImage } from "../lib/file-types";
import { useThumbnail } from "../hooks/use-thumbnail";

interface FileMetadataDetailProps {
  filePath: string;
  originalPath?: string;
  metadata: FileMetadata | null;
  isLoading?: boolean;
  isDirectory?: boolean;
}

function formatDate(date: Date): string {
  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBitrate(bitsPerSecond: number): string {
  const kbps = bitsPerSecond / 1000;
  if (kbps >= 1000) {
    return `${(kbps / 1000).toFixed(1)} Mbps`;
  }
  return `${kbps.toFixed(0)} kbps`;
}

function formatSampleRate(hz: number): string {
  if (hz >= 1000) {
    return `${(hz / 1000).toFixed(1)} kHz`;
  }
  return `${hz} Hz`;
}

export function FileMetadataDetail({
  filePath,
  originalPath,
  metadata,
  isLoading,
  isDirectory: isDirectoryProp,
}: FileMetadataDetailProps) {
  const isDir = isDirectoryProp ?? metadata?.basic?.isDirectory ?? false;
  const showImage = !isDir && isPreviewableImage(filePath);
  const { thumbnailPath, isLoading: isThumbnailLoading } = useThumbnail(!isDir && !showImage ? filePath : null);

  // Build markdown content — skip previews for directories
  let markdown = "";
  if (showImage) {
    markdown = `![${basename(filePath)}](${encodeURI(filePath).replace(/\(/g, "%28").replace(/\)/g, "%29")})`;
  } else if (thumbnailPath) {
    markdown = `![${basename(filePath)}](${encodeURI(thumbnailPath).replace(/\(/g, "%28").replace(/\)/g, "%29")})`;
  } else if (isThumbnailLoading) {
    markdown = "*Loading preview...*";
  }

  // Determine what metadata sections to show
  const hasExif = metadata?.exif && Object.keys(metadata.exif).length > 0;
  const isAudioVideo = metadata?.spotlight?.duration !== undefined;
  const isDocument = metadata?.spotlight?.pageCount !== undefined;
  const isMusic = metadata?.spotlight?.artist || metadata?.spotlight?.album || metadata?.spotlight?.genre;

  return (
    <List.Item.Detail
      isLoading={isLoading || isThumbnailLoading}
      markdown={markdown || undefined}
      metadata={
        <List.Item.Detail.Metadata>
          {/* File Info Section */}
          <List.Item.Detail.Metadata.Label title="File" text={basename(filePath)} />
          {originalPath && originalPath !== filePath && (
            <List.Item.Detail.Metadata.Label title="Original" text={basename(originalPath)} />
          )}
          <List.Item.Detail.Metadata.Label title="Location" text={dirname(filePath)} />

          {metadata?.basic && (
            <>
              <List.Item.Detail.Metadata.Label title="Size" text={metadata.basic.sizeFormatted} />
              <List.Item.Detail.Metadata.Label title="Modified" text={formatDate(metadata.basic.modified)} />
              <List.Item.Detail.Metadata.Label title="Created" text={formatDate(metadata.basic.created)} />
            </>
          )}

          {metadata?.spotlight?.kind && <List.Item.Detail.Metadata.Label title="Kind" text={metadata.spotlight.kind} />}

          {/* Image Section */}
          {hasExif && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Image" />

              {metadata.exif?.dimensions && (
                <List.Item.Detail.Metadata.Label title="Dimensions" text={metadata.exif.dimensions} />
              )}

              {metadata.exif?.camera && <List.Item.Detail.Metadata.Label title="Camera" text={metadata.exif.camera} />}

              {metadata.exif?.dateTaken && (
                <List.Item.Detail.Metadata.Label title="Date Taken" text={formatDate(metadata.exif.dateTaken)} />
              )}

              {(metadata.exif?.aperture || metadata.exif?.shutterSpeed || metadata.exif?.iso) && (
                <List.Item.Detail.Metadata.Label
                  title="Exposure"
                  text={[
                    metadata.exif.aperture,
                    metadata.exif.shutterSpeed,
                    metadata.exif.iso ? `ISO ${metadata.exif.iso}` : null,
                  ]
                    .filter(Boolean)
                    .join("  •  ")}
                />
              )}

              {metadata.exif?.focalLength && (
                <List.Item.Detail.Metadata.Label title="Focal Length" text={metadata.exif.focalLength} />
              )}

              {metadata.exif?.gpsLocation && (
                <List.Item.Detail.Metadata.TagList title="GPS">
                  <List.Item.Detail.Metadata.TagList.Item text={metadata.exif.gpsLocation} color="#007AFF" />
                </List.Item.Detail.Metadata.TagList>
              )}

              {metadata.exif?.colorSpace && (
                <List.Item.Detail.Metadata.Label title="Color Space" text={metadata.exif.colorSpace} />
              )}
            </>
          )}

          {/* Audio/Video Section */}
          {isAudioVideo && !isMusic && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Media" />

              {metadata.spotlight?.durationFormatted && (
                <List.Item.Detail.Metadata.Label title="Duration" text={metadata.spotlight.durationFormatted} />
              )}

              {metadata.spotlight?.pixelWidth && metadata.spotlight?.pixelHeight && (
                <List.Item.Detail.Metadata.Label
                  title="Resolution"
                  text={`${metadata.spotlight.pixelWidth} × ${metadata.spotlight.pixelHeight}`}
                />
              )}

              {metadata.spotlight?.codec && (
                <List.Item.Detail.Metadata.Label title="Codec" text={metadata.spotlight.codec} />
              )}

              {metadata.spotlight?.videoBitRate && (
                <List.Item.Detail.Metadata.Label
                  title="Bitrate"
                  text={formatBitrate(metadata.spotlight.videoBitRate)}
                />
              )}

              {metadata.spotlight?.audioSampleRate && (
                <List.Item.Detail.Metadata.Label
                  title="Sample Rate"
                  text={formatSampleRate(metadata.spotlight.audioSampleRate)}
                />
              )}

              {metadata.spotlight?.audioChannels && (
                <List.Item.Detail.Metadata.Label
                  title="Channels"
                  text={
                    metadata.spotlight.audioChannels === 2
                      ? "Stereo"
                      : metadata.spotlight.audioChannels === 1
                        ? "Mono"
                        : `${metadata.spotlight.audioChannels} channels`
                  }
                />
              )}
            </>
          )}

          {/* Music Section */}
          {isMusic && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Music" />

              {metadata.spotlight?.title && (
                <List.Item.Detail.Metadata.Label title="Title" text={metadata.spotlight.title} />
              )}

              {metadata.spotlight?.artist && (
                <List.Item.Detail.Metadata.Label title="Artist" text={metadata.spotlight.artist} />
              )}

              {metadata.spotlight?.album && (
                <List.Item.Detail.Metadata.Label title="Album" text={metadata.spotlight.album} />
              )}

              {metadata.spotlight?.genre && (
                <List.Item.Detail.Metadata.Label title="Genre" text={metadata.spotlight.genre} />
              )}

              {metadata.spotlight?.composer && (
                <List.Item.Detail.Metadata.Label title="Composer" text={metadata.spotlight.composer} />
              )}

              {metadata.spotlight?.durationFormatted && (
                <List.Item.Detail.Metadata.Label title="Duration" text={metadata.spotlight.durationFormatted} />
              )}

              {metadata.spotlight?.audioBitRate && (
                <List.Item.Detail.Metadata.Label
                  title="Bitrate"
                  text={formatBitrate(metadata.spotlight.audioBitRate)}
                />
              )}
            </>
          )}

          {/* Document Section */}
          {isDocument && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Document" />

              {metadata.spotlight?.pageCount && (
                <List.Item.Detail.Metadata.Label
                  title="Pages"
                  text={`${metadata.spotlight.pageCount} page${metadata.spotlight.pageCount !== 1 ? "s" : ""}`}
                />
              )}

              {metadata.spotlight?.author && (
                <List.Item.Detail.Metadata.Label title="Author" text={metadata.spotlight.author} />
              )}

              {metadata.spotlight?.creator && (
                <List.Item.Detail.Metadata.Label title="Creator" text={metadata.spotlight.creator} />
              )}
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
