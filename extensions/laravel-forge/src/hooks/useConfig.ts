import useSWR from "swr";
import { ConfigFile, IServer, ISite } from "../types";
import { Site } from "../api/Site";
import { unwrapToken } from "../lib/auth";

type key = [IServer["id"], ISite["id"], ConfigFile, IServer["api_token_key"], IServer["org_slug"]];

const fetcher = async ([serverId, siteId, type, tokenKey, orgSlug]: key) =>
  await Site.getConfig({ orgSlug, type, siteId, serverId, token: unwrapToken(tokenKey) });

type IncomingProps = { server?: IServer; site?: ISite; type: ConfigFile };
export const useConfig = ({ server, site, type }: IncomingProps) => {
  const { data, error } = useSWR<string>(
    server?.id ? [server.id, site?.id, type, server.api_token_key, server.org_slug] : null,
    fetcher,
    { refreshInterval: 5_000 },
  );
  return {
    fileString: data,
    // An empty file is a valid answer, so only an absent one counts as loading
    loading: !error && data === undefined,
    error: error,
  };
};
