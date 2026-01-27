import { BaseProvider } from "./base-provider";
import { UsageData, ProviderCapabilities } from "../types";
import { getAPIKey, getProviderConfig } from "../utils/storage";
import { handleFetchError } from "../utils/fetcher";

export class ZaiProvider extends BaseProvider {
  readonly id = "zai";
  readonly name = "z.ai";
  readonly icon = "zai-icon.png";
  readonly defaultEnabled = false;

  readonly capabilities: ProviderCapabilities = {
    supportsSession: true,
    supportsWeekly: true,
    supportsResetTime: true,
    supportsCost: false,
    authMethods: ["apikey"],
  };

  private apiToken: string | null = null;

  async isConfigured(): Promise<boolean> {
    const config = getProviderConfig(this.id);
    return config?.enabled ?? this.defaultEnabled;
  }

  async isAuthenticated(): Promise<boolean> {
    // API token stored in Keychain (via Raycast secure storage)
    const token = getAPIKey(this.id);
    if (token) {
      this.apiToken = token;
      return true;
    }
    return false;
  }

  async fetchUsage(): Promise<UsageData> {
    try {
      this.updateStatus("configured");

      if (!this.apiToken) {
        const authenticated = await this.isAuthenticated();
        if (!authenticated) {
          throw new Error("Not authenticated. Please add your z.ai API token.");
        }
      }

      // z.ai API for quota + MCP windows
      throw new Error(
        "z.ai API integration pending. Add API token in settings."
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.setError(err);
      handleFetchError(err, this.name);
      throw err;
    }
  }

  async authenticate(): Promise<boolean> {
    const token = getAPIKey(this.id);
    if (token) {
      this.apiToken = token;
      this.updateStatus("authenticated");
      return true;
    }
    return false;
  }

  async disconnect(): Promise<void> {
    this.apiToken = null;
    this.usageData = null;
    this.updateStatus("not_configured");
  }
}
