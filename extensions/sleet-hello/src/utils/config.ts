import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  networkId: "mainnet" | "testnet";
  rpcEndpoint: "default" | "fastnear";
}

const RPC_ENDPOINTS = {
  mainnet: {
    default: "https://rpc.mainnet.near.org",
    fastnear: "https://free.rpc.fastnear.com",
  },
  testnet: {
    default: "https://rpc.testnet.near.org",
    fastnear: "https://test.rpc.fastnear.com",
  },
};

const DEFAULT_CONTRACTS = {
  mainnet: "hello.sleet.near",
  testnet: "hello.sleet.testnet",
};

export async function getNetworkConfig() {
  const preferences = getPreferenceValues<Preferences>();
  const { networkId, rpcEndpoint } = preferences;

  // Determine RPC URL
  const nodeUrl = RPC_ENDPOINTS[networkId][rpcEndpoint];

  return {
    networkId,
    nodeUrl,
    contractName: DEFAULT_CONTRACTS[networkId],
  };
}
