import millify from "millify";
import { memo } from "react";

import { Color, Icon, List } from "@raycast/api";

import { action } from "@/helpers/action";
import { formatDate, getUpTime } from "@/helpers/datetime";
import { renderDetails } from "@/helpers/renderDetails";
import type { FollowedStreams } from "@/interfaces/FollowedStreams";

function LiveListItemF({ live, onAction }: { live: FollowedStreams; onAction?: () => void }) {
  const typeAccessory = { icon: { source: Icon.CircleFilled, tintColor: Color.Red }, text: "Live" };
  return (
    <List.Item
      id={live.id}
      title={live.title}
      accessories={[typeAccessory]}
      actions={action(live.user_login, true, onAction)}
      detail={
        <List.Item.Detail
          markdown={renderDetails(live)}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title={live.title} />
              <List.Item.Detail.Metadata.Label title="Type" {...typeAccessory} />
              <List.Item.Detail.Metadata.Label
                title="Started At"
                text={formatDate(live.started_at)}
                icon={{ source: Icon.Clock, tintColor: Color.Blue }}
              />
              <List.Item.Detail.Metadata.Label
                title="Stream Uptime"
                text={getUpTime(live.started_at)}
                icon={{ source: Icon.Clock, tintColor: Color.Blue }}
              />
              <List.Item.Detail.Metadata.Label
                title="Category"
                text={live.game_name}
                icon={{ source: Icon.Box, tintColor: Color.Purple }}
              />

              <List.Item.Detail.Metadata.Separator />

              <List.Item.Detail.Metadata.Label
                title="Viewer Count"
                text={millify(live.viewer_count)}
                icon={{ source: Icon.Person, tintColor: Color.Red }}
              />
              <List.Item.Detail.Metadata.Label
                title="Language"
                text={live.language}
                icon={{ source: Icon.SpeechBubble, tintColor: Color.Yellow }}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}

const LiveListItem = memo(LiveListItemF);

export default LiveListItem;
