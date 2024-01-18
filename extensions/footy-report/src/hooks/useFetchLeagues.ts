import { HookResponse, League } from "@src/types";
import useSportMonksClient from "./useSportMonksClient";

type SportMonksSeason = {
  id: string;
  name: string;
  is_current: boolean;
};

type SportMonksLeagueRespsonse = {
  id: string;
  name: string;
  image_path: string;
  seasons: SportMonksSeason[];
  sub_type: string;
};

const useFetchLeagues = (name: string) => {
  const { data, isLoading, revalidate } = useSportMonksClient({
    method: "get",
    path: `/leagues/search/${name}?include=seasons`,
    execute: name.length > 0,
  });
  const hookResponse: HookResponse<League, typeof revalidate> = {
    data: [],
    isLoading,
    error: null,
    revalidate,
  };

  if (data?.status === 401) {
    return { ...hookResponse, error: "Invalid API Token" };
  }

  const response: SportMonksLeagueRespsonse[] = data?.data;
  const finalData =
    response
      ?.filter((league) => league.sub_type === "domestic")
      ?.map(({ seasons, ...league }) => ({
        id: league.id,
        name: league.name,
        image_path: league.image_path,
        season: seasons.find((season) => season.is_current),
      })) ?? [];

  return { ...hookResponse, data: finalData };
};

export default useFetchLeagues;
