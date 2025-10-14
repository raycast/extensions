import { environment } from "@raycast/api";
import { config as loadEnv } from "dotenv";

// Load .env file in development mode
if (environment.isDevelopment) {
  loadEnv();
}

export interface NetworkSimulationConfig {
  enabled: boolean;
  delayMs: number;
}

const config: NetworkSimulationConfig = {
  enabled: environment.isDevelopment && process.env.SIMULATE_SLOW_NETWORK === "true",
  delayMs: parseInt(process.env.NETWORK_DELAY_MS || "5000"),
};

export async function simulateNetworkDelay<T>(operation: () => Promise<T>): Promise<T> {
  if (config.enabled) {
    await new Promise((resolve) => setTimeout(resolve, config.delayMs));
  }
  return operation();
}
