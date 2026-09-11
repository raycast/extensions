import { Cache } from "@raycast/api";
import useSWR from "swr";
import { Server, Tail } from "../api/Server";
import { IServer } from "../types";
import { USE_FAKE_DATA } from "../config";
import { MockServer } from "../api/Mock";

const cache = new Cache();
const KEY = "servers-list";

type Stored = { tail: Tail; servers: IServer[] };

const stored = (): Stored | undefined => {
  try {
    const raw = cache.get(KEY);
    return raw ? (JSON.parse(raw) as Stored) : undefined;
  } catch {
    return undefined;
  }
};

export const loadServers = async () => {
  const held = stored();
  if (held?.tail) {
    const caught = await Server.catchUp(held.servers, held.tail).catch(() => null);
    if (caught) {
      cache.set(KEY, JSON.stringify(caught));
      return caught.servers;
    }
  }
  const fresh = await Server.walk();
  cache.set(KEY, JSON.stringify(fresh));
  return fresh.servers;
};

export const forgetServers = () => cache.remove(KEY);

export const useServers = () => {
  const { data, error, mutate } = useSWR<IServer[]>("servers-list", USE_FAKE_DATA ? MockServer.getAll : loadServers);
  return {
    servers: data,
    loading: !error && !data,
    error: error,
    refresh: async () => {
      forgetServers();
      await mutate();
    },
  };
};
