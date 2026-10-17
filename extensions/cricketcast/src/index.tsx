import { ActionPanel, List, showToast, Action, Toast, Icon, environment, LaunchType } from "@raycast/api";
import convert from "xml-js";
import { useCachedPromise } from "@raycast/utils";
import { InDepthData, MatchItem, RSS } from "./types";

export const useScores = () =>
  useCachedPromise(
    async () => {
      const toast =
        environment.launchType === LaunchType.UserInitiated
          ? await showToast(Toast.Style.Animated, `Fetching latest scores`)
          : undefined;

      const r = await fetch("https://static.cricinfo.com/rss/livescores.xml");
      if (!r.ok) throw new Error("Error fetching scores");
      const XMLdata = await r.text();
      const JSONdata: RSS<MatchItem> = JSON.parse(convert.xml2json(XMLdata, { compact: true, spaces: 4 }));
      const matches = JSONdata.rss.channel.item.map((match) => ({
        title: match.title["_text"].replace(" *", "*"),
        id: match.guid["_text"].replace(/\D+/g, ""),
        link: match.guid["_text"],
        summary: "",
        icon: "",
      }));

      if (toast) toast.title = "Fetching score details";
      for (const matchIndex in matches) {
        const res = await fetch(`https://www.espncricinfo.com/matches/engine/match/${matches[matchIndex].id}.json`);
        if (!res.ok || res.headers.get("content-type")?.includes("text")) {
          matches[matchIndex].summary = "N/A";
          matches[matchIndex].icon = Icon.Globe;
          continue;
        }
        const indepthData = (await res.json()) as InDepthData;
        matches[matchIndex].summary =
          indepthData.match.current_summary == ""
            ? indepthData.live.status
            : indepthData.match.current_summary.split("(")[1].replace(")", "");
        matches[matchIndex].icon =
          indepthData.match.current_summary != ""
            ? indepthData.team[0].team_id == indepthData.live.innings.batting_team_id
              ? "https://p.imgci.com" + indepthData.team[0].logo_image_path
              : "https://p.imgci.com" + indepthData.team[1].logo_image_path
            : "clock-16";
        if (matches[matchIndex].icon == "https://p.imgci.com") {
          matches[matchIndex].icon = Icon.Globe;
        }
      }
      return matches;
    },
    [],
    {
      async onData(data) {
        if (environment.launchType === LaunchType.UserInitiated)
          await showToast(Toast.Style.Success, `Fetched ${data.length} scores`);
      },
      keepPreviousData: true,
      initialData: [],
    },
  );

export default function Command() {
  const { isLoading, data } = useScores();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search score">
      {data.map((match) => (
        <List.Item
          key={match.id}
          icon={match.icon}
          title={match.title}
          subtitle={match.summary}
          actions={
            <ActionPanel title={match.title}>
              <ActionPanel.Section>
                <>
                  {match.link && <Action.OpenInBrowser url={match.link} />}
                  {match.link && <Action.CopyToClipboard content={match.link} title="Copy Link" />}
                </>
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
