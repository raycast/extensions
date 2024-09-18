import type { Player } from "../types/player.types";
import { List, ActionPanel, Action, Icon, environment } from "@raycast/api";
import generatePlayerAccessories from "../utils/generatePlayerAccessories";
import generatePlayerRankData from "../utils/generatePlayerRankData";
import PlaysAgg from "./PlaysAgg";

type PropTypes = {
  player: Player;
  isShowingDetail: boolean;
  setIsShowingDetail: (show: boolean) => void;
};

const PlayerComponent = ({ player, isShowingDetail, setIsShowingDetail }: PropTypes) => {
  const { playerSkill, rankingName, rankingTier, rankingLevel, rankingImage, progress, playerLink } =
    generatePlayerRankData(player);

  const markdown = `
[<img src="${rankingImage}" width="100" height="100" title="${rankingName}"/>](${rankingImage})
`;

  return (
    <List.Item
      key={player.id}
      title={player.username}
      icon={environment.appearance === "dark" ? "avatar-light.png" : "avatar-dark.png"}
      subtitle={isShowingDetail ? undefined : rankingName}
      accessories={generatePlayerAccessories(player)}
      detail={
        <List.Item.Detail
          markdown={rankingTier && rankingLevel ? markdown : undefined}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Ranking" text={rankingName} icon={rankingImage} />
              <List.Item.Detail.Metadata.Label title="Progress to next rank" text={progress.toFixed() + "%"} />
              <List.Item.Detail.Metadata.Label title="Skill" text={playerSkill.toString()} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Skill scores">
                {player?.skillScores?.map((skill, index) => (
                  <List.Item.Detail.Metadata.TagList.Item
                    key={index}
                    text={skill.name + ": " + Math.round(skill.score)}
                  />
                ))}
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Quicklinks" />
              <List.Item.Detail.Metadata.Link title="View on Aimlab" target={playerLink} text={player.username} />
              <List.Item.Detail.Metadata.Link
                title="Find a coach to help you improve"
                target="https://playerbase.com/"
                text="Playerbase"
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel title="Player Actions">
          <Action.Push title="Show Player Tasks" icon={Icon.ArrowRight} target={<PlaysAgg player={player} />} />
          <Action
            title={isShowingDetail ? "Hide Player Info" : "Show Player Info"}
            icon={Icon.Sidebar}
            onAction={() => setIsShowingDetail(!isShowingDetail)}
          />
          <Action.OpenInBrowser title="View Player on Aimlab" url={playerLink} />
        </ActionPanel>
      }
    />
  );
};

export default PlayerComponent;
