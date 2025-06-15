export const TESTNET_URL = "https://testnet.fuel.network/v1/graphql";
export const MAINNET_URL = "https://mainnet.fuel.network/v1/graphql";

type Network = "testnet" | "mainnet";

export const getFuelUrl = (network: Network) => {
  return network === "testnet" ? TESTNET_URL : MAINNET_URL;
};
