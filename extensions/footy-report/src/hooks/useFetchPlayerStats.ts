import useSportMonksClient from "./useSportMonksClient";

enum EventType {
  GOALS = 52,
  ASSISTS = 79,
  APPS = 321,
  RED_CARDS = 83,
  YELLOW_CARDS = 84,
}

type SportMonksPlayerStatsDetail = {
  season: {
    name: string;
    pending: boolean;
    is_current: boolean;
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
    path: `/players/${id}?include=statistics.season;statistics.details&filters=playerStatisticDetailTypes:${formatEvents()};team=${teamId}`,
  });

  const response: SportMonksPlayerStatsDetail[] = data?.data?.statistics;

  const stats = response?.map(
    ({ season, details }: SportMonksPlayerStatsDetail) => {
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
    },
  );

  return { data: stats, isLoading, revalidate };
};

export default useFetchPlayerStats;
