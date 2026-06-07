import { Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import { resolveDevice } from "./wiim/discovery";
import { WiiMAPI } from "./wiim/api";
import { MetaInfo } from "./wiim/types";

// Popular encoders and compression libraries cap out at 24-bit.
function clampBitDepth(value: number, min: number): string {
  return `${Math.max(min, Math.min(24, value))}-bit`;
}

function formatSampleRate(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} kHz`;
  }
  return `${value} Hz`;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [metaInfo, setMetaInfo] = useState({} as MetaInfo);

  useEffect(() => {
    resolveDevice()
      .then((device) => new WiiMAPI(device).getMetaInfo())
      .then((metaInfo) => setMetaInfo(metaInfo))
      .catch(() => {
        /* keep default */
      })
      .finally(() => setIsLoading(false));
  }, []);

  const bitrateText =
    metaInfo.bitRate && metaInfo.bitDepth && metaInfo.sampleRate
      ? `${metaInfo.bitRate} kbps | ${clampBitDepth(metaInfo.bitDepth, 0)}/${formatSampleRate(metaInfo.sampleRate)}`
      : "-";

  return (
    <Detail
      isLoading={isLoading}
      markdown={
        metaInfo.albumArtURI ? `![Album Art](${metaInfo.albumArtURI})` : `# No Album Art\n\n_No cover image available_`
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Artist" text={metaInfo.artist || "-"} />
          <Detail.Metadata.Label title="Title" text={metaInfo.title || "-"} />
          <Detail.Metadata.Label title="Album" text={metaInfo.album || "-"} />
          <Detail.Metadata.TagList title="Bitrate">
            <Detail.Metadata.TagList.Item text={bitrateText} color={"#356dee"} />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
    />
  );
}
