import { Action, Detail, List } from "@raycast/api";
import { getPlayHistory, useGameInfo } from "../helpers/nintendo";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

export default function GameInfoDetail({ titleId }: { titleId: string }) {
  const gameInfo = useGameInfo(titleId);
  const gamePlayHistory = getPlayHistory(titleId);
  if (!gamePlayHistory) {
    return (
      <List>
        <List.EmptyView />
      </List>
    );
  }
  const markdown = `
   # ${gameInfo.data?.name || ""}
   
   \`${gameInfo.data?.publisher || ""}\`
   \`${dayjs(gameInfo.data?.releaseDate).format("MMMM DD,YYYY")}\`

   > **${gameInfo.data?.headline || ""}**
   
   ${gameInfo.data?.screenshots
     .filter(Boolean)
     .map((screenshot: string) => `![](${screenshot})`)
     .join("")}
   `;
  return (
    <Detail
      isLoading={gameInfo.isLoading}
      navigationTitle={gameInfo.data?.name || gamePlayHistory.titleName}
      markdown={gameInfo.data ? markdown : `# ${gamePlayHistory.titleName}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="First Played Time" text={dayjs(gamePlayHistory.firstPlayedAt).fromNow()} />
          <Detail.Metadata.Label title="Last Played Time" text={dayjs(gamePlayHistory.lastPlayedAt).fromNow()} />
          <Detail.Metadata.Label
            title="Weekly (Total) Played Time"
            text={gamePlayHistory.weeklyPlayedMinutes + " mins" + " (" + gamePlayHistory.totalPlayTime + ")"}
          />
          {gameInfo.data && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.TagList title="Genre">
                {gameInfo.data?.genres.map((genre: any) => {
                  return <Detail.Metadata.TagList.Item text={genre.label} color={genre.color} />;
                })}
              </Detail.Metadata.TagList>
              <Detail.Metadata.TagList title="Supported play modes">
                {gameInfo.data?.playModes.map((mode: any) => {
                  return (
                    <Detail.Metadata.TagList.Item text="" icon={{ source: `${mode.code}.svg` }} color={"#666666"} />
                  );
                })}
              </Detail.Metadata.TagList>
              <Detail.Metadata.Label
                title="Game file size"
                text={(gameInfo.data?.romFileSize / 1024 / 1024 / 1024).toFixed(1) + " GB"}
              />
            </>
          )}
        </Detail.Metadata>
      }
    />
  );
}
export const PushGameInfoDetailAction = (props: { titleId: string }) => {
  return <Action.Push title="Game Detail" target={<GameInfoDetail {...props} />} />;
};
