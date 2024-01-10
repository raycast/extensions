import { useEffect, useState } from "react";
import { Project } from "../gitlab/project";
import { AsyncState } from "@raycast/utils";

export function useMyProjects(projectsSupplier: () => Promise<Project[]>): AsyncState<Project[]> {
  const [myProjects, setMyProjects] = useState<Project[]>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    projectsSupplier()
      .then(setMyProjects)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return {
      isLoading: true,
    };
  }

  if (error !== undefined) {
    return {
      isLoading: false,
      error,
    };
  }

  return {
    isLoading: false,
    data: myProjects!,
  };
}
