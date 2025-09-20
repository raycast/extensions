import { HookResponse } from "@src/types";
import useSportMonksClient from "@src/hooks/useSportMonksClient";

enum EventType {
  GOALS = 52,
  ASSISTS = 79,
  APPS = 321,
  RED_CARDS = 83,
  YELLOW_CARDS = 84,
}

type SportMonksPlayerStatsDetail = {
  team_id: string;
  season: {
    name: string;
    pending: boolean;
    is_current: boolean;
    league: {
      sub_type:
        | "domestic"
        | "domestic_cup"
        | "international"
        | "cup_international"
        | "play-offs"
        | "friendly";
    };
  };
  details: {
    id: string;
    type_id: number;
    value: {
      total: number;
    };
  }[];
};

const isEvent =
  (event: EventType) =>
  ({ type_id }: { type_id: number }) => {
    return type_id === event;
  };

const formatEvents = () => {
  const values: number[] = [];
  Object.keys(EventType)
    .filter((v) => !isNaN(Number(v)))
    .forEach((value) => {
      values.push(Number(value));
    });
  return values.join(",");
};

const useFetchPlayerStats = ({
  id,
  teamId,
}: {
  id: string;
  teamId: string;
}) => {
  const { data, isLoading, revalidate } = useSportMonksClient({
    method: "get",
    path: `/players/${id}?include=statistics.season.league;statistics.details&filters=playerStatisticDetailTypes:${formatEvents()};team=${teamId}`,
  });

  const hookResponse: HookResponse<(string | number)[], typeof revalidate> = {
    data: [],
    error: null,
    isLoading,
    revalidate,
  };

  if (data?.status === 401) {
    return { ...hookResponse, error: "Invalid API Token" };
  }

  const response: SportMonksPlayerStatsDetail[] = data?.data?.statistics;
  const stats = response
    ?.filter(
      ({ team_id, details, season: { league } }) =>
        team_id === teamId &&
        details.length > 0 &&
        league.sub_type === "domestic",
    )
    ?.map(({ season, details }: SportMonksPlayerStatsDetail) => {
      const { name } = season;
      const goals = details.find(isEvent(EventType.GOALS))?.value.total ?? 0;
      const assists =
        details.find(isEvent(EventType.ASSISTS))?.value.total ?? 0;
      const appearances =
        details.find(isEvent(EventType.APPS))?.value.total ?? 0;
      const yellowCards =
        details.find(isEvent(EventType.YELLOW_CARDS))?.value.total ?? 0;
      const redCards =
        details.find(isEvent(EventType.RED_CARDS))?.value.total ?? 0;
      return [name, goals, assists, appearances, yellowCards, redCards];
    });

  return { ...hookResponse, data: stats };
};

export default useFetchPlayerStats;
