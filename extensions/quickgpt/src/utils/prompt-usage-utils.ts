import type { PromptProps } from "../managers/prompt-manager";

export interface PromptUsageSummary {
  totalCount: number;
  recent7d: number;
  recent30d: number;
  lastUsedAt?: string;
}

export interface PromptUsageRow extends PromptUsageSummary {
  identifier: string;
  title: string;
  path?: string;
  filePath?: string;
}

export interface PromptUsageSections {
  topUsed: PromptUsageRow[];
  recent7d: PromptUsageRow[];
  lowUsage: PromptUsageRow[];
}

export const TRACKED_PROMPT_ACTIONS = new Set(["copyToClipboard", "copyOriginalPrompt", "paste"]);

const EXCLUDED_PROMPT_IDENTIFIERS = new Set([
  "settings",
  "manage-temporary-directory",
  "open-preferences",
  "create-prompt-library",
  "open-custom-prompts-dir",
  "open-scripts-dir",
  "prompt-usage-stats",
]);

export function isUsageAction(actionName?: string): boolean {
  if (!actionName) return false;
  return TRACKED_PROMPT_ACTIONS.has(actionName) || actionName.startsWith("script_");
}

export function isPromptEligibleForUsageStats(prompt: PromptProps): boolean {
  if (!prompt.identifier || EXCLUDED_PROMPT_IDENTIFIERS.has(prompt.identifier)) {
    return false;
  }

  if (prompt.subprompts && prompt.subprompts.length > 0) {
    return false;
  }

  return typeof prompt.content === "string" && prompt.content.trim().length > 0;
}

export function shouldTrackPromptUsage(prompt: PromptProps, actionName?: string): boolean {
  return isUsageAction(actionName) && isPromptEligibleForUsageStats(prompt);
}

export async function runPromptActionWithTracking(
  prompt: PromptProps,
  actionName: string | undefined,
  actionHandler: (() => void | boolean | Promise<void | boolean>) | undefined,
  recordUsage: (prompt: PromptProps, actionName: string, usedAt?: Date) => Promise<void>,
): Promise<void> {
  if (!actionHandler) {
    return;
  }

  const result = await Promise.resolve(actionHandler());
  if (result === false || !actionName || !shouldTrackPromptUsage(prompt, actionName)) {
    return;
  }

  try {
    await recordUsage(prompt, actionName, new Date());
  } catch (error) {
    console.error(`Failed to record prompt usage for ${prompt.identifier}:`, error);
  }
}

export function buildPromptUsageSections(rows: PromptUsageRow[]): PromptUsageSections {
  const topUsed = rows
    .filter((row) => row.totalCount > 0)
    .slice()
    .sort((a, b) => {
      if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
      return compareDateDesc(a.lastUsedAt, b.lastUsedAt);
    });

  const recent7d = rows
    .filter((row) => row.recent7d > 0)
    .slice()
    .sort((a, b) => {
      if (b.recent7d !== a.recent7d) return b.recent7d - a.recent7d;
      return compareDateDesc(a.lastUsedAt, b.lastUsedAt);
    });

  const lowUsage = rows.slice().sort((a, b) => {
    const aNeverUsed = a.totalCount === 0;
    const bNeverUsed = b.totalCount === 0;

    if (aNeverUsed !== bNeverUsed) {
      return aNeverUsed ? -1 : 1;
    }

    if (a.totalCount !== b.totalCount) {
      return a.totalCount - b.totalCount;
    }

    return compareDateAsc(a.lastUsedAt, b.lastUsedAt);
  });

  return { topUsed, recent7d, lowUsage };
}

function compareDateDesc(a?: string, b?: string): number {
  const aTime = a ? new Date(a).getTime() : 0;
  const bTime = b ? new Date(b).getTime() : 0;
  return bTime - aTime;
}

function compareDateAsc(a?: string, b?: string): number {
  const aTime = a ? new Date(a).getTime() : Number.NEGATIVE_INFINITY;
  const bTime = b ? new Date(b).getTime() : Number.NEGATIVE_INFINITY;
  return aTime - bTime;
}
