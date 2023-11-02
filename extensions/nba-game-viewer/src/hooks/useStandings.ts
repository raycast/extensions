import getStandings from "../utils/getStandings";
import { useCallback } from "react";
import { Conference, ConferenceStanding, Team } from "../types/standings.types";
import { useCachedPromise } from "@raycast/utils";

const getConferenceStandings = (conferenceStanding: ConferenceStanding): Team[] =>
  conferenceStanding.standings.entries
    .map((data) => ({
      id: data.team.id,
      name: data.team.displayName,
      logo: data.team.logos[0].href,
      link: data.team.links[0].href,
      seed: data.stats?.find((stat) => stat.name === "playoffSeed")?.value,
      wins: data.stats?.find((stat) => stat.name === "wins")?.value,
      losses: data.stats?.find((stat) => stat.name === "losses")?.value,
      streak: data.stats?.find((stat) => stat.name === "streak")?.displayValue,
    }))
    .sort((a: Team, b: Team) => {
      return (a?.seed || 0) - (b?.seed || 0);
    });

const useStandings = () => {
  const fetchTeamStandings = useCallback(async () => {
    const date = new Date();
    const seasonOpeningMonth = 10;
    const data = await getStandings({
      year: (date.getUTCMonth() >= seasonOpeningMonth ? date.getUTCFullYear() + 1 : date.getUTCFullYear()).toString(),
      group: "conference",
    });

    const easternConference = data?.children?.find(
      (conference) => conference?.name === `${Conference.Eastern} Conference`
    );
    const westernConference = data?.children?.find(
      (conference) => conference?.name === `${Conference.Western} Conference`
    );

    if (!easternConference || !westernConference) throw new Error("Could not find conference standings");

    const easternStandings = getConferenceStandings(easternConference);
    const westernStandings = getConferenceStandings(westernConference);

    return { easternStandings, westernStandings };
  }, []);

  return useCachedPromise(fetchTeamStandings);
};

export default useStandings;
