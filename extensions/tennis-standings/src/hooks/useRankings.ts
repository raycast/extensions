import { useFetch } from "@raycast/utils";
import { API_BASE_URL } from "../env";
import { PlayerDetails } from "../types";

const useRankings = (rankingType: "atp" | "wta"): [PlayerDetails[], boolean] => {
  const { isLoading, data } = useFetch<{ rankings: PlayerDetails[] }>(`${API_BASE_URL}/rankings/${rankingType}`, {
    headers: {
      "X-RapidApi-Key": "9b1eafa380msh78f3eb6c3b5af5dp19b2b0jsn57a09eea5171",
      "X-RapidAPI-Host": "tennisapi1.p.rapidapi.com",
    },
  });

  return [data?.rankings ?? [], isLoading];
};

export default useRankings;
