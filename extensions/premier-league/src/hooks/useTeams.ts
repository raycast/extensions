import { useEffect, useState } from "react";
import { getTeams } from "../api";

interface Club {
  title: string;
  value: string;
}

const useTeams = (season: string) => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (season) {
      setLoading(true);
      getTeams(season).then((data) => {
        const teams: Club[] = data.map((team) => ({
          title: team.name,
          value: team.id.toString(),
        }));

        teams.unshift({
          title: "All Clubs",
          value: "-1",
        });

        setClubs(teams);
        setLoading(false);
      });
    }
  }, [season]);

  return { clubs, loading };
};

export default useTeams;
