import { BaseProvider } from "./base-provider";
import { UsageData, ProviderCapabilities } from "../types";
import { getProviderConfig } from "../utils/storage";
import { handleFetchError } from "../utils/fetcher";

export class AntigravityProvider extends BaseProvider {
  readonly id = "antigravity";
  readonly name = "Antigravity";
  readonly icon = "antigravity-icon.png";
  readonly defaultEnabled = false;

  readonly capabilities: ProviderCapabilities = {
    supportsSession: true,
    supportsWeekly: false,
    supportsResetTime: false,
    supportsCost: false,
    authMethods: [],
  };

  async isConfigured(): Promise<boolean> {
    const config = getProviderConfig(this.id);
    return config?.enabled ?? this.defaultEnabled;
  }

  async isAuthenticated(): Promise<boolean> {
    // Local language server probe - no external auth needed
    // Detects local Antigravity LSP installation
    return true;
  }

  async fetchUsage(): Promise<UsageData> {
    try {
      this.updateStatus("configured");

      // Local probe - no external API calls
      // Usage would be read from local LSP state/logs
      throw new Error(
        "Antigravity is experimental. Local LSP probe not yet implemented."
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.setError(err);
      handleFetchError(err, this.name);
      throw err;
    }
  }

  async authenticate(): Promise<boolean> {
    // No auth required for local probe
    this.updateStatus("authenticated");
    return true;
  }

  async disconnect(): Promise<void> {
    this.usageData = null;
    this.updateStatus("not_configured");
  }
}
