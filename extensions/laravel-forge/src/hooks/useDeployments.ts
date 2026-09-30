import useSWR from "swr";
import { IDeployment, IServer, ISite } from "../types";
import { Site } from "../api/Site";
import { unwrapToken } from "../lib/auth";

type key = [IServer["id"], ISite["id"], IServer["api_token_key"], IServer["org_slug"]];

const fetcher = async ([serverId, siteId, tokenKey, orgSlug]: key) =>
  await Site.getDeploymentHistory({ orgSlug, siteId, serverId, token: unwrapToken(tokenKey) });

type IncomingProps = { server?: IServer; site?: ISite };
export const useDeployments = ({ server, site }: IncomingProps) => {
  const { data, error } = useSWR<IDeployment[]>(
    server?.id ? [server.id, site?.id, server.api_token_key, server.org_slug] : null,
    fetcher,
    {
      refreshInterval: 5_000,
    },
  );
  return {
    deployments: data,
    loading: !error && !data,
    error: error,
  };
};
