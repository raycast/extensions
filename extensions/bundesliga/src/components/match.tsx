import { Action, ActionPanel, Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import json2md from "json2md";
import { getMatch } from "../api";
import { LiveBlogEntryItem, Matchday } from "../types/firebase";

function convert(entry: LiveBlogEntryItem) {
  const time = entry.playtime.injuryTime
    ? `${entry.playtime.minute}'+${entry.playtime.injuryTime}`
    : `${entry.playtime.minute}'`;

  switch (entry.entryType) {
    case "sub":
      return [
        { h2: `${time} - Substitution` },
        {
          p: [
            `**In:** ${entry.detail.in.name}`,
            `**Out:** ${entry.detail.out.name}`,
          ],
        },
      ];
    case "goal":
      return [
        { h2: `${time} - Goal` },
        {
          p: [
            `**${entry.detail.scorer.name}**`,
            `${entry.detail.score.home} - ${entry.detail.score.away}`,
          ],
        },
      ];
    case "yellowCard":
      return [
        { h2: `${time} - Yellow Card` },
        { p: `🟨 ${entry.detail.person.name}` },
      ];
    case "yellowRedCard":
      return [
        { h2: `${time} - Second Yellow Card` },
        { p: `🟨🟨 ${entry.detail.person.name}` },
      ];
    case "redCard":
      return [
        { h2: `${time} - Red Card` },
        { p: `🟥 ${entry.detail.person.name}` },
      ];
    case "freetext":
      return [
        { h2: `${time} - ${entry.detail.headline}` },
        { p: entry.detail.text },
      ];
    case "image":
      return [
        {
          h2: entry.detail.headline
            ? `${time} - ${entry.detail.headline}`
            : time,
        },
        { p: entry.detail.text || "" },
        {
          img: {
            source: entry.detail.url,
            title: entry.detail.copyright,
          },
        },
      ];
    case "stats":
      switch (entry.detail.type) {
        case "playerRanking":
          return [
            {
              h2: `${time} - Speed check: The fastest player in the game after ${entry.playtime.minute} minutes`,
            },
            {
              ul: entry.detail.ranking.map(
                (p) => `${p.person.name}: ${p.value}${p.unit}`,
              ),
            },
          ];
        default:
          return [];
      }
    case "videoAssistant":
      return [
        { h2: time },
        {
          img: {
            source: "https://www.bundesliga.com/assets/liveticker/var.png",
            title: "VAR",
          },
        },
        {
          p: [
            `Situation: ${entry.detail.situation}`,
            `Review: ${entry.detail.review}`,
            `Decision: **${entry.detail.decision}**`,
          ],
        },
      ];
    case "end_firstHalf":
      return [{ h1: "Half-time" }];
    case "end_secondHalf":
      return [{ h1: "Full-time" }];
    case "start_firstHalf":
    case "start_secondHalf":
      return [{ h1: "Kick-off!" }];
    case "finalWhistle":
    case "video":
    case "embed":
    default:
      return [];
  }
}

export default function Match(props: Matchday) {
  const liveBlogUrl = `https://webview.bundesliga.com/en/liveticker/${props.dflDatalibraryCompetitionId}/${props.dflDatalibrarySeasonId}/${props.dflDatalibraryMatchdayId}/${props.dflDatalibraryMatchId}`;

  const { data: entries, isLoading } = usePromise(getMatch, [liveBlogUrl]);

  const dataObject: json2md.DataObject = entries
    ? [
        { h1: "Highlights" },
        Object.values(entries)
          .sort((a, b) => b.order - a.order)
          .map((entry) => convert(entry)),
      ]
    : [];

  return (
    <Detail
      navigationTitle={`${props.teams.home.nameFull} - ${props.teams.away.nameFull} | Matchday ${props.matchday}`}
      isLoading={isLoading}
      markdown={json2md(dataObject)}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={liveBlogUrl} />
        </ActionPanel>
      }
    />
  );
}
