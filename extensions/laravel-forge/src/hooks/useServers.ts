import useSWR from "swr";
import { Server } from "../api/Server";
import { IServer } from "../types";
import { USE_FAKE_DATA } from "../config";
import { MockServer } from "../api/Mock";

export const useServers = () => {
  const { data, error } = useSWR<IServer[]>("servers-list", USE_FAKE_DATA ? MockServer.getAll : Server.getAll);
  return {
    servers: data,
    loading: !error && !data,
    error: error,
  };
};
