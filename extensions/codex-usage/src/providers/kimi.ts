import fetch from "node-fetch";
import { Provider, UsageData } from "./types";
import { getPreferenceValues } from "@raycast/api";

interface KimiUsageResponse {
  usages?: Array<{
    scope: string;
    detail: {
      limit: string;
      used: string;
      remaining: string;
      resetTime: string;
    };
    limits?: Array<{
      window: {
        duration: number;
        timeUnit: string;
      };
      detail: {
        limit: string;
        used: string;
        remaining: string;
        resetTime: string;
      };
    }>;
  }>;
}

interface Preferences {
  kimiAuthToken?: string;
}

export class KimiProvider implements Provider {
  id = "kimi";
  name = "Kimi";
  icon = "🌙";
  description = "Kimi For Coding usage";
  
  private authToken: string | null = null;

  async isConfigured(): Promise<boolean> {
    const prefs = getPreferenceValues<Preferences>();
    if (prefs.kimiAuthToken?.trim()) {
      this.authToken = prefs.kimiAuthToken.trim();
      return true;
    }
    return false;
  }

  async fetchUsage(): Promise<UsageData> {
    if (!this.authToken) {
      throw new Error(
        "No Kimi authentication found. Please add your Kimi auth token in extension preferences."
      );
    }

    // Clean up the token - sometimes users paste with Bearer prefix
    let token = this.authToken;
    if (token.toLowerCase().startsWith("bearer ")) {
      token = token.substring(7).trim();
    }

    // Try both kimi.com and kimi.moonshot.cn
    const hosts = ["www.kimi.com", "kimi.moonshot.cn"];
    let lastError = null;

    for (const host of hosts) {
      try {
        const response = await fetch(
          `https://${host}/apiv2/kimi.gateway.billing.v1.BillingService/GetUsages`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
              "Accept": "application/json",
              "Origin": `https://${host}`,
              "Referer": `https://${host}/`,
            },
            body: JSON.stringify({}),
          }
        );

        if (response.status === 401) {
          lastError = `401 Unauthorized - Token may be expired or invalid for ${host}`;
          continue; // Try next host
        }

        if (!response.ok) {
          lastError = `Kimi API error (${host}): ${response.status}`;
          continue;
        }

        const data = await response.json() as KimiUsageResponse;
        
        // Find FEATURE_CODING usage
        const codingUsage = data.usages?.find(u => u.scope === "FEATURE_CODING");
        if (!codingUsage) {
          lastError = `No coding usage data found from ${host}`;
          continue;
        }

        const detail = codingUsage.detail;
        const limit = parseInt(detail.limit, 10);
        const used = parseInt(detail.used, 10);
        const remaining = parseInt(detail.remaining, 10);

        // Also get the 5-hour rate limit
        const rateLimit = codingUsage.limits?.find(
          l => l.window.duration === 300 && l.window.timeUnit === "TIME_UNIT_MINUTE"
        );

        return {
          used,
          limit,
          remaining,
          percentUsed: Math.round((used / limit) * 100),
          resetDate: detail.resetTime,
          plan: rateLimit 
            ? `5h: ${rateLimit.detail.used}/${rateLimit.detail.limit}` 
            : "Kimi",
        };
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
      }
    }

    throw new Error(`All Kimi hosts failed. Last error: ${lastError}`);
  }

  getSetupInstructions(): string {
    return `To authenticate with Kimi:

1. Visit https://www.kimi.com/code in your browser
2. Open DevTools (F12) → Application → Cookies
3. Find the 'kimi-auth' cookie
4. Copy its value (JWT token starting with 'eyJ...')
5. Paste it in extension preferences under "Kimi Auth Token"

Note: The token expires periodically. If usage stops working, repeat these steps.`;
  }
}

export const kimiProvider = new KimiProvider();
