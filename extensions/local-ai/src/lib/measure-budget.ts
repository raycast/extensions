import { countTokens } from "./fm/client";
import { checkBudget, inputTokensFrom, type BudgetCheck } from "./tokens";

export async function measureBudget(params: {
  instructions: string;
  stdin: string;
  limitFor: (instructionTokens: number) => number;
  timeoutMs: number;
  signal?: AbortSignal;
  imagePaths?: string[];
}): Promise<BudgetCheck> {
  const { instructions, stdin, limitFor, timeoutMs, signal, imagePaths } = params;
  const [framing, combined] = await Promise.all([
    countTokens("", { instructions, timeoutMs, signal }),
    countTokens(stdin, { instructions, imagePaths, timeoutMs, signal }),
  ]);
  return checkBudget(inputTokensFrom(combined, framing), limitFor(framing));
}
