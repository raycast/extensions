import getStandings from "../utils/getStandings";
import { useState, useEffect } from "react";
import { Team, Conferences } from "../standings.types";

const useStandings = () => {
  const [standings, setStandings] = useState<Conferences>({ eastern: [], western: [] });

  useEffect(() => {
    const getTeamStandings = async () => {
      const data = await getStandings({ year: new Date().getUTCFullYear().toString(), group: "conference" });

      const eastern: Array<Team> = data.children[0].standings.entries
        .map((data: any) => {
          return {
            id: data.team.id,
            name: data.team.displayName,
            logo: data.team.logos[0].href,
            link: data.team.links[0].href,
            rank: data.stats[0].value,
            wins: data.stats[1].value,
            losses: data.stats[2].value,
          };
        })
        .sort((a: Team, b: Team) => {
          return a.rank - b.rank;
        });

      const western: Array<Team> = data.children[1].standings.entries
        .map((data: any) => {
          return {
            id: data.team.id,
            name: data.team.displayName,
            logo: data.team.logos[0].href,
            link: data.team.links[0].href,
            rank: data.stats[0].value,
            wins: data.stats[1].value,
            losses: data.stats[2].value,
          };
        })
        .sort((a: Team, b: Team) => {
          return a.rank - b.rank;
        });

      setStandings({ eastern, western });
    };

    getTeamStandings();
  }, []);

  return standings;
};

export default useStandings;
