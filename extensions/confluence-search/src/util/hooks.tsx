import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import { useEffect, useState } from "react";
import { authorizeSite, SiteMissingScopesError } from "../api/auth";
import { getGqlClient } from "../api/graphql";
import { Site } from "../api/site";

export function useAuthorizeSite(checkScopes?: boolean) {
  const [site, setSite] = useState<Site>();

  useEffect(() => {
    (async () => {
      try {
        setSite(await authorizeSite(checkScopes));
      } catch (e) {
        // Intentionally swallow this exception
        if (!(e instanceof SiteMissingScopesError)) {
          throw e;
        }
      }
    })();
  }, []);

  return site;
}

export function useGraphqlClient() {
  const [client, setClient] = useState<ApolloClient<NormalizedCacheObject>>();

  useEffect(() => {
    (async () => {
      setClient(await getGqlClient());
    })();
  }, []);

  return client;
}
