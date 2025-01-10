import * as dotenv from "dotenv";

export const TESTNET_URL = "https://testnet.fuel.network/v1/graphql";
export const MAINNET_URL = "https://mainnet.fuel.network/v1/graphql";

type Network = "testnet" | "mainnet";

export const getFuelUrl = (network: Network) => {
  return network === "testnet" ? TESTNET_URL : MAINNET_URL;
};

interface EnvVars {
  OPENAI_API_KEY: string;
  FUEL_WALLET_PRIVATE_KEY: string;
}

export const getEnvVars = async (): Promise<EnvVars> => {
  dotenv.config();
  return {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
    FUEL_WALLET_PRIVATE_KEY: process.env.FUEL_WALLET_PRIVATE_KEY || "",
  };
};
