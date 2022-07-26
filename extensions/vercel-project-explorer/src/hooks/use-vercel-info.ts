import { useEffect, useState, } from "react";
import { LocalStorage } from "@raycast/api";
import { Team, User } from "../types";
import { fetchUser, fetchTeams, } from "../vercel";

const useVercel = () => {
  /* Establishing state:
   * user -- used for filtering deployments by user and displaying account information
   * selectedTeam - used for filtering deployments by team
   * teams -- used for filtering projects
   * projects -- used for listing projects. The projects are filtered by the user and selectedTeam
   */
  const [user, setUser] = useState<User>();
  const [teams, setTeams] = useState<Team[]>();
  const [selectedTeam, setSelectedTeam] = useState<Team>();

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
          }
        }
      }
    };
    fetchData();
  }, []);

  // update selectedTeam on load
  useEffect(() => {
    async function updateSelectedTeam() {
      if (user && teams) {
        const selectedTeamId = await LocalStorage.getItem("selectedTeam");
        if (selectedTeamId) {
          const selectedTeam = teams.find((team) => team.id === selectedTeamId);
          if (selectedTeam) {
            setSelectedTeam(selectedTeam);
          }
        }
      }
    }

    updateSelectedTeam();
  }, []);

  const updateSelectedTeam =
    async (teamIdOrUsername: string) => {
      const teamIfExists = teams?.find((team) => team.id === teamIdOrUsername);
      if (teamIfExists) {
        setSelectedTeam(teamIfExists);
        await LocalStorage.setItem("selectedTeam", teamIfExists.id);
      } else {
        setSelectedTeam(undefined);
        await LocalStorage.removeItem("selectedTeam");
      }
    }

  return {
    user,
    selectedTeam,
    teams,
    updateSelectedTeam,
  };
};

export default useVercel;
