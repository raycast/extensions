import { homedir } from "os";
import { join } from "path";
import * as fs from "fs";
import { Provider, UsageData } from "./types";

interface CodexTokens {
  access_token?: string;
  account_id?: string;
  id_token?: string;
  refresh_token?: string;
}

interface CodexAuth {
  last_refresh?: string;
  OPENAI_API_KEY?: string;
  tokens?: CodexTokens;
  access_token?: string;
}

interface WhamWindow {
  used_percent: number;
  limit_window_seconds: number;
  reset_after_seconds: number;
  reset_at: number;
}

interface WhamResponse {
  plan_type?: string;
  rate_limit?: {
    allowed?: boolean;
    limit_reached?: boolean;
    primary_window?: WhamWindow;
    secondary_window?: WhamWindow | null;
  };
  code_review_rate_limit?: {
    allowed?: boolean;
    limit_reached?: boolean;
    primary_window?: WhamWindow;
    secondary_window?: WhamWindow | null;
  };
  credits?: {
    has_credits?: boolean;
    unlimited?: boolean;
    balance?: string;
  };
}

interface CodexUsageData extends UsageData {
  weeklyUsed: number;
  weeklyLimit: number;
  weeklyPercentUsed: number;
  weeklyResetAt?: number;
  credits: number;
  allowed: boolean;
  limitReached: boolean;
}

export class CodexProvider implements Provider {
  id = "codex";
  name = "Codex";
  icon = "🤖";
  description = "OpenAI Codex CLI usage";
  
  private authData: CodexAuth | null = null;

  async isConfigured(): Promise<boolean> {
    const auth = await this.loadAuth();
    const token = this.getAccessToken(auth);
    return auth !== null && !!token;
  }

  private getAccessToken(auth: CodexAuth | null): string | null {
    if (!auth) return null;
    if (auth.tokens?.access_token) return auth.tokens.access_token;
    if (auth.access_token) return auth.access_token;
    return null;
  }

  private async loadAuth(): Promise<CodexAuth | null> {
    if (this.authData) return this.authData;
    
    const paths = [
      join(homedir(), ".codex", "auth.json"),
      join(homedir(), ".codex", "credentials.json"),
      process.env.CODEX_HOME ? join(process.env.CODEX_HOME, "auth.json") : null,
    ].filter(Boolean) as string[];
    
    for (const authPath of paths) {
      try {
        if (fs.existsSync(authPath)) {
          const content = fs.readFileSync(authPath, "utf-8");
          const data = JSON.parse(content) as CodexAuth;
          
          if (this.getAccessToken(data)) {
            this.authData = data;
            return this.authData;
          }
        }
      } catch {
        // Continue
      }
    }
    
    return null;
  }

  async fetchUsage(): Promise<CodexUsageData> {
    const auth = await this.loadAuth();
    const token = this.getAccessToken(auth);
    
    if (!token) {
      throw new Error("Not authenticated. Run 'codex login'.");
    }

    const response = await fetch("https://chatgpt.com/backend-api/wham/usage", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
      },
    });

    if (response.status === 401) {
      throw new Error("Authentication expired. Run 'codex login' again.");
    }

    if (!response.ok) {
      throw new Error(`API error ${response.status}`);
    }

    const data = await response.json() as WhamResponse;
    
    console.log("WHAM parsed:", {
      plan: data.plan_type,
      rate_limit: data.rate_limit,
      credits: data.credits,
    });

    const rateLimit = data.rate_limit;
    if (!rateLimit) {
      throw new Error("No rate_limit data in response");
    }

    // Primary window = 5-hour session (18000 seconds)
    const primary = rateLimit.primary_window;
    // Secondary window = weekly (604800 seconds)
    const secondary = rateLimit.secondary_window;

    if (!primary) {
      throw new Error("No primary_window in rate_limit");
    }

    // Parse credits
    const creditsBalance = data.credits?.balance ? parseFloat(data.credits.balance) : 0;

    // Calculate actual numbers from percentages
    // Typical limits: 5h = 50 requests, weekly = 500 requests
    const sessionLimit = 50;
    const weeklyLimit = 500;
    
    const sessionUsed = Math.round((primary.used_percent / 100) * sessionLimit);
    const weeklyUsed = secondary ? Math.round((secondary.used_percent / 100) * weeklyLimit) : 0;

    return {
      used: sessionUsed,
      limit: sessionLimit,
      remaining: Math.max(0, sessionLimit - sessionUsed),
      percentUsed: primary.used_percent,
      resetDate: new Date(primary.reset_at * 1000).toISOString(),
      plan: data.plan_type ? data.plan_type.charAt(0).toUpperCase() + data.plan_type.slice(1) : "Unknown",
      
      // Extended data
      weeklyUsed,
      weeklyLimit,
      weeklyPercentUsed: secondary?.used_percent ?? 0,
      weeklyResetAt: secondary?.reset_at,
      credits: Math.floor(creditsBalance),
      allowed: rateLimit.allowed ?? true,
      limitReached: rateLimit.limit_reached ?? false,
    };
  }

  getSetupInstructions(): string {
    return "Install Codex CLI and run 'codex login' to authenticate.";
  }
}

export const codexProvider = new CodexProvider();
export type { CodexUsageData };
