import useSWR from "swr";
import { IEvent, IServer } from "../types";
import { Server } from "../api/Server";
import { unwrapToken } from "../lib/auth";

type key = [string, IServer["id"], IEvent["id"], IServer["api_token_key"]];

export const useEventOutput = ({ server, event }: { server: IServer; event: IEvent }) => {
  const fetcher = async ([, , eventId, tokenKey]: key) =>
    await Server.getEventOutput({ server, eventId, token: unwrapToken(tokenKey) });
  const { data, error } = useSWR<string>(
    server?.id ? ["event-output", server.id, event.id, server.api_token_key] : null,
    fetcher,
  );

  return {
    output: data,
    loading: !error && data === undefined,
    error: error,
  };
};
