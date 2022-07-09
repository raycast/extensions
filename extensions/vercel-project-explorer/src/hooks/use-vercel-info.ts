import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";
import { Project, Team, User } from "../types";
import useInterval from "../utils/use-interval";
import { fetchUser, fetchTeams, fetchProjects, updateProject } from "../vercel";
import useSharedState from "./use-shared-state";

const useVercel = () => {
  /* Establishing state:
   * user -- used for filtering deployments by user and displaying account information
   * selectedTeam - used for filtering deployments by team
   * teams -- used for filtering projects
   * projects -- used for listing projects. The projects are filtered by the user and selectedTeam
   */
  const [user, setUser] = useSharedState<User>("user");
  const [teams, setTeams] = useSharedState<Team[]>("teams");
  const [selectedTeam, setSelectedTeam] = useSharedState<Team>("selectedTeam");
  const [projects, setProjects] = useSharedState<Project[]>("projects");

  const fetchAndUpdateProjects = async (user: User, selectedTeam?: Team) => {
    setProjects(await fetchProjects(user.username, selectedTeam ? [selectedTeam] : undefined));
  };

  const onTeamChange = (teamIdOrUsername: string) => {
    const teamIfExists = teams?.find((team) => team.id === teamIdOrUsername);
    if (teamIfExists) {
      setSelectedTeam(teamIfExists);
    } else {
      setSelectedTeam(undefined);
    }
  };

  /*
   * Update the projects when a project is updated. Can be made more efficient.
   */
  const updateLocalProject = async (projectId: string, project: Partial<Project>, teamId?: string) => {
    const updated = await updateProject(projectId, project, teamId);

    if (updated && projects?.length) {
      setProjects((projects) => {
        const updatedProjects = projects?.map((project) => {
          if (project.id === updated.id) {
            return updated;
          }
          return project;
        });
        return updatedProjects;
      });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update project",
      });
    }
  };

  /*
   * We refresh the projects every minute
   */
  useInterval(async () => {
    if (user) {
      fetchAndUpdateProjects(user, selectedTeam);
    }
  }, 1000 * 60);

  // Update projects on team change
  useEffect(() => {
    if (user) {
      fetchAndUpdateProjects(user, selectedTeam);
    }
  }, [selectedTeam]);

  /*
   * Populate user, projects, and teams
   */
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !teams) {
        const [fetchedUser, fetchedTeams] = await Promise.all([fetchUser(), fetchTeams()]);
        const fetchedProjects = await fetchProjects(fetchedUser.username, selectedTeam ? [selectedTeam] : undefined);
        setUser(fetchedUser);
        setProjects(fetchedProjects);
        setTeams(fetchedTeams);
      }
    };
    fetchData();
  }, []);

  /*
   * We store the selectedTeam ID in localStorage for persistence
   */
  useEffect(() => {
    async function getStoredId() {
      const storedTeamId = await LocalStorage.getItem("team");
      if (storedTeamId) {
        const team = teams?.find((team) => team.id === storedTeamId);
        if (team) {
          setSelectedTeam(team);
        } else {
          // If the stored team is no longer found, clear the localStorage
          await LocalStorage.setItem("team", "");
        }
      }
    }

    getStoredId();
  }, [teams, selectedTeam]);

  return {
    user,
    selectedTeam,
    teams,
    projects,
    setSelectedTeam,
    onTeamChange,
    updateProject: updateLocalProject,
  };
};

export default useVercel;
