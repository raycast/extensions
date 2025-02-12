import { useEffect, useRef, useState } from "react";
import fetch, { AbortError } from "node-fetch";
import { popToRoot, showToast, Toast } from "@raycast/api";
import { ConstructorStanding } from "../types";

type State = {
  constructorStandings: ConstructorStanding[];
  isLoading: boolean;
};
const useConstructorStandings = (season: string | null): [ConstructorStanding[], boolean] => {
  const [state, setState] = useState<State>({
    constructorStandings: [],
    isLoading: true,
  });
  const cancelRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!season) {
      return;
    }
    async function fetchConstructors() {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setState((previous) => ({
        ...previous,
        isLoading: true,
      }));
      try {
        const res = await fetch(`https://api.jolpi.ca/ergast/f1/${season}/constructorStandings.json`, {
          method: "get",
          signal: cancelRef.current.signal,
        });
        const data = (await res.json()) as any;
        setState((previous) => ({
          ...previous,
          constructorStandings: data.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? [],
          isLoading: false,
        }));
      } catch (error) {
        if (error instanceof AbortError) {
          return;
        }
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Could not load constructor standings",
        });
        await popToRoot();
        setState((previous) => ({ ...previous, isLoading: false }));
      }
    }
    fetchConstructors();
  }, [cancelRef, season]);

  useEffect(() => {
    return () => {
      cancelRef?.current?.abort();
    };
  }, []);

  return [state.constructorStandings, state.isLoading];
};

export default useConstructorStandings;
