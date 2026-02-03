import type { LLMRequestErrorState } from "shared/hooks/useLLMRequest";

export type OptimizePromptFormValues = {
  prompt: string;
  targetMode: string;
};

export type ImproveOptimizedPromptFormValues = {
  clarifications: { question: string; answer: string }[];
};

export type OptimizePromptFormErrorState = LLMRequestErrorState;

/**
 * The raw response from the optimizer LLM.
 */
export type OptimizerResponseDTO = {
  ok: boolean;
  optimizedPrompt: string;
  clarifyingQuestions: string[];
  rejectReason: string;
};

/**
 * The result when the optimization is successful.
 */
export type OptimizerSuccessResult = {
  ok: true;
  optimizedPrompt: string;
  clarifyingQuestions: string[];
};

/**
 * The result when the optimization is rejected by the LLM.
 */
export type OptimizerRejectedResult = {
  ok: false;
  rejectReason: string;
};

/** Wrapper type for optimizer responses. */
export type OptimizerResult = OptimizerSuccessResult | OptimizerRejectedResult;

export type OptimizerClarificationInput = {
  question: string;
  answer: string;
};

export type OptimizerInputPayload = {
  /** The original prompt to optimize. */
  initialPrompt: string;

  /** The target mode info (the execution scenario for the optimized prompt) */
  targetMode: { title: string; executionContext: string };

  /** An optional current optimized prompt to provide as context. */
  currentOptimizedPrompt?: string;

  /** Any requested changes from the user to clarify the prompt. */
  clarifications?: OptimizerClarificationInput[];

  /** Any additional changes requested by the user. */
  requestedChanges?: string;
};
