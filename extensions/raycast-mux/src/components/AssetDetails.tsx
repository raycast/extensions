import { Detail, Clipboard, Icon, ActionPanel, showToast } from "@raycast/api";
import Mux from "@mux/mux-node";
import AssetActions from "./AssetActions.js";

type AssetDetailsProps = Detail.Props & {
  asset: Mux.Video.Asset;
  onDelete?: () => void;
};

export default function AssetDetails({ asset, onDelete, ...rest }: AssetDetailsProps) {
  return (
    <Detail
      markdown={`![](https://image.mux.com/${asset.playback_ids?.[0].id}/animated.gif)`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Asset ID" text={asset.id} />
          <Detail.Metadata.Label title="Created" text={asset.created_at} />
          <Detail.Metadata.Label title="Status" text={asset.status} />
          <Detail.Metadata.Label title="Duration" text={asset.duration?.toString()} />
          <Detail.Metadata.Label title="Video Quality" text={asset.video_quality} />
          <Detail.Metadata.Label title="Resolution Tier" text={asset.max_resolution_tier} />
          <Detail.Metadata.Label title="Max Frame Rate" text={asset.max_stored_frame_rate?.toString()} />
          <Detail.Metadata.Label title="Aspect Ratio" text={asset.aspect_ratio} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="MP4 Support" text={asset.mp4_support} />
          <Detail.Metadata.TagList title="Playback IDs">
            {asset.playback_ids?.map((pid) => (
              <Detail.Metadata.TagList.Item
                key={pid.id}
                text={pid.policy}
                onAction={async () => {
                  await Clipboard.copy(pid.id);
                  await showToast({ title: "Playback ID Copied to Clipboard" });
                }}
              />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Tracks">
            {asset.tracks?.map((track) => (
              <Detail.Metadata.TagList.Item
                key={track.id}
                text={
                  track.type == "audio"
                    ? track.max_channel_layout
                    : track.type == "video"
                      ? `${track.max_height}p`
                      : track.name
                }
                icon={track.type == "audio" ? Icon.Music : track.type == "video" ? Icon.FilmStrip : Icon.Text}
              />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Passthru Data" text={asset.passthrough} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <AssetActions asset={asset} onDelete={() => onDelete && onDelete()} />
        </ActionPanel>
      }
      {...rest}
    />
  );
}
