import { useEffect, useRef, useState } from "react";
import fetch, { AbortError } from "node-fetch";
import { showToast, Toast, useNavigation } from "@raycast/api";
import { RaceResult } from "../types";

type State = {
  isLoading: boolean;
  result: RaceResult | null;
};
const useRaceResult = (season: string | null, round: string | null): [RaceResult | null, boolean] => {
  const [state, setState] = useState<State>({
    isLoading: true,
    result: null,
  });

  const { pop } = useNavigation();

  const cancelRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!season || !round) {
      return;
    }
    async function fetchResults() {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setState((previous) => ({ ...previous, isLoading: true }));
      try {
        const res = await fetch(`https://api.jolpi.ca/ergast/f1/${season}/${round}/results.json`, {
          method: "get",
          signal: cancelRef.current.signal,
        });
        const data = (await res.json()) as any;
        setState({ isLoading: false, result: data.MRData.RaceTable.Races[0] });
      } catch (error) {
        if (error instanceof AbortError) {
          return;
        }
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Could not load race results",
        });
        pop();
      }
    }
    fetchResults();
  }, [cancelRef, season, round, pop]);

  useEffect(() => {
    return () => {
      cancelRef?.current?.abort();
    };
  }, []);

  return [state.result, state.isLoading];
};

export default useRaceResult;
