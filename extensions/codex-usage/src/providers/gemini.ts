import { homedir } from "os";
import { join } from "path";
import * as fs from "fs";
import fetch from "node-fetch";
import { Provider, UsageData } from "./types";
import { getPreferenceValues } from "@raycast/api";

interface GeminiCredentials {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  token_uri?: string;
  client_id?: string;
  client_secret?: string;
}

interface GeminiQuota {
  quota?: {
    daily?: {
      current: number;
      limit: number;
    };
    monthly?: {
      current: number;
      limit: number;
    };
  };
  tier?: string;
}

interface Preferences {
  geminiApiKey?: string;
}

export class GeminiProvider implements Provider {
  id = "gemini";
  name = "Gemini";
  icon = "♊";
  description = "Google Gemini Code Assist usage";
  
  private credentials: GeminiCredentials | null = null;
  private apiKey: string | null = null;

  async isConfigured(): Promise<boolean> {
    // Check for manual API key
    const prefs = getPreferenceValues<Preferences>();
    if (prefs.geminiApiKey?.trim()) {
      this.apiKey = prefs.geminiApiKey.trim();
      return true;
    }

    // Check for CLI credentials
    const creds = await this.loadCredentials();
    if (creds?.access_token) {
      return true;
    }

    return false;
  }

  private async loadCredentials(): Promise<GeminiCredentials | null> {
    if (this.credentials) return this.credentials;
    
    // Try Gemini CLI credentials
    const credsPath = join(homedir(), ".gemini", "credentials.json");
    try {
      const data = fs.readFileSync(credsPath, "utf-8");
      this.credentials = JSON.parse(data);
      return this.credentials;
    } catch {
      // Try gcloud ADC
      const adcPath = join(homedir(), ".config", "gcloud", "application_default_credentials.json");
      try {
        const data = fs.readFileSync(adcPath, "utf-8");
        this.credentials = JSON.parse(data);
        return this.credentials;
      } catch {
        return null;
      }
    }
  }

  async fetchUsage(): Promise<UsageData> {
    // Try API key first
    if (this.apiKey) {
      return this.fetchWithApiKey(this.apiKey);
    }

    // Try OAuth credentials
    const creds = await this.loadCredentials();
    if (creds?.access_token) {
      return this.fetchWithOAuth(creds.access_token);
    }

    throw new Error(
      "No Gemini authentication found. Please add an API key or authenticate with Gemini CLI."
    );
  }

  private async fetchWithApiKey(apiKey: string): Promise<UsageData> {
    // Gemini API key usage endpoint (if available)
    // Note: This is a placeholder as Gemini API usage endpoint varies
    throw new Error("API key authentication not yet implemented for Gemini. Use OAuth/CLI.");
  }

  private async fetchWithOAuth(token: string): Promise<UsageData> {
    // Try the Code Assist quota endpoint
    const response = await fetch(
      "https://geminicodeassist.googleapis.com/v1/quota:retrieveUserQuota",
      {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json() as GeminiQuota;
    
    const quota = data.quota?.daily || data.quota?.monthly;
    if (!quota) {
      throw new Error("No quota data available");
    }

    return {
      used: quota.current,
      limit: quota.limit,
      remaining: Math.max(0, quota.limit - quota.current),
      percentUsed: Math.round((quota.current / quota.limit) * 100),
      plan: data.tier || "Gemini",
    };
  }

  getSetupInstructions(): string {
    return `To authenticate with Gemini:

Method 1 - Gemini CLI (Recommended):
1. Install Gemini CLI: npm install -g @google/gemini-cli
2. Run: gemini login
3. The extension will use the CLI credentials automatically

Method 2 - gcloud:
1. Install gcloud CLI
2. Run: gcloud auth application-default login
3. The extension will use the ADC credentials

Method 3 - API Key (Limited):
Some features may require OAuth. Get an API key from Google AI Studio.`;
  }
}

export const geminiProvider = new GeminiProvider();
