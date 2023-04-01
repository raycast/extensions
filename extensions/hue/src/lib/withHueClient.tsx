import { useMemo, useState } from "react";
import { Detail, LocalStorage } from "@raycast/api";
import HueClient from "./HueClient";
import { BRIDGE_ID, BRIDGE_IP_ADDRESS_KEY, BRIDGE_USERNAME_KEY } from "./constants";

let hueClient: HueClient | null = null;

// TODO: integrate with the state machine
export function withHueClient(component: JSX.Element) {
  const [x, forceRerender] = useState(0);

  useMemo(() => {
    (async function() {
      const bridgeIpAddress = await LocalStorage.getItem<string>(BRIDGE_IP_ADDRESS_KEY);
      const bridgeId = await LocalStorage.getItem<string>(BRIDGE_ID);
      const bridgeUsername = await LocalStorage.getItem<string>(BRIDGE_USERNAME_KEY);

      if (bridgeIpAddress === undefined) throw Error("No bridge IP address");
      if (bridgeId === undefined) throw Error("No bridge ID");
      if (bridgeUsername === undefined) throw Error("No bridge username");

      hueClient = new HueClient(bridgeIpAddress, bridgeId, bridgeUsername);

      forceRerender(x + 1);
    })();
  }, []);

  if (!hueClient) {
    return <Detail isLoading />;
  }

  return component;
}

export function getHueClient(): HueClient {
  if (!hueClient) {
    throw new Error("getHueClient must be used when authenticated");
  }

  return hueClient;
}
