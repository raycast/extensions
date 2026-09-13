import { ProviderError, UsageProvider, UsageResult } from "../../core/models";
import { loadCredentials } from "./auth";
import { CodexUsageResponse, formatPlan, parseCodexUsage } from "./parser";

const USAGE_API = "https://chatgpt.com/backend-api/wham/usage";
const REQUEST_TIMEOUT = 8_000;

export const codexProvider: UsageProvider = {
  id: "codex",
  displayName: "Codex",

  async getUsage(): Promise<UsageResult> {
    const credentials = loadCredentials();

    const headers: Record<string, string> = {
      Authorization: `Bearer ${credentials.accessToken}`,
      Accept: "application/json",
    };
    // Optional: the token alone resolves the account, but sending this keeps
    // multi-account setups unambiguous.
    if (credentials.accountId) headers["chatgpt-account-id"] = credentials.accountId;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    let response: Response;
    try {
      response = await fetch(USAGE_API, { headers, signal: controller.signal });
    } catch (error) {
      const aborted = error instanceof Error && error.name === "AbortError";
      throw new ProviderError("network", aborted ? "Request timed out." : "Could not reach the ChatGPT backend.");
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 401 || response.status === 403) {
      // Codex ships no refresh logic of its own; running the CLI re-mints the token.
      throw new ProviderError("token-expired", "Session expired. Run `codex` once to refresh it.");
    }
    if (!response.ok) {
      throw new ProviderError("network", `ChatGPT backend returned ${response.status}.`);
    }

    let payload: CodexUsageResponse;
    try {
      payload = (await response.json()) as CodexUsageResponse;
    } catch {
      // A signed-out session yields an HTML login page rather than JSON.
      throw new ProviderError("not-authed", "Unexpected response. Run `codex login` to re-authenticate.");
    }

    const windows = parseCodexUsage(payload);
    if (windows.length === 0) {
      throw new ProviderError("unknown", "ChatGPT reported no usage windows for this account.");
    }

    return {
      provider: "codex",
      displayName: "Codex",
      planType: formatPlan(payload.plan_type),
      windows,
      fetchedAt: new Date(),
    };
  },
};
