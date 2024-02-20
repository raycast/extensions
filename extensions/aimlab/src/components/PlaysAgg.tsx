import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { Player } from "../types/player.types";
import usePlaysAgg from "../hooks/usePlaysAgg";
import generatePlayerRankData from "../utils/generatePlayerRankData";

type PropTypes = {
  player: Player;
};

const PlaysAgg = ({ player }: PropTypes) => {
  const { data, isLoading } = usePlaysAgg(player.id);

  const { playerSkill, rankingName, rankingImage, progress, playerLink } = generatePlayerRankData(player);

  const markdown = `
### TASKS

| Task name     | Best score | Plays |
|---------------|------------|-------|
${data?.map((item) => `| ${item.task_name}   | ${item.bestScore.toLocaleString()} |  ${item.plays} |`).join("\n")}
      `;

  return (
    <Detail
      key={player.username}
      isLoading={isLoading}
      navigationTitle={player.username}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Username" text={player.username} />
          <Detail.Metadata.Label title="Ranking" text={rankingName} icon={rankingImage} />
          <Detail.Metadata.Label title="Progress to next rank" text={progress.toFixed() + "%"} />
          <Detail.Metadata.Label title="Skill" text={playerSkill.toString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="View on Aimlab" target={playerLink} text={player.username} />
          <Detail.Metadata.Link
            title="Find a coach to help you improve"
            target="https://playerbase.com/"
            text="Playerbase"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="View Player on Aimlab" url={playerLink} />
        </ActionPanel>
      }
    />
  );
};

export default PlaysAgg;
