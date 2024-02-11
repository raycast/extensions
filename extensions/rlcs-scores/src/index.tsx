import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";

import { useFetch } from "@raycast/utils";

import { z } from "zod";

import dayjs from "dayjs";
import { useState } from "react";
import { MatchDetails } from "./match-details";
import { matchSchema } from "./schemas/match.schema";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { isLoading, data } = useFetch<{ matches: z.infer<typeof matchSchema>[] }>(
    "https://zsr.octane.gg/matches?event=65a25fc3370e82dfea33d636",
    {
      parseResponse: (response) => response.json(),
    },
  );

  if (isLoading) {
    showToast({
      title: "Fetching new scores",
      style: Toast.Style.Animated,
    });
  } else {
    showToast({
      title: "Scores up to date",
      style: Toast.Style.Success,
    });
  }

  const groupedMatches = data?.matches
    ?.filter((match) => match.blue && match.orange)
    ?.filter((match) =>
      `${match.blue?.team?.team?.name} ${match.orange?.team?.team.name}`
        .toLowerCase()
        .replace(/\s/g, "")
        .includes(searchText.toLowerCase().replace(/\s/g, "")),
    )
    .reduce(
      (groups, item) => {
        const date = item.date.split("T")[0];
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(item);
        return groups;
      },
      {} as Record<string, z.infer<typeof matchSchema>[]>,
    );

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search game"
      searchBarPlaceholder="Search game"
    >
      {Object.keys(groupedMatches || {})
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
        .map((key) => {
          const matches = groupedMatches?.[key] || [];

          return (
            <List.Section
              key={key}
              title={`${
                dayjs(key).format("M/D/YYYY") === dayjs().format("M/D/YYYY")
                  ? "Today"
                  : dayjs(key).format("dddd, MMMM D")
              } (${matches?.[0]?.stage.name})`}
            >
              {matches.map((match) => {
                return (
                  <List.Item
                    key={match._id}
                    title={`${match.blue?.team?.team?.name} vs ${match.orange?.team?.team.name}`}
                    subtitle={dayjs(match.date).format("h:mm A")}
                    icon={match.blue.winner || match.orange.winner ? Icon.CircleProgress100 : Icon.Circle}
                    accessories={[
                      {
                        text: {
                          value: match.blue?.team?.team?.name || "",
                          color: Color.Blue,
                        },
                        icon: { source: match.blue?.team?.team?.image || "" },
                      },
                      { text: match.blue?.score?.toString() || "0" },
                      { text: ":" },
                      { text: match.orange?.score?.toString() || "0" },
                      {
                        text: { value: match.orange?.team?.team?.name || "", color: Color.Orange },
                        icon: { source: match.orange?.team?.team?.image || "" },
                      },
                    ]}
                    actions={
                      <ActionPanel>
                        <Action.Push title="Show Details" target={<MatchDetails match={match} />} />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          );
        })}
    </List>
  );
}
