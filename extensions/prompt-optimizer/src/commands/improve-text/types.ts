import type { LLMRequestErrorState } from "shared/hooks/useLLMRequest";

export type ImproveTextFormValues = {
  sourceText: string;
  instructions?: string;
  tone?: string;
  disableAgentStyleFormatting: boolean;
};

export type ImproveTextFormErrorState = LLMRequestErrorState;

export type TextImproverResponseDTO = {
  ok: boolean;
  improvedText: string;
};
