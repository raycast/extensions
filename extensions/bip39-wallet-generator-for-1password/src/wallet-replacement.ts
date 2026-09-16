export type WalletWordCount = 12 | 24;

export interface WalletViewState<TResult> {
  result: TResult;
  generatedWordCount: WalletWordCount;
  revealed: boolean;
}

export const WALLET_REPLACEMENT_WARNING =
  "The current recovery phrase will be discarded and cannot be recovered.";

export type WalletReplacementOutcome<TResult> =
  | { status: "cancelled" }
  | { status: "stale" }
  | {
      status: "replacement";
      result: TResult;
      generatedWordCount: WalletWordCount;
    };

interface WalletReplacementActions<TResult> {
  confirm: () => Promise<boolean>;
  generate: (wordCount: WalletWordCount) => TResult;
  isCurrent: () => boolean;
}

export function createInitialWalletState<TResult>(
  wordCount: WalletWordCount,
  generate: (wordCount: WalletWordCount) => TResult,
): WalletViewState<TResult> {
  return {
    result: generate(wordCount),
    generatedWordCount: wordCount,
    revealed: false,
  };
}

export function needsPreferenceReplacement(
  generatedWordCount: WalletWordCount,
  preferredWordCount: WalletWordCount,
): boolean {
  return generatedWordCount !== preferredWordCount;
}

export async function prepareWalletReplacement<TResult>(
  targetWordCount: WalletWordCount,
  actions: WalletReplacementActions<TResult>,
): Promise<WalletReplacementOutcome<TResult>> {
  const confirmed = await actions.confirm();

  if (!confirmed) return { status: "cancelled" };
  if (!actions.isCurrent()) return { status: "stale" };

  return {
    status: "replacement",
    result: actions.generate(targetWordCount),
    generatedWordCount: targetWordCount,
  };
}

export function applyWalletReplacement<TResult>(
  current: WalletViewState<TResult>,
  outcome: WalletReplacementOutcome<TResult>,
): WalletViewState<TResult> {
  if (outcome.status !== "replacement") return current;

  return {
    result: outcome.result,
    generatedWordCount: outcome.generatedWordCount,
    revealed: false,
  };
}
