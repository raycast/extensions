import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import { useState } from "react";
import useAsyncEffect from "use-async-effect";
import { authorizeSite, SiteMissingScopesError } from "../api/auth";
import { getGqlClient } from "../api/graphql";
import { Site } from "../api/site";

export function useAuthorizeSite(checkScopes?: boolean) {
  const [site, setSite] = useState<Site>();

  useAsyncEffect(async () => {
    try {
      setSite(await authorizeSite(checkScopes));
    } catch (e) {
      // Intentionally swallow this exception
      if (!(e instanceof SiteMissingScopesError)) {
        throw e;
      }
    }
  }, []);

  return site;
}

export function useGraphqlClient() {
  const [client, setClient] = useState<ApolloClient<NormalizedCacheObject>>();

  useAsyncEffect(async () => {
    setClient(await getGqlClient());
  }, []);

  return client;
}
