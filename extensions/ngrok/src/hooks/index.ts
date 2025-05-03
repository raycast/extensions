import { usePromise } from "@raycast/utils";

import {
  LocalTunnel,
  Tunnel,
  TunnelSession,
  fetchLocalTunnels,
  fetchReservedDomains,
  fetchTunnelSessions,
  fetchTunnels,
} from "../api";

export type TunelSessionData = TunnelSession & {
  tunnels: (Tunnel & { local: LocalTunnel | null })[];
};

export function useTunnelSessions() {
  const { isLoading, data, revalidate } = usePromise(async () => {
    const [tunnelSessions, tunnels, localTunnels] = await Promise.all([
      fetchTunnelSessions(),
      fetchTunnels(),
      fetchLocalTunnels(),
    ]);

    const result: TunelSessionData[] = tunnelSessions.map((tunnelSession) => {
      const foundTunnels: TunelSessionData["tunnels"] = tunnels
        .filter((tunnel) => tunnel.tunnel_session.id === tunnelSession.id)
        .map((tunnel) => {
          const foundLocalTunnel = localTunnels.find(
            (localTunnel) => localTunnel.public_url === tunnel.public_url || localTunnel.ID === tunnel.id,
          );

          return {
            ...tunnel,
            local: foundLocalTunnel || null,
          };
        });

      return {
        ...tunnelSession,
        tunnels: foundTunnels,
      };
    });

    return result;
  });

  return {
    isLoading,
    data,
    revalidate,
  };
}

export function useReservedDomains() {
  return usePromise(fetchReservedDomains);
}
