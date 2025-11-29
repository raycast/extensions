import { useEffect, useState } from "react";
import { Project } from "../../bamboo/api";
import { Preferences } from "../../preferences";
import { createClient } from "../../helpers";

type ProjectsState = {
  projects: Project[];
  isLoading: boolean;
};

export function useProjects(preferences: Preferences): ProjectsState {
  const [state, setState] = useState<ProjectsState>({
    projects: [],
    isLoading: true,
  });

  useEffect(() => {
    let isCancelled = false;

    async function loadProjects() {
      setState((prev) => ({ ...prev, isLoading: true }));
      try {
        const client = createClient(preferences);
        const projects = await client.listProjects();
        if (!isCancelled) {
          setState({ projects, isLoading: false });
        }
      } catch (error) {
        console.warn("Failed to load projects", error);
        if (!isCancelled) {
          setState({ projects: [], isLoading: false });
        }
      }
    }

    void loadProjects();

    return () => {
      isCancelled = true;
    };
  }, [preferences.apiKey, preferences.companyDomain, preferences.employeeId]);

  return state;
}
