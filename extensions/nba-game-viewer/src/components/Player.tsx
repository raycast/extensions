import type { Player } from "../types/roster.types";
import { List, ActionPanel, Action, Icon } from "@raycast/api";
import generatePlayerAccessories from "../utils/generatePlayerAccessories";

type PropTypes = {
  player: Player;
  isShowingDetail: boolean;
  setIsShowingDetail: (show: boolean) => void;
};

const PlayerComponent = ({ player, isShowingDetail, setIsShowingDetail }: PropTypes) => {
  return (
    <List.Item
      key={player.id}
      title={player.fullName}
      icon={player.headshot ?? Icon.PersonCircle}
      subtitle={isShowingDetail ? undefined : player.position}
      accessories={generatePlayerAccessories(player)}
      detail={
        <List.Item.Detail
          markdown={
            player.headshot
              ? `<img src="${player.headshot}" alt="Photo of ${player.fullName}" width="250"/>`
              : undefined
          }
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Name" text={player.fullName} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Position" text={player.position} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Height" text={player.height} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Weight" text={player.weight} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Age" text={String(player.age)} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Birth Place" text={player.birthplace} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Jersey" text={player.jerseyNumber} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Salary" text={player.salary} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Draft Info" text={player.draft} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel title="Player Actions">
          <Action
            title={isShowingDetail ? "Hide Player Info" : "Show Player Info"}
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            onAction={() => setIsShowingDetail(!isShowingDetail)}
          />
          {/* eslint-disable-next-line @raycast/prefer-title-case */}
          <Action.OpenInBrowser title="View Player on ESPN" url={player.link} />
        </ActionPanel>
      }
    />
  );
};

export default PlayerComponent;
