import { useEffect, useRef, useState } from "react";
import fetch, { AbortError } from "node-fetch";
import { popToRoot, showToast, Toast } from "@raycast/api";
import { DriverStanding } from "../types";

type State = {
  driverStandings: DriverStanding[];
  isLoading: boolean;
};
const useDriverStandings = (season: string | null): [DriverStanding[], boolean] => {
  const [state, setState] = useState<State>({
    driverStandings: [],
    isLoading: true,
  });
  const cancelRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!season) {
      return;
    }
    async function fetchDrivers() {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setState((previous) => ({ ...previous, isLoading: true }));
      try {
        const res = await fetch(`https://api.jolpi.ca/ergast/f1/${season}/driverStandings.json`, {
          method: "get",
          signal: cancelRef.current.signal,
        });
        const data = (await res.json()) as any;
        setState((previous) => ({
          ...previous,
          isLoading: false,
          driverStandings: data.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? [],
        }));
      } catch (error) {
        if (error instanceof AbortError) {
          return;
        }
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Could not load driver standings",
        });
        await popToRoot();
        setState((previous) => ({ ...previous, isLoading: false }));
      }
    }
    fetchDrivers();
    return function cleanup() {
      cancelRef.current?.abort();
    };
  }, [cancelRef, season]);

  useEffect(() => {
    return () => {
      cancelRef?.current?.abort();
    };
  }, []);

  return [state.driverStandings, state.isLoading];
};

export default useDriverStandings;
