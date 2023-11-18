import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { Event, League, matchStateColor } from "./types";
import Filter from "./Filter";
import { getIcon, prettyDate } from "./utils";
import { useEffect } from "react";
import ItemDetail from "./ItemDetail";

export default function Command() {
  const apiKey = "0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z";
  const { isLoading, data } = useFetch<{
    data: {
      schedule: {
        events: Event[];
      };
    };
  }>("https://esports-api.lolesports.com/persisted/gw/getSchedule?hl=en-US", {
    headers: {
      "x-api-key": apiKey,
    },
  });

  const { isLoading: isLoadingLeagues, data: dataLeagues } = useFetch<{
    data: {
      leagues: League[];
    };
  }>("https://esports-api.lolesports.com/persisted/gw/getLeagues?hl=en-US", {
    headers: {
      "x-api-key": apiKey,
    },
  });

  const [events, setEvents] = useCachedState<Event[]>("events", []);

  const [leagues] = useCachedState("leagues", dataLeagues?.data.leagues);

  const [filter, setFilter] = useCachedState("filter", "all");
  const [showingDetail, setShowingDetail] = useCachedState("showDetails", false);
  const onFilterChange = (value: string) => {
    setFilter(value);
  };

  useEffect(() => {
    let eventList = data?.data.schedule.events || [];
    // 对比赛进行过滤
    if (filter !== "all") {
      const filterLeague = leagues?.find((league) => league.id === filter);
      eventList = eventList.filter((event) => event.league.slug === filterLeague?.slug);
    }
    // 对比赛进行排序
    eventList.sort((a, b) => {
      const dataA = new Date(a.startTime).getTime();
      const dataB = new Date(b.startTime).getTime();
      return dataB - dataA;
    });

    setEvents(eventList);
  }, [filter]);
  return (
    <List
      isShowingDetail={showingDetail}
      isLoading={isLoading || isLoadingLeagues}
      searchBarAccessory={<Filter leagueList={leagues} handleChange={onFilterChange} />}
    >
      <List.EmptyView title="No Result" />
      <List.Section title="Matches" key={"1"}>
        {events?.map((event: Event) => {
          const team1 = event.match.teams[0];
          const team2 = event.match.teams[1];
          const league = leagues?.find((league) => league.slug === event.league.slug) || {
            name: "Worlds",
            image: "https://static.lolesports.com/leagues/1592594612171_WorldsDarkBG.png",
          };

          return (
            <List.Item
              key={event.match.id}
              id={event.match.id}
              icon={{
                source: Icon.Dot,
                tintColor: matchStateColor[event.state],
              }}
              keywords={["T1"]}
              title={`${event.blockName} ${team1.code} vs ${team2.code}`}
              subtitle={!showingDetail ? prettyDate(event.startTime) : undefined}
              actions={
                <ActionPanel>
                  <Action
                    title="Toggle Details"
                    icon={Icon.AppWindowSidebarLeft}
                    onAction={() => setShowingDetail(!showingDetail)}
                  />
                  {/* <Action title="Add Calendar" icon={Icon.Calendar} onAction={() => {}} />
                  <Action title="See live on YouTube" icon={Icon.Video} onAction={() => {}} /> */}
                </ActionPanel>
              }
              accessories={
                !showingDetail
                  ? [
                      {
                        icon: getIcon(league.image),
                        tag: league.name,
                      },
                      {
                        icon: getIcon(team1.image),
                        text: team1.result.gameWins.toString(),
                      },
                      {
                        text: " : ",
                      },
                      {
                        icon: getIcon(team2.image),
                        text: team2.result.gameWins.toString(),
                      },
                    ]
                  : []
              }
              detail={
                <ItemDetail
                  vid={""}
                  blockName={event.blockName}
                  match={event.match}
                  state={event.state}
                  startTime={event.startTime}
                />
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
