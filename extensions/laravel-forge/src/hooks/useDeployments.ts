import useSWR from "swr";
import { IDeployment, IServer, ISite } from "../types";
import { Site } from "../api/Site";
import { unwrapToken } from "../lib/auth";

type key = [IServer["id"], ISite["id"], IServer["api_token_key"]];

const fetcher = async ([serverId, siteId, tokenKey]: key) =>
  await Site.getDeploymentHistory({ siteId, serverId, token: unwrapToken(tokenKey) });

type IncomingProps = { server?: IServer; site?: ISite };
export const useDeployments = ({ server, site }: IncomingProps) => {
  const { data, error } = useSWR<IDeployment[]>(
    server?.id ? [server.id, site?.id, server.api_token_key] : null,
    fetcher,
    {
      refreshInterval: 5_000,
    }
  );
  return {
    deployments: data,
    loading: !error && !data,
    error: error,
  };
};
