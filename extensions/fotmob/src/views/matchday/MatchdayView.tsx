import { useMemo, useState } from "react";
import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import type { MatchDayLeague } from "@/types/match-day";
import { useFavorite } from "@/hooks/useFavorite";
import { useMatchDay } from "@/hooks/useMatchDay";
import { useSearch } from "@/hooks/useSearch";
import { launchTeamCommand } from "@/utils/launcher/launchTeamDetailCommand";
import { buildLeagueDetailUrl, buildMatchDetailUrl, buildPlayerDetailUrl } from "@/utils/url-builder";
import EnhancedMatchItem from "@/views/common/EnhancedMatchItem";
import type { LeagueDropDownResult } from "./LeagueDropdown";
import { LeagueDropdown } from "./LeagueDropdown";

export default function MatchdayView() {
  const [date, setDate] = useState(new Date());
  const [query, setQuery] = useState("");
  const [filterLeague, setFilterLeague] = useState<LeagueDropDownResult>("all");
  const { data, isLoading } = useMatchDay(date);
  const searchState = useSearch(query);
  const favoriteService = useFavorite();

  const sections = useMemo(() => {
    const leagues = (data?.leagues ?? []).filter((league) => {
      if (filterLeague === "all") {
        return true;
      }

      return league.primaryId === filterLeague;
    });

    let numberOfMatches = 0;
    const sections: MatchDayLeague[] = [];

    while (numberOfMatches <= 50) {
      const league = leagues.shift();
      if (league == null) {
        break;
      }

      sections.push(league);
      numberOfMatches += league.matches.length;
    }

    return sections;
  }, [data, filterLeague]);

  if (query.trim().length > 0 && ((searchState.result ?? []).length > 0 || !searchState.isLoading)) {
    return (
      <List
        isLoading={isLoading || searchState.isLoading}
        searchBarPlaceholder="Search for Clubs, Leagues, and Players"
        filtering={false}
        navigationTitle="Match Day"
        onSearchTextChange={setQuery}
        throttle={true}
      >
        {searchState.result?.map((section) => {
          return (
            <List.Section title={section.title} key={section.title}>
              {section.items.map((item) => (
                <List.Item
                  key={item.title}
                  icon={item.imageUrl}
                  title={item.title}
                  subtitle={item.subtitle}
                  accessories={item.accessories}
                  actions={
                    <ActionPanel>
                      {item.type === "team" ? (
                        <>
                          <Action
                            icon={Icon.Calendar}
                            title="Show Fixture"
                            onAction={() => {
                              launchTeamCommand(item.payload.id);
                            }}
                          />
                          <Action.CopyToClipboard
                            icon={Icon.Clipboard}
                            title={`Copy Team ID (${item.payload.id})`}
                            content={item.payload.id}
                            shortcut={{ modifiers: ["cmd"], key: "." }}
                          />
                          {favoriteService.teams.some((team) => team.id === item.payload.id) ? (
                            <Action
                              icon={Icon.StarDisabled}
                              title="Remove from Favorites"
                              onAction={async () => {
                                await favoriteService.removeItems("team", item.payload.id);
                                showToast({
                                  style: Toast.Style.Success,
                                  title: "Removed from favorites",
                                  message: `${item.title} removed from favorites`,
                                });
                              }}
                              shortcut={{ modifiers: ["cmd"], key: "d" }}
                            />
                          ) : (
                            <Action
                              icon={Icon.Star}
                              title="Add to Favorites"
                              onAction={async () => {
                                await favoriteService.addItems({
                                  type: "team",
                                  value: {
                                    id: item.payload.id,
                                    leagueId: `${item.payload.leagueId}`,
                                    name: item.title,
                                  },
                                });
                                showToast({
                                  style: Toast.Style.Success,
                                  title: "Added to favorites",
                                  message: `${item.title} added to favorites`,
                                });
                              }}
                              shortcut={{ modifiers: ["cmd"], key: "f" }}
                            />
                          )}
                        </>
                      ) : item.type === "league" ? (
                        <>
                          <Action.OpenInBrowser
                            icon={Icon.Globe}
                            title="Show Detail in Browser"
                            url={buildLeagueDetailUrl(item.payload.id)}
                          />
                          <Action.CopyToClipboard
                            icon={Icon.Clipboard}
                            title={`Copy League ID (${item.payload.id})`}
                            content={item.payload.id}
                            shortcut={{ modifiers: ["cmd"], key: "." }}
                          />
                          {favoriteService.leagues.some((league) => league.id === item.payload.id) ? (
                            <Action
                              icon={Icon.StarDisabled}
                              title="Remove from Favorites"
                              onAction={async () => {
                                await favoriteService.removeItems("league", item.payload.id);
                                showToast({
                                  style: Toast.Style.Success,
                                  title: "Removed from favorites",
                                  message: `${item.title} removed from favorites`,
                                });
                              }}
                              shortcut={{ modifiers: ["cmd"], key: "d" }}
                            />
                          ) : (
                            <Action
                              icon={Icon.Star}
                              title="Add to Favorites"
                              onAction={async () => {
                                await favoriteService.addItems({
                                  type: "league",
                                  value: {
                                    id: item.payload.id,
                                    name: item.title,
                                    countryCode: "",
                                  },
                                });
                                showToast({
                                  style: Toast.Style.Success,
                                  title: "Added to favorites",
                                  message: `${item.title} added to favorites`,
                                });
                              }}
                              shortcut={{ modifiers: ["cmd"], key: "f" }}
                            />
                          )}
                        </>
                      ) : item.type === "player" ? (
                        <>
                          <Action.OpenInBrowser
                            icon={Icon.Globe}
                            title="Show Detail in Browser"
                            url={buildPlayerDetailUrl(item.payload.id)}
                          />
                          <Action.CopyToClipboard
                            icon={Icon.Clipboard}
                            title={`Copy Player ID (${item.payload.id})`}
                            content={item.payload.id}
                            shortcut={{ modifiers: ["cmd"], key: "." }}
                          />
                          {favoriteService.players.some((player) => player.id === item.payload.id) ? (
                            <Action
                              icon={Icon.StarDisabled}
                              title="Remove from Favorites"
                              onAction={async () => {
                                await favoriteService.removeItems("player", item.payload.id);
                                showToast({
                                  style: Toast.Style.Success,
                                  title: "Removed from favorites",
                                  message: `${item.title} removed from favorites`,
                                });
                              }}
                              shortcut={{ modifiers: ["cmd"], key: "d" }}
                            />
                          ) : (
                            <Action
                              icon={Icon.Star}
                              title="Add to Favorites"
                              onAction={async () => {
                                await favoriteService.addItems({
                                  type: "player",
                                  value: {
                                    id: item.payload.id,
                                    name: item.title,
                                    isCoach: false,
                                  },
                                });
                                showToast({
                                  style: Toast.Style.Success,
                                  title: "Added to favorites",
                                  message: `${item.title} added to favorites`,
                                });
                              }}
                              shortcut={{ modifiers: ["cmd"], key: "f" }}
                            />
                          )}
                        </>
                      ) : (
                        <Action.OpenInBrowser
                          icon={Icon.Globe}
                          title="Show Detail in Browser"
                          url={item.type === "match" ? buildMatchDetailUrl(item.payload.id) : ""}
                        />
                      )}
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          );
        })}
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading || searchState.isLoading}
      searchBarPlaceholder="Search for Clubs, Leagues, and Players"
      filtering={false}
      navigationTitle="Match Day"
      onSearchTextChange={setQuery}
      throttle={true}
      searchBarAccessory={
        <LeagueDropdown
          leagues={data?.leagues ?? []}
          onChange={(league) => {
            setFilterLeague(league);
          }}
        />
      }
      actions={
        <ActionPanel>
          <Action.PickDate
            title="Pick Date"
            onChange={(newDate) => {
              if (newDate != null) {
                setDate(newDate);
              }
            }}
          />
        </ActionPanel>
      }
    >
      {sections.map((section) => (
        <List.Section title={section.name} key={section.id}>
          {section.matches.map((match) => (
            <EnhancedMatchItem
              key={match.id}
              match={{
                ...match,
                tournament: {
                  leagueId: section.primaryId,
                  name: section.name,
                },
              }}
              additionalActions={
                <Action.PickDate
                  title="Pick Date"
                  onChange={(newDate) => {
                    if (newDate != null) {
                      setDate(newDate);
                    }
                  }}
                />
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
