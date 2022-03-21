import { useEffect, useRef, useState } from "react";
import fetch from "node-fetch";
import { popToRoot, showToast, Toast, useNavigation } from "@raycast/api";
import { Race, RaceResult } from "../types";

const isUpcoming = (race: Race) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(race.date) >= today;
};

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
        const res = await fetch(`https://ergast.com/api/f1/${season}/${round}/results.json`, {
          method: "get",
          signal: cancelRef.current.signal,
        });
        const data = (await res.json()) as any;
        setState({ isLoading: false, result: data.MRData.RaceTable.Races[0] });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Could not load race results",
        });
        pop();
      }
    }

    fetchResults();
  }, [cancelRef, season, round]);

  useEffect(() => {
    return () => {
      cancelRef?.current?.abort();
    };
  }, []);

  return [state.result, state.isLoading];
};

export default useRaceResult;
