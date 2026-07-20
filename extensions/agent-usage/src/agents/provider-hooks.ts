import { getPreferenceValues } from "@raycast/api";
import { createAccountsHook, createUsageHook } from "./hooks";
import { readOpencodeAuthToken } from "./opencode-auth";
import { loadAccounts } from "../accounts/storage";

import { fetchAmpUsage } from "../amp/fetcher";
import type { AmpError, AmpUsage } from "../amp/types";
import { fetchAntigravityUsage } from "../antigravity/fetcher";
import type { AntigravityError, AntigravityUsage } from "../antigravity/types";
import { fetchClaudeUsage, readClaudeCredentials } from "../claude/fetcher";
import type { ClaudeError, ClaudeUsage } from "../claude/types";
import { buildCodexAccountCandidates } from "../codex/accounts";
import { listCodexOAuthAccounts } from "../codex/auth";
import { fetchCodexUsage } from "../codex/fetcher";
import type { CodexError, CodexUsage } from "../codex/types";
import { resolveCopilotAuthTokens, shouldFallbackToPreferenceToken } from "../copilot/auth";
import { fetchCopilotUsage } from "../copilot/fetcher";
import type { CopilotError, CopilotUsage } from "../copilot/types";
import { fetchCursorUsage, resolveCursorCredential } from "../cursor/fetcher";
import type { CursorError, CursorUsage } from "../cursor/types";
import { resolveDroidAuth } from "../droid/auth";
import { fetchDroidUsage } from "../droid/fetcher";
import type { DroidError, DroidUsage } from "../droid/types";
import { fetchGeminiUsage, readGeminiAuthKey } from "../gemini/fetcher";
import type { GeminiError, GeminiUsage } from "../gemini/types";
import { fetchGrokUsage } from "../grok/fetcher";
import type { GrokError, GrokUsage } from "../grok/types";
import { fetchKimiUsage, KIMI_OPENCODE_KEY } from "../kimi/fetcher";
import type { KimiError, KimiUsage } from "../kimi/types";
import { resolveMiniMaxAuthTokens } from "../minimax/auth";
import { fetchMiniMaxUsage } from "../minimax/fetcher";
import type { MiniMaxError, MiniMaxUsage } from "../minimax/types";
import { fetchOpencodegoUsage } from "../opencode-go/fetcher";
import type { OpencodegoError, OpencodegoUsage } from "../opencode-go/types";
import { fetchSyntheticUsage, SYNTHETIC_OPENCODE_KEY } from "../synthetic/fetcher";
import type { SyntheticError, SyntheticUsage } from "../synthetic/types";
import { resolveZaiAuthTokens } from "../zai/auth";
import { fetchZaiUsage, ZAI_OPENCODE_KEY } from "../zai/fetcher";
import type { ZaiError, ZaiUsage } from "../zai/types";

/**
 * Provider hooks are the Raycast adapter layer: they combine Raycast-only
 * concerns (preferences, React hook lifetimes, and `hooks.ts` caching) with
 * provider code that should stay importable from plain Node tests. Keeping the
 * boundary in one explicit manifest makes this import block noisy, but avoids
 * coupling every fetcher/auth/parser module to the Raycast runtime.
 */

// Root-level preferences shared by both commands.
type SharedPrefs = {
  copilotAuthToken?: string;
  cursorCookieHeader?: string;
  kimiAuthToken?: string;
  syntheticApiToken?: string;
  zaiApiToken?: string;
  minimaxApiToken?: string;
  opencodegoWorkspaceId?: string;
  opencodegoAuthCookie?: string;
};

function prefValue(key: keyof SharedPrefs): string {
  return getPreferenceValues<SharedPrefs>()[key]?.trim() || "";
}

export const useAmpUsage = createUsageHook<AmpUsage, AmpError>({
  agentId: "amp",
  fetcher: fetchAmpUsage,
});

export const useAntigravityUsage = createUsageHook<AntigravityUsage, AntigravityError>({
  agentId: "antigravity",
  fetcher: () => fetchAntigravityUsage(),
});

export const useClaudeUsage = createUsageHook<ClaudeUsage, ClaudeError>({
  agentId: "claude",
  resolveAuthKey: async () => readClaudeCredentials().credentials?.accessToken ?? "",
  fetcher: async () => {
    const { credentials, error } = readClaudeCredentials();
    if (!credentials) return { usage: null, error };
    return fetchClaudeUsage(credentials);
  },
});

async function resolveCopilotTokens() {
  return resolveCopilotAuthTokens({ preferenceToken: prefValue("copilotAuthToken") });
}

export const useCopilotUsage = createUsageHook<CopilotUsage, CopilotError>({
  agentId: "copilot",
  resolveAuthKey: async () => {
    const { primaryToken, preferenceToken } = await resolveCopilotTokens();
    return `${primaryToken ?? ""}\n${preferenceToken ?? ""}`;
  },
  fetcher: async () => {
    const { primaryToken, localToken, preferenceToken } = await resolveCopilotTokens();
    if (!primaryToken) {
      return {
        usage: null,
        error: {
          type: "not_configured",
          message: "Copilot is not configured. Set GH_TOKEN/GITHUB_TOKEN or add a token in extension settings (Cmd+,).",
        },
      };
    }
    let result = await fetchCopilotUsage(primaryToken);
    if (
      preferenceToken &&
      shouldFallbackToPreferenceToken({ localToken, preferenceToken, errorType: result.error?.type })
    ) {
      result = await fetchCopilotUsage(preferenceToken);
    }
    return result;
  },
});

export const useCursorUsage = createUsageHook<CursorUsage, CursorError>({
  agentId: "cursor",
  resolveAuthKey: async () => resolveCursorCredential(prefValue("cursorCookieHeader"))?.cookieHeader ?? "",
  fetcher: () => fetchCursorUsage(prefValue("cursorCookieHeader")),
});

export const useDroidUsage = createUsageHook<DroidUsage, DroidError>({
  agentId: "droid",
  resolveAuthKey: async () => (await resolveDroidAuth()).accessToken ?? "",
  fetcher: async () => {
    const { accessToken } = await resolveDroidAuth();
    if (!accessToken) {
      return {
        usage: null,
        error: {
          type: "not_configured",
          message:
            "Droid not configured. Run `droid` to log in (auto-detected from ~/.factory/auth.v2.* or ~/.factory/auth.*).",
        },
      };
    }
    return fetchDroidUsage(accessToken);
  },
});

export const useGeminiUsage = createUsageHook<GeminiUsage, GeminiError>({
  agentId: "gemini",
  resolveAuthKey: async () => readGeminiAuthKey(),
  fetcher: fetchGeminiUsage,
});

export const useGrokUsage = createUsageHook<GrokUsage, GrokError>({
  agentId: "grok",
  fetcher: fetchGrokUsage,
});

export const useMiniMaxUsage = createUsageHook<MiniMaxUsage, MiniMaxError>({
  agentId: "minimax",
  resolveAuthKey: async () => {
    const { primaryToken } = await resolveMiniMaxAuthTokens({ preferenceToken: prefValue("minimaxApiToken") });
    return primaryToken ?? "";
  },
  fetcher: async () => {
    const { primaryToken } = await resolveMiniMaxAuthTokens({ preferenceToken: prefValue("minimaxApiToken") });
    if (!primaryToken) {
      return {
        usage: null,
        error: {
          type: "not_configured",
          message:
            "MiniMax token not configured. Add it in extension settings (Cmd+,) or set MINIMAX_API_KEY in your shell.",
        },
      };
    }
    return fetchMiniMaxUsage(primaryToken);
  },
});

export const useOpencodegoUsage = createUsageHook<OpencodegoUsage, OpencodegoError>({
  agentId: "opencode-go",
  resolveAuthKey: async () => `${prefValue("opencodegoWorkspaceId")}\n${prefValue("opencodegoAuthCookie")}`,
  fetcher: async () => {
    const workspaceId = prefValue("opencodegoWorkspaceId");
    const authCookie = prefValue("opencodegoAuthCookie");
    if (!workspaceId && !authCookie) {
      return {
        usage: null,
        error: {
          type: "not_configured",
          message:
            "OpenCode Go workspace ID and auth cookie not configured. Please add them in extension settings (Cmd+,).",
        },
      };
    }
    if (!workspaceId) {
      return {
        usage: null,
        error: {
          type: "not_configured",
          message: "OpenCode Go workspace ID not configured. Please add it in extension settings (Cmd+,).",
        },
      };
    }
    if (!authCookie) {
      return {
        usage: null,
        error: {
          type: "not_configured",
          message: "OpenCode Go auth cookie not configured. Please add it in extension settings (Cmd+,).",
        },
      };
    }
    return fetchOpencodegoUsage(workspaceId, authCookie);
  },
});

export const useCodexAccounts = createAccountsHook<
  CodexUsage,
  CodexError,
  ReturnType<typeof buildCodexAccountCandidates>[number]
>({
  agentId: "codex",
  getAccounts: async () => buildCodexAccountCandidates(listCodexOAuthAccounts(), await loadAccounts("codex")),
  fetcher: async (account) => {
    if (account.needsAccountId) {
      return {
        usage: null,
        error: {
          type: "not_configured",
          message:
            "Add the ChatGPT account ID for this manual Codex account, or run 'codex login' and let Agent Usage read the OAuth account from CODEX_HOME.",
        },
      };
    }
    return fetchCodexUsage(account.token, account.accountId);
  },
  resolveAccountAuthKey: (account) =>
    [account.token, account.accountId ?? "", String(account.needsAccountId)].join("\n"),
  noAccountsError: {
    type: "not_configured",
    message: "Codex is not configured. Run 'codex login' to authenticate or add an account via Manage Accounts.",
  },
});

export const useKimiAccounts = createAccountsHook<KimiUsage, KimiError, { id: string; label: string; token: string }>({
  agentId: "kimi",
  getAccounts: async () => {
    const accounts = [...(await loadAccounts("kimi"))];
    const prefToken = prefValue("kimiAuthToken");
    if (prefToken && !accounts.some((account) => account.token === prefToken)) {
      accounts.push({ id: "kimi-pref", label: "Manual", token: prefToken });
    }
    const autoToken = readOpencodeAuthToken(KIMI_OPENCODE_KEY);
    if (autoToken && !accounts.some((account) => account.token === autoToken)) {
      accounts.push({ id: "kimi-opencode", label: "Auto-detected", token: autoToken });
    }
    return accounts;
  },
  fetcher: (account) => fetchKimiUsage(account.token),
  openCodeKey: KIMI_OPENCODE_KEY,
  noAccountsError: {
    type: "not_configured",
    message: "Kimi token not found. Login via OpenCode (kimi-for-coding) or add an account via Manage Accounts.",
  },
});

export const useSyntheticAccounts = createAccountsHook<
  SyntheticUsage,
  SyntheticError,
  { id: string; label: string; token: string }
>({
  agentId: "synthetic",
  getAccounts: async () => {
    const accounts = [...(await loadAccounts("synthetic"))];
    const prefToken = prefValue("syntheticApiToken");
    if (prefToken && !accounts.some((account) => account.token === prefToken)) {
      accounts.push({ id: "synthetic-pref", label: "Manual", token: prefToken });
    }
    const opencodeToken = readOpencodeAuthToken(SYNTHETIC_OPENCODE_KEY);
    if (opencodeToken && !accounts.some((account) => account.token === opencodeToken)) {
      accounts.push({ id: "synthetic-opencode", label: "Auto-detected", token: opencodeToken });
    }
    return accounts;
  },
  fetcher: (account) => fetchSyntheticUsage(account.token),
  openCodeKey: SYNTHETIC_OPENCODE_KEY,
  noAccountsError: {
    type: "not_configured",
    message: "Synthetic token not found. Login via OpenCode (synthetic) or add an account via Manage Accounts.",
  },
});

export const useZaiAccounts = createAccountsHook<ZaiUsage, ZaiError, { id: string; label: string; token: string }>({
  agentId: "zai",
  getAccounts: async () => {
    const accounts = [...(await loadAccounts("zai"))];
    const preferenceToken = prefValue("zaiApiToken");
    const { allTokens: autoTokens } = await resolveZaiAuthTokens({ preferenceToken });
    for (let i = 0; i < autoTokens.length; i++) {
      const token = autoTokens[i];
      if (!accounts.some((account) => account.token === token)) {
        const isManualPref = i === 0 && preferenceToken !== "";
        const id = isManualPref ? "zai-pref" : i === 0 ? "zai-auto" : `zai-auto-${i}`;
        const label = isManualPref ? "Manual" : "Auto-detected";
        accounts.push({ id, label, token });
      }
    }
    return accounts;
  },
  fetcher: (account) => fetchZaiUsage(account.token),
  openCodeKey: ZAI_OPENCODE_KEY,
  noAccountsError: {
    type: "not_configured",
    message: "z.ai token not configured. Add an account via Manage Accounts or set ZAI_API_KEY in your shell.",
  },
});
