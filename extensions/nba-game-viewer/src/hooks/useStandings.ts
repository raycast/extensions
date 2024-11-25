import { useCachedPromise } from "@raycast/utils";
import getStandings from "../utils/getStandings";
import type { Team, ConferenceStanding } from "../types/standings.types";

const sortStandings = (a: Team, b: Team) => {
  return a?.wins !== b?.wins ? (b?.wins || 0) - (a?.wins || 0) : (a?.losses || 0) - (b?.losses || 0);
};

const getConferenceStandings = (conferenceStanding: ConferenceStanding): Team[] =>
  conferenceStanding?.standings?.entries
    ?.map((data) => ({
      id: data.team.id,
      name: data.team.displayName,
      logo: data.team.logos[0].href,
      link: data.team.links[0].href,
      seed: data.stats?.find((stat) => stat.name === "playoffSeed")?.value,
      wins: data.stats?.find((stat) => stat.name === "wins")?.value,
      losses: data.stats?.find((stat) => stat.name === "losses")?.value,
      streak: data.stats?.find((stat) => stat.name === "streak")?.displayValue,
    }))
    .sort(sortStandings) || [];

const fetchStandings = async (league: string) => {
  const standingsData = await getStandings({
    league: league,
    group: "conference",
  });

  const easternConference = standingsData?.children?.find((conference) => conference?.name === "Eastern Conference");
  const westernConference = standingsData?.children?.find((conference) => conference?.name === "Western Conference");

  if (!easternConference || !westernConference) throw new Error("Could not find conference standings");

  const easternStandings = getConferenceStandings(easternConference);
  const westernStandings = getConferenceStandings(westernConference);
  const leagueStandings = getConferenceStandings({
    name: "League",
    abbreviation: "L",
    standings: {
      name: "League Standings",
      entries: [...easternConference.standings.entries, ...westernConference.standings.entries],
    },
  }).sort(sortStandings);

  return { easternStandings, westernStandings, leagueStandings };
};

const useStandings = (league: string) =>
  useCachedPromise(fetchStandings, [league], { failureToastOptions: { title: "Could not fetch standings" } });

export default useStandings;
