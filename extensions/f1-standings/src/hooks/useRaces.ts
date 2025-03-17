import { useEffect, useRef, useState } from "react";
import fetch, { AbortError } from "node-fetch";
import { popToRoot, showToast, Toast } from "@raycast/api";
import { Race, ScheduleResponse } from "../types";
import { BASE_API_URL } from "../constants";

const isUpcoming = (race: Race) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(race.date) >= today;
};

type State = {
  isLoading: boolean;
  pastRaces: { [round: string]: Race };
  upcomingRaces: { [round: string]: Race };
};
const useRaces = (season: string | null): [{ [round: string]: Race }, { [round: string]: Race }, boolean] => {
  const [state, setState] = useState<State>({ pastRaces: {}, upcomingRaces: {}, isLoading: true });

  const cancelRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!season) {
      return;
    }
    async function fetchSchedule() {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setState((previous) => ({
        ...previous,
        isLoading: true,
        isShowingDetail: false,
      }));
      try {
        const res = await fetch(`${BASE_API_URL}/f1/${season}.json`, {
          method: "get",
          signal: cancelRef.current.signal,
        });
        const data = (await res.json()) as ScheduleResponse;
        const upcomingRaces: { [round: string]: Race } = {};
        const pastRaces: { [round: string]: Race } = {};

        (data.MRData.RaceTable.Races || []).forEach((race: Race) => {
          if (isUpcoming(race)) {
            upcomingRaces[race.round] = race;
          } else {
            pastRaces[race.round] = race;
          }
        });

        setState((previous) => ({
          ...previous,
          upcomingRaces,
          pastRaces,
          isLoading: false,
        }));
      } catch (error) {
        if (error instanceof AbortError) {
          return;
        }
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: `Could not load ${season} race schedule. Please try later again.`,
        });
        await popToRoot({ clearSearchBar: true });
        setState((previous) => ({
          ...previous,
          isLoading: false,
        }));
      }
    }
    fetchSchedule();
  }, [cancelRef, season]);

  useEffect(() => {
    return () => {
      cancelRef?.current?.abort();
    };
  }, []);

  return [state.pastRaces, state.upcomingRaces, state.isLoading];
};

export default useRaces;
