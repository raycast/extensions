import { tooLongMessage } from "./fm/errors";

export const CONTEXT_WINDOW_TOKENS = 4096;
export const SAFETY_MARGIN_TOKENS = 100;
export const ANSWER_RESERVE_TOKENS = 1000;

export type BudgetCheck =
  { ok: true; tokens: number; limit: number } | { ok: false; tokens: number; limit: number; message: string };

export interface HistoryTurnTokens {
  userTokens: number;
  assistantTokens: number;
}

export function commandInputLimit(instructionTokens: number): number {
  const free = CONTEXT_WINDOW_TOKENS - SAFETY_MARGIN_TOKENS - instructionTokens;
  return Math.max(0, Math.floor(free / 2));
}

export function questionInputLimit(instructionTokens: number): number {
  const free = CONTEXT_WINDOW_TOKENS - SAFETY_MARGIN_TOKENS - ANSWER_RESERVE_TOKENS - instructionTokens;
  return Math.max(0, free);
}

export function inputTokensFrom(combined: number, framing: number): number {
  return Math.max(0, combined - framing);
}

export function checkBudget(inputTokens: number, limit: number): BudgetCheck {
  if (inputTokens <= limit) return { ok: true, tokens: inputTokens, limit };
  return { ok: false, tokens: inputTokens, limit, message: tooLongMessage(inputTokens, limit) };
}

export function selectHistory(
  turns: HistoryTurnTokens[],
  availableTokens: number,
): { startIndex: number; usedTokens: number } {
  let startIndex = turns.length;
  let usedTokens = 0;
  for (let i = turns.length - 1; i >= 0; i--) {
    const cost = turns[i].userTokens + turns[i].assistantTokens;
    if (usedTokens + cost > availableTokens) break;
    usedTokens += cost;
    startIndex = i;
  }
  return { startIndex, usedTokens };
}

export function contextPercent(usedTokens: number): number {
  const percent = Math.round((usedTokens / CONTEXT_WINDOW_TOKENS) * 100);
  return Math.min(100, Math.max(0, percent));
}
