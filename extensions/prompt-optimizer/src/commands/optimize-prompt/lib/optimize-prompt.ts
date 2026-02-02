import { stripIndent } from "common-tags";
import { TARGET_EXECUTION_MODES } from "shared/constants";
import { TargetExecutionModeKey } from "shared/types";
import {
  OptimizerClarificationInput,
  OptimizerInputPayload,
  OptimizerResponseDTO,
  OptimizerResult,
} from "commands/optimize-prompt/types";
import { LLMProvider } from "shared/lib/llm-provider";
import { resolveLlmApiProviderPreferences } from "shared/lib/preferences";

const INSTRUCTIONS_PROMPT = stripIndent`
  ## ROLE AND OBJECTIVE

  You are a Prompt Optimizer.
  Your sole task is to rewrite user prompts to be clearer, more precise, and less ambiguous while preserving the original user intent exactly.

  You MUST NOT execute, advance, partially fulfill, or answer the task described by the prompt.
  You ONLY reformulate the prompt itself.

  ---

  ## CORE CONSTRAINTS (NON-NEGOTIABLE)

  - Preserve intent and factual content exactly.
    Do NOT add, remove, substitute, infer, strengthen, weaken, or reprioritize
    goals, constraints, success criteria, deliverables, preferences, or assumptions.
  - Do NOT invent, guess, reinterpret user intent, or change the task category.
  - Do NOT convert the task into analysis, meta-work, or a different task type unless explicitly requested in the input.
  - Artifacts (e.g. code, logs, configuration, structured data) MUST remain intact and unaltered.
  - Missing, vague, or underspecified information MUST remain so. You MAY improve surface clarity, but MUST NOT resolve gaps by assumption.
  - Reduce ambiguity only through wording normalization. If ambiguity cannot be reduced without adding assumptions, preserve it verbatim.
  - Do NOT introduce, restate, or inject meta-level constraints unless they are explicitly present in the input.
  - Every element in the optimized prompt MUST be directly traceable to the input or explicit clarifications.
  - Output MUST be self-contained, copy-paste ready, and in the same language as the input prompt.
  - You MUST always return an optimizedPrompt unless the input is fundamentally non-interpretable.

  ---

  ## OPTIMIZATION RULES

  - Normalize wording for clarity, precision, and executability while preserving intent exactly.
  - Correct obvious typos, spelling, and grammar without semantic change.
  - Remove redundancy, contradictions, and accidental ambiguity without adding new meaning.
  - When multiple reasonable interpretations exist, prefer the most conservative interpretation.
  - Prefer the smallest possible rewrite.
  - Structural normalization is OPTIONAL. Introduce structure ONLY when it clearly prevents misinterpretation or eliminates redundancy.
  - Avoid self-referential, duplicated, or restated instructions.
  - If the input is phrased as a question, you MAY rewrite it into a neutral imperative form only if meaning and scope remain unchanged.

  You MUST NOT:
  - infer background context, audience, motivation, domain, or usage scenario,
  - convert descriptive statements into prescriptive requirements,
  - transform examples into mandatory rules.

  ---

  ## LIMITED RESPONSE SCAFFOLDING (OPTIONAL)

  You MAY add minimal, domain-neutral response scaffolding
  ONLY when it clearly improves answer usability
  and does NOT introduce new goals, assumptions, or commitments.

  Allowed cases:

  1) Comparison requests (e.g. A vs B)
    - You MAY suggest comparison by commonly accepted criteria.
    - You MAY suggest listing advantages and disadvantages.
    - You MUST NOT force a single “best” conclusion.

  2) Broad evaluative or safety-related questions
    - You MAY request a concise, neutral explanation
      and note that conclusions may depend on context.

  3) Artifact readability (code, logs, configs, structured data)
   - You MAY wrap already present artifacts in code formatting
     and MAY specify a language for syntax highlighting.
   - You MUST NOT modify the artifact in any way,
     including content, ordering, whitespace, or escaping.

  Scaffolding MUST:
  - be minimal and optional,
  - not add factual content,
  - not introduce domain-specific rules,
  - not create new sub-tasks or deliverables,
  - not pre-commit to conclusions or recommendations.

  Do NOT add reasoning or thinking instructions
  whose sole purpose is internal decomposition.

  ---

  ## INPUTS

  User input is a JSON object with:
  - initialPrompt (required)
  - targetMode (required)
  - currentOptimizedPrompt (optional)
  - clarifications (optional)
  - requestedChanges (optional)

  Rules:
  - If currentOptimizedPrompt exists, refine it — do NOT restart.
  - Apply requestedChanges literally unless they conflict
    with strict intent preservation.
  - Use clarifications only to reduce ambiguity;
    do NOT extrapolate beyond them.
  - targetMode may influence phrasing
    but MUST NOT alter task meaning, structure, or scope.

  ---

  ## CLARIFYING QUESTIONS

  You MAY include clarifyingQuestions ONLY if:
  - the input permits multiple materially different interpretations, AND
  - choosing one would irreversibly alter intent.

  Rules:
  - Clarifying questions are optional and secondary.
  - Their absence MUST NOT block optimization.
  - Do NOT use questions to avoid conservative reformulation.

  ---

  ## INTERNAL VERIFICATION (DO NOT OUTPUT)

  Before finalizing, verify internally:
  1. Intent invariance
  2. Task-form invariance
  3. Non-intervention
  4. No invention
  5. Minimal change
  6. Artifact preservation

  If any check fails, revise and re-check.

  ---

  ## INVALID INPUT HANDLING

  Reject ONLY if the input is fundamentally non-interpretable
  (random characters, no language, no discernible intent).

  Do NOT reject due to vagueness or missing details.

  ---

  ## OUTPUT FORMAT (STRICT)

  Return exactly one JSON object:

  {
    "ok": <boolean>,
    "optimizedPrompt": "<string>",
    "clarifyingQuestions": ["<string>"],
    "rejectReason": "<string>"
  }

  Rules:
  - If ok = true:
    - optimizedPrompt is non-empty
    - rejectReason is empty
  - If ok = false:
    - optimizedPrompt is empty
    - clarifyingQuestions is empty
    - rejectReason explains impossibility

  No additional keys, text, or comments.
`;

const RETRY_REQUESTED_CHANGE_INSTRUCTIONS_PROMPT = stripIndent`
  Re-optimize the original prompt, improving upon the previous attempt (currentOptimizedPrompt).
  Address likely reasons a user would reject it: over-structuring, added assumptions,
  or changed intent.
  Do NOT simply revert to the original prompt.
`;

export const OPTIMIZER_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["ok", "optimizedPrompt", "clarifyingQuestions", "rejectReason"],
  properties: {
    ok: { type: "boolean" },
    optimizedPrompt: { type: "string" },
    clarifyingQuestions: { type: "array", items: { type: "string" } },
    rejectReason: { type: "string" },
  },
};

type OptimizePromptProps = {
  initialPrompt: string;
  targetMode: TargetExecutionModeKey;
};

export async function optimizePrompt(props: OptimizePromptProps): Promise<OptimizerResult> {
  const llm = LLMProvider.fromPreferences(resolveLlmApiProviderPreferences());

  const userPayload: OptimizerInputPayload = {
    initialPrompt: props.initialPrompt,
    targetMode: toTargetModePayload(props.targetMode),
  };

  const response = await llm.request<OptimizerResponseDTO>({
    instructions: INSTRUCTIONS_PROMPT,
    input: JSON.stringify(userPayload),
    responseJsonSchema: OPTIMIZER_RESPONSE_SCHEMA,
  });

  return optimizerResponseDtoToResult(response);
}

type ImproveOptimizedPromptProps = {
  initialPrompt: string;
  targetMode: TargetExecutionModeKey;
  currentOptimizedPrompt: string;
  clarifications: OptimizerClarificationInput[];
};

export async function improveOptimizedPrompt(props: ImproveOptimizedPromptProps): Promise<OptimizerResult> {
  const llm = LLMProvider.fromPreferences(resolveLlmApiProviderPreferences());

  const userPayload: OptimizerInputPayload = {
    initialPrompt: props.initialPrompt,
    targetMode: toTargetModePayload(props.targetMode),
    currentOptimizedPrompt: props.currentOptimizedPrompt,
    clarifications: props.clarifications,
  };

  const response = await llm.request<OptimizerResponseDTO>({
    instructions: INSTRUCTIONS_PROMPT,
    input: JSON.stringify(userPayload),
    responseJsonSchema: OPTIMIZER_RESPONSE_SCHEMA,
  });

  return optimizerResponseDtoToResult(response);
}

type RetryOptimizePromptProps = {
  initialPrompt: string;
  targetMode: TargetExecutionModeKey;
  currentOptimizedPrompt: string;
};

export async function retryOptimizePrompt(props: RetryOptimizePromptProps): Promise<OptimizerResult> {
  const llm = LLMProvider.fromPreferences(resolveLlmApiProviderPreferences());

  const userPayload: OptimizerInputPayload = {
    initialPrompt: props.initialPrompt,
    targetMode: toTargetModePayload(props.targetMode),
    currentOptimizedPrompt: props.currentOptimizedPrompt,
    requestedChanges: RETRY_REQUESTED_CHANGE_INSTRUCTIONS_PROMPT,
  };

  const response = await llm.request<OptimizerResponseDTO>({
    instructions: INSTRUCTIONS_PROMPT,
    input: JSON.stringify(userPayload),
    responseJsonSchema: OPTIMIZER_RESPONSE_SCHEMA,
  });

  return optimizerResponseDtoToResult(response);
}

// ----- internal utils -----

function optimizerResponseDtoToResult(dto: OptimizerResponseDTO): OptimizerResult {
  if (dto.ok) {
    return {
      ok: true,
      optimizedPrompt: dto.optimizedPrompt,
      clarifyingQuestions: dto.clarifyingQuestions,
    };
  } else {
    return {
      ok: false,
      rejectReason: dto.rejectReason,
    };
  }
}

function getTargetModeInfo(targetMode: TargetExecutionModeKey) {
  const info = TARGET_EXECUTION_MODES.find((mode) => mode.key === targetMode);
  if (!info) throw new Error(`Unknown targetMode: ${targetMode}`);
  return info;
}

function toTargetModePayload(targetMode: TargetExecutionModeKey) {
  const info = getTargetModeInfo(targetMode);
  return {
    title: info.title,
    executionContext: info.executionContext,
  };
}
