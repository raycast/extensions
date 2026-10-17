import { Application, getApplications } from "@raycast/api";
import { useEffect, useState } from "react";

export function useApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchApplications() {
      try {
        const installedApplications = await getApplications();
        setApplications(installedApplications);
      } catch (error) {
        console.error("Failed to fetch applications:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchApplications();
  }, []);

  return { applications, loading };
}
