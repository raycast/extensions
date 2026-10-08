import { clusterApiUrl } from "@solana/web3.js";

const getCluster = (rpcEndpoint: string) => {
  switch (rpcEndpoint) {
    case clusterApiUrl("devnet"):
      return "devnet";
    case clusterApiUrl("testnet"):
      return "testnet";
    case clusterApiUrl("mainnet-beta"):
      return "mainnet-beta";
    default:
      return "mainnet-beta";
  }
};

export default getCluster;
