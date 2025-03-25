import { useEffect } from "react";
import { Icon, List, LocalStorage } from "@raycast/api";
import useSharedState from "./use-shared-state";
import { ITeam } from "../types";
import { Team } from "../api/Team";

const useSimpleBackupsTeams = () => {
  const team = {
    id: 0,
    owner_id: 0,
    name: "Name",
    created_at: "",
  } as ITeam;

  const teamsInit = [team] as ITeam[];

  const [teams, setTeams] = useSharedState<ITeam[]>("teams");
  const [selectedTeam, setSelectedTeam] = useSharedState<ITeam>("selectedTeam");

  useEffect(() => {
    const fetchData = async () => {
      if (!teams) {
        const [currentTeam, allTeams] = await Promise.all([Team.current(), Team.all()]);

        setTeams(allTeams);

        const selectedTeamId = currentTeam?.id;
        if (allTeams && selectedTeamId) {
          const selectedTeam = allTeams.find((team) => team.id === selectedTeamId);
          if (selectedTeam) {
            setSelectedTeam(selectedTeam);
          } else {
            setSelectedTeam(undefined);
          }
        }
      }
    };
    fetchData();
  }, []);

  const updateSelectedTeam = async (teamId: number) => {
    const teamIfExists = teams?.find((team) => team.id === teamId);
    if (teamIfExists && selectedTeam?.id !== teamId) {
      await Team.switch(teamId);

      setSelectedTeam(teamIfExists);
      await LocalStorage.setItem("selectedTeam", teamIfExists.id);

      return true;
    } else if (!teamIfExists) {
      throw new Error("Unable to find selected team!");
    }

    return false;
  };

  return {
    selectedTeam,
    teams,
    updateSelectedTeam,
  };
};

export default useSimpleBackupsTeams;
