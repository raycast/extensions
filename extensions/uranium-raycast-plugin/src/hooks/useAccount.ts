import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { SMART_CONTRACTS_USER_LIMIT, SMART_CONTRACTS_ADMIN_LIMIT } from "../utils/constants";

export function useAccountQuery() {
  return useQuery({
    queryKey: ["account", "me"],
    queryFn: () => api.account.getMe({ deviceId: "raycast-extension" }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAccount() {
  const query = useAccountQuery();

  const isAdmin = query.data?.ok?.role === "ADMIN";
  const userId = query.data?.ok?.userId;
  const smartContractsLimit = isAdmin ? SMART_CONTRACTS_ADMIN_LIMIT : SMART_CONTRACTS_USER_LIMIT;

  return {
    ...query,
    isAdmin,
    userId,
    smartContractsLimit,
    user: query.data?.ok,
  };
}
