import { Action, ActionPanel, Color, Grid, Icon } from "@raycast/api";

import type { VideoHit } from "@/types";

import { compactNumberFormat } from "@/lib/utils";
import { getPreviewUrl } from "@/lib/videos";

import VideoDetail from "@/components/VideoDetail";
import VideoPageOpenInBrowserAction from "@/components/VideoPageOpenInBrowserAction";

export default function VideoGridItem(props: { hit: VideoHit }): JSX.Element {
  const hit = props.hit;
  return (
    <Grid.Item
      title={`♥️${compactNumberFormat(hit.likes)} ⬇️${compactNumberFormat(hit.downloads)} 👁️${compactNumberFormat(
        hit.views,
      )}`}
      subtitle={hit.tags}
      content={getPreviewUrl(hit)}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Video"
            target={<VideoDetail hit={hit} />}
            icon={{ source: Icon.Video, tintColor: Color.PrimaryText }}
          />
          <VideoPageOpenInBrowserAction hit={hit} />
        </ActionPanel>
      }
    />
  );
}
