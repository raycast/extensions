import { getPreferenceValues } from "@raycast/api";

import { loadAccounts } from "../accounts/storage.ts";
import { resolveAihubmixAccessKey } from "../aihubmix/auth.ts";
import { fetchAihubmixUsage } from "../aihubmix/fetcher.ts";
import type { AihubmixError, AihubmixUsage } from "../aihubmix/types.ts";
import { fetchAmpUsage } from "../amp/fetcher.ts";
import type { AmpError, AmpUsage } from "../amp/types.ts";
import { fetchAntigravityUsage } from "../antigravity/fetcher.ts";
import type { AntigravityError, AntigravityUsage } from "../antigravity/types.ts";
import { fetchClaudeUsage, readClaudeCredentials } from "../claude/fetcher.ts";
import type { ClaudeError, ClaudeUsage } from "../claude/types.ts";
import { buildClinePassAccountCandidates } from "../clinepass/accounts.ts";
import { readClineCredentials } from "../clinepass/auth.ts";
import { fetchClinePassUsage } from "../clinepass/fetcher.ts";
import { clearClineLocalCredential, loadClineLocalCredential, saveClineLocalCredential } from "../clinepass/storage.ts";
import type { ClinePassError, ClinePassUsage } from "../clinepass/types.ts";
import { buildCodexAccountCandidates } from "../codex/accounts.ts";
import { listCodexOAuthAccounts, parseAdditionalCodexHomes } from "../codex/auth.ts";
import { fetchCodexUsage } from "../codex/fetcher.ts";
import type { CodexError, CodexUsage } from "../codex/types.ts";
import { buildCopilotAccountCandidates } from "../copilot/accounts.ts";
import { resolveCopilotAuthTokens } from "../copilot/auth.ts";
import { fetchCopilotUsage } from "../copilot/fetcher.ts";
import type { CopilotError, CopilotUsage } from "../copilot/types.ts";
import { fetchCursorUsage, resolveCursorCredential } from "../cursor/fetcher.ts";
import type { CursorError, CursorUsage } from "../cursor/types.ts";
import { resolveDeepSeekApiKey } from "../deepseek/auth.ts";
import { fetchDeepSeekUsage } from "../deepseek/fetcher.ts";
import type { DeepSeekError, DeepSeekUsage } from "../deepseek/types.ts";
import { resolveDroidAuth } from "../droid/auth.ts";
import { fetchDroidUsage } from "../droid/fetcher.ts";
import type { DroidError, DroidUsage } from "../droid/types.ts";
import { fetchGeminiUsage, readGeminiAuthKey } from "../gemini/fetcher.ts";
import type { GeminiError, GeminiUsage } from "../gemini/types.ts";
import { fetchGrokUsage } from "../grok/fetcher.ts";
import type { GrokError, GrokUsage } from "../grok/types.ts";
import { fetchKimiUsage, KIMI_OPENCODE_KEY } from "../kimi/fetcher.ts";
import type { KimiError, KimiUsage } from "../kimi/types.ts";
import { resolveMiniMaxAuthTokens } from "../minimax/auth.ts";
import { fetchMiniMaxUsage } from "../minimax/fetcher.ts";
import type { MiniMaxError, MiniMaxUsage } from "../minimax/types.ts";
import { resolveMinimaxCNAuthTokens } from "../minimaxcn/auth.ts";
import { fetchMinimaxCNUsage } from "../minimaxcn/fetcher.ts";
import type { MinimaxCNError, MinimaxCNUsage } from "../minimaxcn/types.ts";
import { fetchOpencodegoUsage } from "../opencode-go/fetcher.ts";
import type { OpencodegoError, OpencodegoUsage } from "../opencode-go/types.ts";
import { fetchSyntheticUsage, SYNTHETIC_OPENCODE_KEY } from "../synthetic/fetcher.ts";
import type { SyntheticError, SyntheticUsage } from "../synthetic/types.ts";
import { resolveZaiAuthTokens } from "../zai/auth.ts";
import { fetchZaiUsage, ZAI_OPENCODE_KEY } from "../zai/fetcher.ts";
import type { ZaiError, ZaiUsage } from "../zai/types.ts";
import { createAccountsHook, createUsageHook } from "./hooks.ts";
import { readOpencodeAuthToken } from "./opencode-auth.ts";

/**
 * Provider hooks are the Raycast adapter layer: they combine Raycast-only
 * concerns (preferences, React hook lifetimes, and `hooks.ts` caching) with
 * provider code that should stay importable from plain Node tests. Keeping the
 * boundary in one explicit manifest makes this import block noisy, but avoids
 * coupling every fetcher/auth/parser module to the Raycast runtime.
 */

// Root-level preferences shared by both commands.
type SharedPrefs = {
  additionalCodexHomes?: string;
  aihubmixApiKey?: string;
  copilotAuthToken?: string;
  cursorCookieHeader?: string;
  deepseekApiKey?: string;
  kimiAuthToken?: string;
  syntheticApiToken?: string;
  zaiApiToken?: string;
  minimaxApiToken?: string;
  minimaxcnApiToken?: string;
  opencodegoWorkspaceId?: string;
  opencodegoAuthCookie?: string;
};

function prefValue(key: keyof SharedPrefs): string {
  return getPreferenceValues<SharedPrefs>()[key]?.trim() || "";
}

export const useAihubmixUsage = createUsageHook<AihubmixUsage, AihubmixError>({
  agentId: "aihubmix",
  resolveAuthKey: async () => (await resolveAihubmixAccessKey(prefValue("aihubmixApiKey"))) ?? "",
  fetcher: async () => {
    const accessKey = await resolveAihubmixAccessKey(prefValue("aihubmixApiKey"));
    if (!accessKey) {
      return {
        usage: null,
        error: {
          type: "not_configured",
          message:
            "AIHubMix Access Key not configured. Copy it from https://console.aihubmix.com/setting, then paste it in extension settings (Cmd+,) or set AIHUBMIX_ACCESS_KEY in your shell.",
        },
      };
    }
    return fetchAihubmixUsage(accessKey);
  },
});

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

export const useCopilotAccounts = createAccountsHook<
  CopilotUsage,
  CopilotError,
  ReturnType<typeof buildCopilotAccountCandidates>[number]
>({
  agentId: "copilot",
  getAccounts: async () => {
    const { cliToken, githubToken, ghToken } = await resolveCopilotAuthTokens();
    return buildCopilotAccountCandidates({
      manualAccounts: await loadAccounts("copilot"),
      preferenceToken: prefValue("copilotAuthToken"),
      cliToken,
      githubToken,
      ghToken,
    });
  },
  fetcher: (account) => fetchCopilotUsage(account.token),
  noAccountsError: {
    type: "not_configured",
    message: "Copilot is not configured. Set GH_TOKEN/GITHUB_TOKEN or add an account via Manage Accounts.",
  },
});

export const useCursorUsage = createUsageHook<CursorUsage, CursorError>({
  agentId: "cursor",
  resolveAuthKey: async () => resolveCursorCredential(prefValue("cursorCookieHeader"))?.cookieHeader ?? "",
  fetcher: () => fetchCursorUsage(prefValue("cursorCookieHeader")),
});

export const useDeepSeekUsage = createUsageHook<DeepSeekUsage, DeepSeekError>({
  agentId: "deepseek",
  resolveAuthKey: async () => (await resolveDeepSeekApiKey(prefValue("deepseekApiKey"))) ?? "",
  fetcher: async () => {
    const apiKey = await resolveDeepSeekApiKey(prefValue("deepseekApiKey"));
    if (!apiKey) {
      return {
        usage: null,
        error: {
          type: "not_configured",
          message:
            "DeepSeek API key not configured. Add it in extension settings (Cmd+,), log in through OpenCode, or set DEEPSEEK_API_KEY in your shell.",
        },
      };
    }
    return fetchDeepSeekUsage(apiKey);
  },
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

// MinimaxCN — the Chinese-region MiniMax provider (api.minimaxi.com, vs api.minimax.io for the international edition).
// Token resolves from MINIMAX_CN_API_KEY env var or the minimaxcnApiToken preference.
export const useMinimaxCNUsage = createUsageHook<MinimaxCNUsage, MinimaxCNError>({
  agentId: "minimaxcn",
  resolveAuthKey: async () => {
    const { primaryToken } = await resolveMinimaxCNAuthTokens({ preferenceToken: prefValue("minimaxcnApiToken") });
    return primaryToken ?? "";
  },
  fetcher: async () => {
    const { primaryToken } = await resolveMinimaxCNAuthTokens({ preferenceToken: prefValue("minimaxcnApiToken") });
    if (!primaryToken) {
      return {
        usage: null,
        error: {
          type: "not_configured",
          message:
            "MinimaxCN token not configured. Add it in extension settings (Cmd+,) or set MINIMAX_CN_API_KEY in your shell.",
        },
      };
    }
    return fetchMinimaxCNUsage(primaryToken);
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
  getAccounts: async () => {
    const defaultAccounts = listCodexOAuthAccounts();
    const additionalAccounts = parseAdditionalCodexHomes(prefValue("additionalCodexHomes")).flatMap(
      (codexHome, homeIndex) =>
        listCodexOAuthAccounts({ codexHome }).map((account) => ({
          ...account,
          id: `codex-home-${homeIndex}-${account.id}`,
        })),
    );

    return buildCodexAccountCandidates([...defaultAccounts, ...additionalAccounts], await loadAccounts("codex"));
  },
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

export const useClinePassAccounts = createAccountsHook<
  ClinePassUsage,
  ClinePassError,
  ReturnType<typeof buildClinePassAccountCandidates>[number]
>({
  agentId: "clinepass",
  getAccounts: async () => {
    const localCredential = await loadClineLocalCredential();
    const fileCredential = readClineCredentials({ clineHome: localCredential?.clineHome })[0] ?? null;
    return buildClinePassAccountCandidates(localCredential ?? fileCredential, await loadAccounts("clinepass"));
  },
  fetcher: (account) =>
    fetchClinePassUsage(account, {
      readFileCredentials: () => readClineCredentials({ clineHome: account.clineHome }),
      saveLocalCredential: saveClineLocalCredential,
      clearLocalCredential: clearClineLocalCredential,
    }),
  resolveAccountAuthKey: (account) =>
    [account.token, account.userId, account.refreshToken ?? "", account.source].join("\n"),
  noAccountsError: {
    type: "not_configured",
    message: "ClinePass is not configured. Sign in to Cline, or add a Cline user ID and API key via Manage Accounts.",
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
