import { List } from "@raycast/api";
import { Match, MatchState, matchStateColor } from "./types";
import { formatDateTime } from "./utils";

type Props = {
  blockName: string;
  startTime: string;
  state: MatchState;
  match: Match;
  vid?: string;
};

export default function ItemDetail({ match, blockName, startTime, state, vid }: Props) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="BlockName" text={`${blockName}`} />
          {/* 比赛状态 */}
          <List.Item.Detail.Metadata.TagList title="State">
            <List.Item.Detail.Metadata.TagList.Item text={`${state}`} color={matchStateColor[state]} />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label title="League" text={"Worlds"} />
          <List.Item.Detail.Metadata.Label title="Strategy" text={`${match.strategy.type} ${match.strategy.count}`} />
          <List.Item.Detail.Metadata.TagList title="Teams">
            <List.Item.Detail.Metadata.TagList.Item text={`${match.teams[0].code}`} />
            <List.Item.Detail.Metadata.TagList.Item text={`${match.teams[1].code}`} />
          </List.Item.Detail.Metadata.TagList>
          {/* 比赛时间 */}
          <List.Item.Detail.Metadata.Label title="Start Time" text={`${formatDateTime(new Date(startTime))}`} />
          {vid && (
            <List.Item.Detail.Metadata.Link
              title="See match"
              text="YouTube"
              target={`https://www.youtube.com/watch?v=${vid}`}
            />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
