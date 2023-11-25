import { useEffect, useRef, useState } from "react";
import fetch, { AbortError } from "node-fetch";
import { popToRoot, showToast, Toast } from "@raycast/api";
import { PlayerDetails } from "../types";
import { API_BASE_URL } from "../env";

type State = {
  playerRankingList: PlayerDetails[];
  isLoading: boolean;
};
const useATPRankings = (): [PlayerDetails[], boolean] => {
  const [state, setState] = useState<State>({
    playerRankingList: [],
    isLoading: true,
  });
  const cancelRef = useRef<AbortController | null>(null);
  useEffect(() => {
    async function fetchRankings() {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setState((previous) => ({
        ...previous,
        isLoading: true,
      }));
      try {
        const res = await fetch(`${API_BASE_URL}/rankings/atp`, {
          method: "get",
          headers: {
            "X-RapidApi-Key": "9b1eafa380msh78f3eb6c3b5af5dp19b2b0jsn57a09eea5171",
            "X-RapidAPI-Host": "tennisapi1.p.rapidapi.com",
          },
          signal: cancelRef.current.signal,
        });
        const data = (await res.json()) as any;

        setState((previous) => ({
          ...previous,
          playerRankingList: data.rankings ?? [],
          isLoading: false,
        }));
      } catch (error) {
        if (error instanceof AbortError) {
          return;
        }
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Could not load ATP rankings",
        });
        await popToRoot();
        setState((previous) => ({ ...previous, isLoading: false }));
      }
    }
    fetchRankings();
  }, [cancelRef]);

  useEffect(() => {
    return () => {
      cancelRef?.current?.abort();
    };
  }, []);

  return [state.playerRankingList, state.isLoading];
};

export default useATPRankings;
