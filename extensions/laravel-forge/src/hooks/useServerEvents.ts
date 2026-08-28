import useSWR from "swr";
import { IEvent, IServer } from "../types";
import { Server } from "../api/Server";
import { unwrapToken } from "../lib/auth";

type key = [string, IServer["id"], IServer["api_token_key"], IServer["org_slug"]];

export const useServerEvents = (server: IServer) => {
  const fetcher = async ([, , tokenKey]: key) => await Server.getEvents({ server, token: unwrapToken(tokenKey) });
  const { data, error } = useSWR<IEvent[]>(
    server?.id ? ["server-events", server.id, server.api_token_key, server.org_slug] : null,
    fetcher,
    { refreshInterval: 10_000 },
  );

  return {
    events: data,
    loading: !error && !data,
    error: error,
  };
};
