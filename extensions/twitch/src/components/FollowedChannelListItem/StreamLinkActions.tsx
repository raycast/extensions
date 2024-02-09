import { memo } from "react";

import { ActionPanel, Icon } from "@raycast/api";

import { ActionWatchStream } from "@/helpers/action";
import type { FollowedChannel } from "@/interfaces/FollowedChannel";
import type { FollowedStreams } from "@/interfaces/FollowedStreams";
import type { Video } from "@/interfaces/Video";

function StreamLinkActionsF({
  channel,
  live,
  onAction,
  first,
}: {
  channel: FollowedChannel;
  live?: FollowedStreams;
  onAction?: () => void;
  first: {
    archive: Video | undefined;
    highlight: Video | undefined;
    upload: Video | undefined;
  };
}) {
  return (
    <ActionPanel.Section>
      {live ? (
        <ActionWatchStream
          title="Watch Live Stream"
          name={channel.broadcaster_login}
          onAction={onAction}
          icon={Icon.Eye}
        />
      ) : null}
      {first.archive ? (
        <ActionWatchStream title="Watch latest VOD" name={first.archive.url} onAction={onAction} icon={Icon.Video} />
      ) : null}
      {first.highlight ? (
        <ActionWatchStream
          title="Watch latest Highlight"
          name={first.highlight.url}
          onAction={onAction}
          icon={Icon.Bolt}
        />
      ) : null}
      {first.upload ? (
        <ActionWatchStream
          title="Watch latest Upload"
          name={first.upload.url}
          onAction={onAction}
          icon={Icon.FilmStrip}
        />
      ) : null}
    </ActionPanel.Section>
  );
}

const StreamLinkActions = memo(StreamLinkActionsF);

export default StreamLinkActions;
