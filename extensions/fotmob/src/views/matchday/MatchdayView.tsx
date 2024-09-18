import { useMemo, useState } from "react";
import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import type { MatchDayLeague } from "@/types/match-day";
import { useFavorite } from "@/hooks/useFavorite";
import { useMatchDay } from "@/hooks/useMatchDay";
import { useSearch } from "@/hooks/useSearch";
import { launchTeamCommand } from "@/utils/launcher/launchTeamDetailCommand";
import { buildLeagueDetailUrl, buildMatchDetailUrl, buildPlayerDetailUrl } from "@/utils/url-builder";
import MatchItem from "@/views/common/MatchItem";
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
                  icon={item.iamgeUrl}
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
                                title: "Added to Favorites",
                              });
                            }}
                          />
                        </>
                      ) : (
                        <Action.OpenInBrowser
                          icon={Icon.Globe}
                          title="Show Detail In Browser"
                          url={
                            item.type === "match"
                              ? buildMatchDetailUrl(item.payload.id)
                              : item.type === "player"
                                ? buildPlayerDetailUrl(item.payload.id)
                                : item.type === "league"
                                  ? buildLeagueDetailUrl(item.payload.id)
                                  : ""
                          }
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
            <MatchItem
              key={match.id}
              match={{
                ...match,
                tournament: {
                  leagueId: section.primaryId,
                  name: section.name,
                },
              }}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Show Detail In Browser" url={buildMatchDetailUrl(match.id)} />
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
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
