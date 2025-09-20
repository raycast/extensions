import { useEffect } from "react";
import { LocalStorage } from "@raycast/api";
import { Team, User } from "../types";
import { fetchUser, fetchTeams } from "../vercel";
import useSharedState from "./use-shared-state";

const useVercel = () => {
  /* Establishing state:
   * user -- used for filtering deployments by user and displaying account information
   * selectedTeam - used for filtering deployments by team
   * teams -- used for filtering projects
   */
  const [user, setUser] = useSharedState<User>("user");
  const [teams, setTeams] = useSharedState<Team[]>("teams");
  const [selectedTeamId, setSelectedTeamId] = useSharedState<string>("selectedTeamId");

  /*
   * Populate user, projects, and teams
   */
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !teams) {
        const selectedTeamId = await LocalStorage.getItem<string>("selectedTeamId");
        if (selectedTeamId) {
          setSelectedTeamId(selectedTeamId);
        }
        const [fetchedUser, fetchedTeams] = await Promise.all([fetchUser(), fetchTeams()]);

        setUser(fetchedUser);
        setTeams(fetchedTeams);

        if (selectedTeamId) {
          const selectedTeam = fetchedTeams.find((team) => team.id === selectedTeamId);
          if (!selectedTeam) {
            setSelectedTeamId(undefined);
          }
        }
      }
    };
    fetchData();
  }, []);

  const updateSelectedTeam = async (teamIdOrUsername: string) => {
    const teamIfExists = teams?.find((team: Team) => team.id === teamIdOrUsername);
    if (teamIfExists) {
      setSelectedTeamId(teamIfExists.id);
      await LocalStorage.setItem("selectedTeamId", teamIfExists.id);
    } else {
      setSelectedTeamId(undefined);
      await LocalStorage.removeItem("selectedTeamId");
    }
  };

  return {
    user,
    selectedTeam: selectedTeamId,
    teams,
    updateSelectedTeam,
  };
};

export default useVercel;
