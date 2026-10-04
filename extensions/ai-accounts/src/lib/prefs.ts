import { SuggestionPrefs } from "./model";

// Parser input type, not a copy of the manifest preferences.
export interface PreferenceInput {
  cswapPath?: string;
  codexbarPath?: string;
  codexPath?: string;
  codexSwitchMode?: string;
  afterSwitchCommand?: string;
  switchThreshold?: string;
  includeScopedWindows?: boolean;
  expiringQuotaAdvice?: boolean;
  excludeFromSuggestions?: string;
  menuBarValue?: string;
  percentMode?: string;
  autoAddClaudeLogins?: boolean;
}

export interface Config {
  cswapPath: string;
  codexbarPath: string;
  codexPath: string;
  codexSwitchMode: "direct" | "codexbar";
  afterSwitchCommand: string;
  menuBarValue: "detailed" | "headroom" | "weekly";
  percentMode: "remaining" | "used";
  /** Register untracked Claude Code logins with claude-swap automatically (default on). */
  autoAddClaudeLogins: boolean;
  suggestion: SuggestionPrefs;
}

export function detectExecutable(candidates: readonly string[], isExecutable: (file: string) => boolean): string {
  return candidates.find(isExecutable) ?? candidates[0];
}

export function toConfig(raw: PreferenceInput, isExecutable: (file: string) => boolean = () => false): Config {
  const threshold = Number.parseInt(raw.switchThreshold ?? "20", 10);
  return {
    cswapPath: raw.cswapPath?.trim() || "~/.local/bin/cswap",
    codexbarPath:
      raw.codexbarPath?.trim() ||
      detectExecutable(
        [
          "/opt/homebrew/bin/codexbar",
          "/usr/local/bin/codexbar",
          "/Applications/CodexBar.app/Contents/Helpers/CodexBarCLI",
          "~/Applications/CodexBar.app/Contents/Helpers/CodexBarCLI",
        ],
        isExecutable,
      ),
    codexPath:
      raw.codexPath?.trim() ||
      detectExecutable(["/opt/homebrew/bin/codex", "/usr/local/bin/codex", "~/.local/bin/codex"], isExecutable),
    codexSwitchMode: raw.codexSwitchMode === "direct" ? "direct" : "codexbar",
    afterSwitchCommand: raw.afterSwitchCommand?.trim() ?? "",
    menuBarValue: raw.menuBarValue === "weekly" || raw.menuBarValue === "headroom" ? raw.menuBarValue : "detailed",
    percentMode: raw.percentMode === "used" ? "used" : "remaining",
    autoAddClaudeLogins: raw.autoAddClaudeLogins !== false,
    suggestion: {
      threshold: Number.isFinite(threshold) ? Math.min(90, Math.max(1, threshold)) : 20,
      margin: 15,
      includeScopedWindows: raw.includeScopedWindows === true,
      expiringQuotaAdvice: raw.expiringQuotaAdvice === true,
      exclude: (raw.excludeFromSuggestions ?? "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
      decisionMaxAgeMinutes: 5,
    },
  };
}
