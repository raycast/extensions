import { homedir } from "os";
import { join } from "path";
import * as fs from "fs";
import fetch from "node-fetch";
import { Provider, UsageData } from "./types";
import { getPreferenceValues } from "@raycast/api";

interface ClaudeCredentials {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  scopes?: string[];
  user_id?: string;
}

interface ClaudeUsage {
  five_hour?: {
    current: number;
    limit: number;
    remaining: number;
  };
  seven_day?: {
    current: number;
    limit: number;
    remaining: number;
  };
  seven_day_sonnet?: {
    current: number;
    limit: number;
    remaining: number;
  };
  seven_day_opus?: {
    current: number;
    limit: number;
    remaining: number;
  };
  extra_usage?: {
    spend: number;
    limit: number;
  };
  rate_limit_tier?: string;
}

interface Preferences {
  claudeAuthToken?: string;
}

export class ClaudeProvider implements Provider {
  id = "claude";
  name = "Claude";
  icon = "🧠";
  description = "Anthropic Claude Code usage";
  
  private credentials: ClaudeCredentials | null = null;
  private authToken: string | null = null;

  async isConfigured(): Promise<boolean> {
    // Check for manual token in preferences
    const prefs = getPreferenceValues<Preferences>();
    if (prefs.claudeAuthToken?.trim()) {
      this.authToken = prefs.claudeAuthToken.trim();
      return true;
    }

    // Check for CLI credentials
    const creds = await this.loadCredentials();
    if (creds?.access_token) {
      return true;
    }

    return false;
  }

  private async loadCredentials(): Promise<ClaudeCredentials | null> {
    if (this.credentials) return this.credentials;
    
    const credsPath = join(homedir(), ".claude", ".credentials.json");
    try {
      const data = fs.readFileSync(credsPath, "utf-8");
      this.credentials = JSON.parse(data);
      return this.credentials;
    } catch {
      return null;
    }
  }

  async fetchUsage(): Promise<UsageData> {
    // Try OAuth API first if we have credentials
    const creds = await this.loadCredentials();
    if (creds?.access_token) {
      try {
        return await this.fetchOAuthUsage(creds.access_token);
      } catch (e) {
        // OAuth failed, try manual token
      }
    }

    // Try manual auth token
    if (this.authToken) {
      return await this.fetchWebUsage(this.authToken);
    }

    throw new Error(
      "No Claude authentication found. Please add your Claude session key in extension preferences."
    );
  }

  private async fetchOAuthUsage(token: string): Promise<UsageData> {
    const response = await fetch("https://api.anthropic.com/api/oauth/usage", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "anthropic-beta": "oauth-2025-04-20",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`OAuth API error: ${response.status}`);
    }

    const data = await response.json() as ClaudeUsage;
    
    // Use the 5-hour window as primary, fall back to 7-day
    const window = data.five_hour || data.seven_day;
    
    if (!window) {
      throw new Error("No usage data available");
    }

    return {
      used: window.current,
      limit: window.limit,
      remaining: window.remaining,
      percentUsed: Math.round((window.current / window.limit) * 100),
      plan: data.rate_limit_tier || "Unknown",
    };
  }

  private async fetchWebUsage(sessionKey: string): Promise<UsageData> {
    // Get org ID first
    const orgResponse = await fetch("https://claude.ai/api/organizations", {
      headers: {
        "Cookie": `sessionKey=${sessionKey}`,
        "Accept": "application/json",
      },
    });

    if (!orgResponse.ok) {
      throw new Error("Invalid session key. Please update your Claude auth token.");
    }

    const orgs = await orgResponse.json() as Array<{ uuid: string }>;
    if (!orgs.length) {
      throw new Error("No organizations found");
    }

    const orgId = orgs[0].uuid;

    // Get usage
    const usageResponse = await fetch(
      `https://claude.ai/api/organizations/${orgId}/usage`,
      {
        headers: {
          "Cookie": `sessionKey=${sessionKey}`,
          "Accept": "application/json",
        },
      }
    );

    if (!usageResponse.ok) {
      throw new Error("Failed to fetch usage data");
    }

    const data = await usageResponse.json() as {
      session_requests?: { current: number; limit: number };
      weekly_requests?: { current: number; limit: number };
    };

    const window = data.session_requests || data.weekly_requests;
    if (!window) {
      throw new Error("No usage window data");
    }

    return {
      used: window.current,
      limit: window.limit,
      remaining: Math.max(0, window.limit - window.current),
      percentUsed: Math.round((window.current / window.limit) * 100),
    };
  }

  getSetupInstructions(): string {
    return `To authenticate with Claude:

1. Visit https://claude.ai in your browser
2. Open DevTools (F12) → Application → Cookies
3. Find the 'sessionKey' cookie
4. Copy its value and paste it in extension preferences

Or install Claude CLI and run 'claude login'.`;
  }
}

export const claudeProvider = new ClaudeProvider();
