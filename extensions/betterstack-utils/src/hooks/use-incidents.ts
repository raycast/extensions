import { useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acknowledgeIncident,
  buildIncidentWebUrl,
  listIncidents,
  resolveIncident,
} from "@/api/betterstack-incidents-api";
import { Incident } from "@/domain/incident";
import { Optional } from "@/common/utils/optional-utils";
import { toList } from "@/common/utils/collection-utils";

const INCIDENTS_QUERY_KEY = ["incidents"];

interface ActionTitles {
  progress: string;
  success: string;
  failure: string;
}

export function useIncidents({ activeOnly, teamId }: { activeOnly: boolean; teamId: Optional<string> }) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [...INCIDENTS_QUERY_KEY, { activeOnly }],
    queryFn: () => listIncidents({ activeOnly }),
  });

  useEffect(() => {
    if (isError) {
      const message = error instanceof Error ? error.message : String(error);
      void showToast({ style: Toast.Style.Failure, title: "Failed to load incidents", message });
    }
  }, [isError, error]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: INCIDENTS_QUERY_KEY });

  const runAction = async (action: () => Promise<void>, titles: ActionTitles) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: titles.progress });
    try {
      await action();
      await invalidate();
      toast.style = Toast.Style.Success;
      toast.title = titles.success;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = titles.failure;
      toast.message = error instanceof Error ? error.message : String(error);
    }
  };

  return {
    incidents: toList(data).map((incident) => ({ ...incident, webUrl: buildIncidentWebUrl(incident.id, teamId) })),
    isLoading,
    acknowledge: (incident: Incident) =>
      void runAction(() => acknowledgeIncident(incident.id), {
        progress: "Acknowledging incident...",
        success: "Incident acknowledged",
        failure: "Failed to acknowledge incident",
      }),
    resolve: (incident: Incident) =>
      void runAction(() => resolveIncident(incident.id), {
        progress: "Resolving incident...",
        success: "Incident resolved",
        failure: "Failed to resolve incident",
      }),
    refresh: () => void invalidate(),
  };
}
