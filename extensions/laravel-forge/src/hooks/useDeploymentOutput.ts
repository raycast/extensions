import useSWR from "swr";
import { IDeployment, IServer, ISite } from "../types";
import { Site } from "../api/Site";
import { unwrapToken } from "../lib/auth";

type key = [IServer["id"], ISite["id"], IDeployment["id"], IServer["api_token_key"], IServer["org_slug"]];

const fetcher = async ([serverId, siteId, deploymentId, tokenKey, orgSlug]: key) =>
  await Site.getDeploymentOutput({ orgSlug, siteId, serverId, deploymentId, token: unwrapToken(tokenKey) });

type IncomingProps = {
  server: IServer;
  site: ISite;
  deployment: IDeployment;
};

export const useDeploymentOutput = ({ server, site, deployment }: IncomingProps) => {
  const { data, error } = useSWR<string>(
    server?.id ? [server.id, site?.id, deployment.id, server.api_token_key, server.org_slug] : null,
    fetcher,
    {
      refreshInterval: 5_000,
    },
  );
  return {
    output: data,
    loading: !error && !data,
    error: error,
  };
};
