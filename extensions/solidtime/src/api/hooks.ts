import { QueryCache, QueryClient, useQuery } from "@tanstack/react-query";
import { api } from "./index.js";
import { useMembership } from "../utils/membership.js";
import { showFailureToast } from "@raycast/utils";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 1_000,
    },
  },
  queryCache: new QueryCache({
    onError(error) {
      showFailureToast(error);
    },
  }),
});

export function useMemberships() {
  return useQuery({
    queryKey: ["membership"],
    queryFn: async () => {
      const response = await api.getMyMemberships();
      return response.data;
    },
  });
}

export function useProjects(orgId: string | null) {
  return useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const response = await api.getProjects({ params: { organization: orgId }, queries: { archived: "all" } });
      return response.data;
    },
  });
}

export function useClients(orgId: string | null) {
  return useQuery({
    queryKey: ["clients", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const response = await api.getClients({ params: { organization: orgId }, queries: { archived: "all" } });
      return response.data;
    },
  });
}

export function useTimeEntries(orgId?: string) {
  const ctx = useMembership();
  const memberId = ctx.membership?.id;
  return useQuery({
    queryKey: ["timeEntries", orgId, memberId],
    queryFn: async () => {
      if (!orgId || !memberId) return null;
      const response = await api.getTimeEntries({
        params: { organization: orgId },
        queries: { member_id: memberId },
      });
      return response.data;
    },
  });
}

export function invalidate(type: "timeEntries") {
  queryClient.invalidateQueries({ queryKey: [type] });
}
