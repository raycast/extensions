import { memo } from "react";

import { Action, ActionPanel, Color, Icon } from "@raycast/api";

import type { FollowedChannel } from "@/interfaces/FollowedChannel";
import type { FollowedStreams } from "@/interfaces/FollowedStreams";
import type { Video } from "@/interfaces/Video";

function BrowserActionsF({
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
        <Action.OpenInBrowser
          title="Open Live Stream in Browser"
          url={`https://twitch.tv/${channel.broadcaster_login}`}
          onOpen={onAction}
          icon={{ source: Icon.CircleFilled, tintColor: Color.Red }}
        />
      ) : null}
      {first.archive ? (
        <Action.OpenInBrowser
          title="Open Latest VOD in Browser"
          url={first.archive.url}
          onOpen={onAction}
          icon={Icon.Video}
        />
      ) : null}
      {first.highlight ? (
        <Action.OpenInBrowser
          title="Open Latest Highlight in Browser"
          url={first.highlight.url}
          onOpen={onAction}
          icon={Icon.Bolt}
        />
      ) : null}
      {first.upload ? (
        <Action.OpenInBrowser
          title="Open Latest Upload in Browser"
          url={first.upload.url}
          onOpen={onAction}
          icon={Icon.FilmStrip}
        />
      ) : null}
      {!live ? (
        <Action.OpenInBrowser
          title="Open Channel in Browser"
          url={`https://twitch.tv/${channel.broadcaster_login}`}
          onOpen={onAction}
        />
      ) : null}
    </ActionPanel.Section>
  );
}

const BrowserActions = memo(BrowserActionsF);

export default BrowserActions;
