import { useCachedState, useFetch } from "@raycast/utils";
import { Connector, PluggyClient } from "pluggy-sdk";
import { useEffect } from "react";
import { PLUGGY_CONNECT_TOKEN_URL } from "./constants";

export function useConnectToken(): { isLoading: boolean; connectToken?: string } {
  const { isLoading, data } = useFetch<{ accessToken?: string }>(PLUGGY_CONNECT_TOKEN_URL);
  return { isLoading, connectToken: data?.accessToken };
}

export function useConnectors(): Connector[] {
  const { connectToken } = useConnectToken();
  const [connectors, setConnectors] = useCachedState<Connector[]>("connectors", []);

  useEffect(() => {
    if (!connectToken) {
      return;
    }

    const client = new PluggyClient({ clientId: "placeholder", clientSecret: "placeholder" });
    client["apiKey"] = connectToken;
    client.fetchConnectors().then((connectors) => setConnectors(connectors.results));
  }, [connectToken]);

  return connectors;
}
