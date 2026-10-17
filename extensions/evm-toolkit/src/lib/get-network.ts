import { getDefaultNetworkId } from "./get-default-network-id";
import { NETWORKS, type Network } from "./networks";

export function getNetwork(networkArg?: string): Network | undefined {
  const chainId =
    networkArg && networkArg !== "default" ? networkArg : getDefaultNetworkId();
  return NETWORKS.find((n) => String(n.chainId) === chainId);
}
