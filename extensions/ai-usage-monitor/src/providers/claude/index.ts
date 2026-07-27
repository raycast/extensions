import { ProviderError, UsageProvider, UsageResult } from "../../core/models";
import { inferPlan, loadCredentials } from "./auth";
import { ClaudeUsageResponse, parseClaudeUsage } from "./parser";

const USAGE_API = "https://api.anthropic.com/api/oauth/usage";
const OAUTH_BETA_HEADER = "oauth-2025-04-20";
const REQUEST_TIMEOUT = 8_000;

export const claudeProvider: UsageProvider = {
  id: "claude",
  displayName: "Claude Code",

  async getUsage(): Promise<UsageResult> {
    const credentials = await loadCredentials();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    let response: Response;
    try {
      response = await fetch(USAGE_API, {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          Accept: "application/json",
          "anthropic-beta": OAUTH_BETA_HEADER,
        },
        signal: controller.signal,
      });
    } catch (error) {
      const aborted = error instanceof Error && error.name === "AbortError";
      throw new ProviderError("network", aborted ? "Request timed out." : "Could not reach the Anthropic API.");
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 401 || response.status === 403) {
      throw new ProviderError("token-expired", "Session expired. Run `claude` once to refresh it.");
    }
    if (!response.ok) {
      throw new ProviderError("network", `Anthropic API returned ${response.status}.`);
    }

    let payload: ClaudeUsageResponse;
    try {
      payload = (await response.json()) as ClaudeUsageResponse;
    } catch {
      throw new ProviderError("unknown", "Could not parse the Anthropic API response.");
    }

    const windows = parseClaudeUsage(payload);
    if (windows.length === 0) {
      throw new ProviderError("unknown", "Anthropic reported no usage windows for this account.");
    }

    return {
      provider: "claude",
      displayName: "Claude Code",
      planType: inferPlan(credentials),
      windows,
      fetchedAt: new Date(),
    };
  },
};
