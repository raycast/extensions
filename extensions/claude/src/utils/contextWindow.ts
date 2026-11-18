import type { AvailableModel } from "../api/models";
import type { Chat, Message } from "../type";
import { chatTransformer, toChronological } from "./index";

/**
 * Conservative turn cap used when `countTokens()` itself fails (network error, rate
 * limit, etc). A failed count must never block the question — this trades precision for
 * availability.
 *
 * A turn cap ALONE is not a size limit: ten turns of pasted logs can exceed any model's
 * window, so "last 10 turns" contradicted this module's stated guarantee that the request
 * fits the input budget. `estimateRequestTokens` below adds the missing size check, and
 * this cap remains as the backstop for the case that estimate cannot cover.
 */
export const FALLBACK_TURN_CAP = 10;

/**
 * Per-message allowance for request framing on the fallback path.
 *
 * `countTokens()` counts a structured request, not concatenated text: role delimiters,
 * message boundaries, and control tokens all cost tokens while consuming none of the
 * text this module can measure. There is no published constant for that framing and it
 * varies by model, so this is an explicit policy reserve rather than a derived figure.
 * It is per-message because that is the shape framing actually takes — a flat reserve
 * would be negligible against a 200k window and ruinous against a small one.
 */
export const FRAMING_TOKENS_PER_MESSAGE = 8;

/**
 * UTF-8 byte length, used as the fallback path's token estimate.
 *
 * Bytes rather than `String.length` because JS characters are UTF-16 code units and bear
 * no fixed relationship to tokens: ASCII is 1 byte per character, but CJK and Devanagari
 * are 3 and emoji are 2 or more. A character count therefore *under*-estimates dense
 * scripts — the exact content most likely to exceed a budget — while bytes scale with
 * encoded size and, for ordinary text, sit comfortably above the real token count.
 *
 * `Buffer.byteLength` rather than `TextEncoder` or `Buffer.from(...).length`: it returns
 * the length without allocating the encoded array, which matters on a long transcript,
 * and it is properly typed here via `@types/node` (this `tsconfig` has no DOM lib).
 *
 * THIS IS A HEURISTIC, NOT A BOUND, and the distinction is deliberate. Every ordinary
 * token consumes at least one byte, but special and structural tokens consume none of
 * the user's bytes at all, so no byte count can prove a request fits — which is why
 * `FRAMING_TOKENS_PER_MESSAGE` exists, why `FALLBACK_TURN_CAP` remains a real backstop,
 * and why the result carries `countFailed: true`. A measured count is the only thing
 * that establishes the request fits; this path exists to keep the conversation usable
 * when measuring is impossible, not to replace it.
 */
function utf8ByteLength(text: string): number {
  return Buffer.byteLength(text, "utf8");
}

/**
 * Conservative input-window assumption used when the API doesn't report
 * `max_input_tokens` (older API responses, or the hardcoded `FALLBACK_MODELS` list in
 * `src/api/models.ts`). Smaller than every current Claude model's real window, so the
 * bound is honest rather than a guess dressed up as the real ceiling.
 */
export const DEFAULT_INPUT_WINDOW_TOKENS = 100_000;

/** Function shape of `client.messages.countTokens()`, narrowed to what this module needs. */
export type CountTokensFn = (params: {
  model: string;
  system?: string;
  messages: Message[];
}) => Promise<{ input_tokens: number }>;

/**
 * Hard ceiling on `countTokens()` calls per `buildBoundedMessages` invocation, independent
 * of the search strategy. Binary search over even a pathologically large transcript needs
 * only ~log2(n) calls (a 10,000-turn conversation is under 14), so this ceiling exists to
 * guarantee no future change to the trim algorithm can reintroduce an unbounded — or merely
 * very large — sequence of network round-trips, not because it is expected to bind.
 */
export const MAX_COUNT_CALLS = 20;

export interface BuildBoundedRequestParams {
  /** Full transcript, in any order — chronological order is established internally. */
  chats: Chat[];
  /** The new question being asked, not yet part of `chats`. */
  question: string;
  model: {
    option: string;
    prompt: string;
  };
  availableModel: Pick<AvailableModel, "max_tokens" | "max_input_tokens"> | undefined;
  countTokens: CountTokensFn;
}

export interface BuildBoundedRequestResult {
  /** Bounded message list, chronological, ready to send as `messages`. */
  messages: Message[];
  /** True when one or more older turns were left out of the request. */
  trimmed: boolean;
  /** How many of the transcript's turns were dropped from the request. */
  droppedTurnCount: number;
  /** True when the bound came from the turn-cap fallback because counting failed. */
  countFailed: boolean;
}

/**
 * The input token budget for a request.
 *
 * This is `max_input_tokens` as advertised, NOT that value minus `max_tokens`. The two
 * are separate budgets: the API documents `max_input_tokens` as "Maximum input context
 * window size in tokens for this model" and `max_tokens` as "Maximum value for the
 * `max_tokens` parameter when using this model". Output is not drawn from the input
 * window, so reserving it here discards usable input for nothing — on a 200k model
 * advertising a 64k output ceiling that is 32% of the window, and the user would be told
 * their conversation had been trimmed while a third of the budget sat unspent.
 *
 * The subtraction was also reserving the wrong number on its own terms: the model's
 * ceiling rather than the `max_tokens` the request actually asks for.
 */
export function computeInputBudget(
  availableModel: Pick<AvailableModel, "max_tokens" | "max_input_tokens"> | undefined
): number {
  const maxInputTokens = availableModel?.max_input_tokens ?? DEFAULT_INPUT_WINDOW_TOKENS;
  // A pathological or absent advertised window must never produce a non-positive budget.
  return Math.max(maxInputTokens, 1);
}

/**
 * Estimated request tokens for the fallback path: encoded size of everything actually
 * sent, plus a per-message framing allowance.
 *
 * `system` is included because the real request carries the preset's prompt as a
 * top-level `system` field and `countTokens()` counts it. Omitting it made every
 * estimate short by the whole length of the user's system prompt, which for a preset
 * built around a long instruction block is not a rounding error.
 */
function estimateRequestTokens(messages: Message[], system: string, question: string): number {
  const textBytes =
    utf8ByteLength(system) +
    utf8ByteLength(question) +
    messages.reduce((total, message) => total + utf8ByteLength(message.content), 0);
  // +1 for the pending question, which becomes a message of its own.
  const framing = FRAMING_TOKENS_PER_MESSAGE * (messages.length + 1);
  return textBytes + framing;
}

/**
 * Turn-pair count fallback, shared by the upfront-failure and mid-search-failure paths.
 * A failed count must never block the question, so this degrades to a conservative bound
 * rather than blocking or sending everything. `turnPairs` is always the FULL turn-pair
 * list here — both call sites fall back against the whole transcript, not against
 * whatever partial candidate the search was probing when the failure happened.
 *
 * TWO limits apply, and the tighter one wins:
 *
 * 1. `FALLBACK_TURN_CAP` — at most the newest 10 turn-pairs.
 * 2. `estimateRequestTokens` — pairs are dropped oldest-first until the estimate fits
 *    `budget`.
 *
 * Limit 2 exists because a turn cap alone is not a size limit at all: ten turns of pasted
 * logs, or a single enormous turn, sailed past the input budget with nothing checking
 * size, while this module's docstring claimed the request was bounded.
 *
 * NEITHER LIMIT MAKES THIS SOUND, and the wording here is deliberate. The estimate counts
 * encoded bytes plus a framing allowance, both of which sit above the token count for
 * ordinary text — but structural tokens consume no user bytes, no framing constant is
 * published, and the count endpoint is itself documented as approximate. `countFailed:
 * true` is therefore not a footnote: it is the caller's signal that nothing here was
 * measured. A request trimmed on this path can still be rejected, and that rejection is
 * the honest outcome rather than a silently dropped question.
 *
 * A single turn larger than the whole budget cannot be made to fit by dropping others —
 * that pair is kept anyway rather than sending an empty transcript, which on its own
 * makes "the request fits" unclaimable even with a perfect estimate.
 */
function fallbackResult(
  turnPairs: Message[][],
  system: string,
  question: string,
  budget: number
): BuildBoundedRequestResult {
  let keptPairs = Math.min(turnPairs.length, FALLBACK_TURN_CAP);
  // Drop oldest-first until the estimate fits. Stops at 1 rather than 0: an over-budget
  // single newest turn is the API's call to reject, not ours to silently swallow.
  while (
    keptPairs > 1 &&
    estimateRequestTokens(turnPairs.slice(turnPairs.length - keptPairs).flat(), system, question) > budget
  ) {
    keptPairs -= 1;
  }

  const droppedTurnCount = turnPairs.length - keptPairs;
  const messages = turnPairs.slice(turnPairs.length - keptPairs).flat();
  return {
    messages,
    trimmed: droppedTurnCount > 0,
    droppedTurnCount,
    countFailed: true,
  };
}

/**
 * Builds the bounded message list for a request: newest-first accumulation of prior
 * turns until adding the next-oldest turn would exceed the input budget, then restored
 * to chronological order. `question` is not counted here — callers append it as the
 * final user turn after this returns, matching the existing `[...chatTransformer(data),
 * { role: "user", content: question }]` shape in `useChat.tsx`.
 *
 * Counts with the API's own `client.messages.countTokens()` rather than a character
 * heuristic — a hand-rolled estimate is exactly the kind of guess that produced the
 * `max_tokens` name-inference bug retired earlier in this project.
 *
 * WHAT IS AND IS NOT GUARANTEED — the asymmetry is the whole point:
 *
 * When `countTokens()` SUCCEEDS, the returned list was MEASURED to fit the input budget.
 * That is a guarantee.
 *
 * When it FAILS, nothing here is guaranteed. The list is limited by a turn cap
 * (`FALLBACK_TURN_CAP`) and by `estimateRequestTokens`, which counts encoded bytes plus a
 * framing allowance — both above the token count for ordinary text, neither a proof.
 * Structural tokens consume no user bytes, no framing constant is published, and even the
 * count endpoint is documented as approximate. `countFailed: true` is how a caller tells
 * the two situations apart, and it exists precisely because they are not the same.
 *
 * Two cases no estimate rescues: a single newest turn that alone exceeds the budget, and
 * content whose true token count outruns its encoded size. Both are sent, and the API's
 * rejection is a truer signal than silently dropping the user's question. A degraded
 * estimate beats no answer; the unbounded fallback this replaced beat neither.
 *
 * When the full transcript is over budget, the number of turn-pairs to keep is found by
 * **binary search**, not a linear one-pair-at-a-time scan: a 200-turn conversation needing
 * heavy trimming must not cost ~199 sequential network round-trips (the exact case this
 * task exists to rescue is a long conversation, so a linear scan is slowest precisely
 * when the user can least afford to wait). Binary search bounds the call count to
 * O(log n), and `MAX_COUNT_CALLS` puts a hard ceiling on it regardless. Every candidate
 * search step is a real `countTokens()` call, so the pair count this function returns is
 * always one that was *measured* under budget — never merely estimated — whenever
 * counting succeeds at all.
 *
 * The full transcript (`chats`) is never mutated; only the returned message list is
 * bounded. Display continues to read the untouched transcript.
 */
export async function buildBoundedMessages({
  chats,
  question,
  model,
  availableModel,
  countTokens,
}: BuildBoundedRequestParams): Promise<BuildBoundedRequestResult> {
  const chronological = toChronological(chats);
  const fullMessages = chatTransformer(chronological);

  if (fullMessages.length === 0) {
    return { messages: fullMessages, trimmed: false, droppedTurnCount: 0, countFailed: false };
  }

  const budget = computeInputBudget(availableModel);

  // Turn-pairs (question+answer) are the unit of trimming, always dropped together so a
  // trimmed request never starts on a dangling assistant turn.
  const turnPairs: Message[][] = [];
  for (let i = 0; i < fullMessages.length; i += 2) {
    turnPairs.push(fullMessages.slice(i, i + 2));
  }

  let callsMade = 0;
  /** Counts the newest `pairCount` turn-pairs plus the new question. Call-budgeted. */
  async function countNewestPairs(pairCount: number): Promise<number> {
    callsMade += 1;
    const candidateMessages = turnPairs.slice(turnPairs.length - pairCount).flat();
    const result = await countTokens({
      model: model.option,
      system: model.prompt,
      messages: [...candidateMessages, { role: "user", content: question }],
    });
    return result.input_tokens;
  }

  let fullTokens: number;
  try {
    fullTokens = await countNewestPairs(turnPairs.length);
  } catch {
    // Degrade gracefully: a failed count must never block the question. Cap by turn
    // count instead of tokens — conservative, but keeps the conversation usable.
    return fallbackResult(turnPairs, model.prompt, question, budget);
  }

  if (fullTokens <= budget) {
    return { messages: fullMessages, trimmed: false, droppedTurnCount: 0, countFailed: false };
  }

  // Over budget: binary search for the largest newest-first pair count that fits,
  // confirming each candidate with a real countTokens() call rather than an estimate —
  // an estimate alone could ship an over-budget request; only a measured count can rule
  // that out. `lo` is always a known-fitting pair count (0 trivially fits: the request
  // still carries system + question); `hi` is always known NOT to fit (we just measured
  // the full transcript over budget above, so turnPairs.length qualifies).
  let lo = 0;
  let hi = turnPairs.length;
  let bestFittingCount = 0;

  while (lo < hi && callsMade < MAX_COUNT_CALLS) {
    const mid = Math.ceil((lo + hi) / 2);
    if (mid === lo) break; // no progress left to make (lo/hi have converged)

    let candidateTokens: number;
    try {
      candidateTokens = await countNewestPairs(mid);
    } catch {
      // A count that succeeded before and fails mid-search is treated the same as an
      // upfront failure: fall back to the conservative turn cap on the full transcript.
      return fallbackResult(turnPairs, model.prompt, question, budget);
    }

    if (candidateTokens <= budget) {
      bestFittingCount = mid;
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  // The loop above only ever raises `bestFittingCount` on a *measured* fit, so this final
  // slice was itself confirmed under budget by a real count — not merely estimated — even
  // though `hi`'s failing candidates were never re-verified as still failing.
  const keptPairs = turnPairs.slice(turnPairs.length - bestFittingCount);
  const messages = keptPairs.flat();
  const droppedTurnCount = turnPairs.length - bestFittingCount;

  return { messages, trimmed: droppedTurnCount > 0, droppedTurnCount, countFailed: false };
}
