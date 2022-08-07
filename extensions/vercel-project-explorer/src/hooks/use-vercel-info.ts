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
  const [selectedTeam, setSelectedTeam] = useSharedState<Team>("selectedTeam");

  /*
   * Populate user, projects, and teams
   */
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !teams) {
        const [fetchedUser, fetchedTeams] = await Promise.all([fetchUser(), fetchTeams()]);

        // // add avatar to fetched teams
        // const fetchedTeamsWithAvatar = await Promise.all(fetchedTeams.map(async (team) => {
        //   const id = team.id;
        //   let avatarURL
        //   if (id) {
        //     // avatarURL = await getAvatarImageURL(id, true);
        //   } else {
        //   }

        //   return { ...team, avatar: avatarURL || "" };
        // }));

        setUser(fetchedUser);
        setTeams(fetchedTeams);

        const selectedTeamId = await LocalStorage.getItem("selectedTeam");
        if (selectedTeamId) {
          const selectedTeam = fetchedTeams.find((team) => team.id === selectedTeamId);
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

  const updateSelectedTeam = async (teamIdOrUsername: string) => {
    const teamIfExists = teams?.find((team) => team.id === teamIdOrUsername);
    if (teamIfExists) {
      setSelectedTeam(teamIfExists);
      await LocalStorage.setItem("selectedTeam", teamIfExists.id);
    } else {
      setSelectedTeam(undefined);
      await LocalStorage.removeItem("selectedTeam");
    }
  };

  return {
    user,
    selectedTeam,
    teams,
    updateSelectedTeam,
  };
};

export default useVercel;
