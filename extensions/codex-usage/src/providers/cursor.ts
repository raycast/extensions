import fetch from "node-fetch";
import { Provider, UsageData } from "./types";
import { getPreferenceValues } from "@raycast/api";

interface CursorUsage {
  planUsage?: {
    current: number;
    limit: number;
  };
  onDemandUsage?: {
    current: number;
    limit: number;
  };
  billingCycle?: {
    endDate: string;
  };
}

interface Preferences {
  cursorAuthToken?: string;
}

export class CursorProvider implements Provider {
  id = "cursor";
  name = "Cursor";
  icon = "⚡";
  description = "Cursor IDE usage";
  
  private authToken: string | null = null;

  async isConfigured(): Promise<boolean> {
    const prefs = getPreferenceValues<Preferences>();
    if (prefs.cursorAuthToken?.trim()) {
      this.authToken = prefs.cursorAuthToken.trim();
      return true;
    }
    return false;
  }

  async fetchUsage(): Promise<UsageData> {
    if (!this.authToken) {
      throw new Error(
        "No Cursor authentication found. Please add your Cursor cookies in extension preferences."
      );
    }

    // Try usage-summary endpoint first
    const response = await fetch("https://cursor.com/api/usage-summary", {
      headers: {
        "Cookie": this.authToken,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Cursor API error: ${response.status}. Check your cookies.`);
    }

    const data = await response.json() as CursorUsage;
    
    const planUsage = data.planUsage;
    if (!planUsage) {
      throw new Error("No usage data available");
    }

    return {
      used: planUsage.current,
      limit: planUsage.limit,
      remaining: Math.max(0, planUsage.limit - planUsage.current),
      percentUsed: Math.round((planUsage.current / planUsage.limit) * 100),
      resetDate: data.billingCycle?.endDate,
      plan: "Cursor Pro",
    };
  }

  getSetupInstructions(): string {
    return `To authenticate with Cursor:

1. Visit https://cursor.com in your browser
2. Open DevTools (F12) → Network tab
3. Refresh the page
4. Find any request to cursor.com
5. Copy the entire Cookie header value
6. Paste it in extension preferences under "Cursor Auth Token"

Note: The cookie should contain session tokens for cursor.com and cursor.sh domains.`;
  }
}

export const cursorProvider = new CursorProvider();
