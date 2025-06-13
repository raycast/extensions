import { useState, useEffect, useCallback } from "react";
import { Project, loadProjects } from "../utils";

/**
 * Custom hook to manage loading projects
 * This centralizes the loading logic and state management
 */
export function useProjectLoader() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Extract fetchProjects to a memoized function that can be called manually
  const fetchProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const loadedProjects = await loadProjects();
      setProjects(loadedProjects);
    } catch (err) {
      console.error("Error loading projects:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Function to manually trigger a refresh of projects
  const refreshProjects = useCallback(() => {
    setRefreshCounter((prev) => prev + 1);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects, refreshCounter]);

  return { projects, isLoading, error, refreshProjects };
}
