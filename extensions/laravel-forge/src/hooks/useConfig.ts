import useSWR from "swr";
import { ConfigFile, IServer, ISite } from "../types";
import { Site } from "../api/Site";
import { unwrapToken } from "../lib/auth";

type key = [IServer["id"], ISite["id"], ConfigFile, IServer["api_token_key"]];

const fetcher = async ([serverId, siteId, type, tokenKey]: key) =>
  await Site.getConfig({ type, siteId, serverId, token: unwrapToken(tokenKey) });

type IncomingProps = { server?: IServer; site?: ISite; type: ConfigFile };
export const useConfig = ({ server, site, type }: IncomingProps) => {
  const { data, error } = useSWR<string>(
    server?.id ? [server.id, site?.id, type, server.api_token_key] : null,
    fetcher,
    { refreshInterval: 5_000 }
  );
  return {
    fileString: data,
    loading: !error && !data,
    error: error,
  };
};
