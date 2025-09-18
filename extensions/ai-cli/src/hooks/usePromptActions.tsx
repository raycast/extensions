import { JSX, useCallback } from "react";
import { FormValues } from "@/types";
import { usePromptActionContext } from "@/contexts/PromptActionContext";
import PromptDetailView from "@/components/PromptDetailView/PromptDetailView";

export interface PromptActionParams {
  formValues?: FormValues;
  inputText?: string;
  templateName?: string;
  isFollowUp?: boolean;
}

export interface PromptActionResult {
  createShowPromptHandler: (params: PromptActionParams) => (() => JSX.Element) | undefined;
  canShowPrompt: (params: PromptActionParams) => boolean;
}

/**
 * Creates reusable prompt viewing functionality with standardized action handlers.
 * Uses PromptActionContext for dependencies and provides utilities for prompt actions.
 */
export function usePromptActions(): PromptActionResult {
  const { getToneById, getTemplateById, maxLength } = usePromptActionContext();

  const canShowPrompt = useCallback((params: PromptActionParams): boolean => {
    return Boolean(params.formValues && params.inputText && params.templateName);
  }, []);

  const createShowPromptHandler = useCallback(
    (params: PromptActionParams): (() => JSX.Element) | undefined => {
      if (!canShowPrompt(params)) {
        return undefined;
      }

      return () => (
        <PromptDetailView
          formValues={params.formValues!}
          inputText={params.inputText!}
          maxLength={maxLength}
          isFollowUp={params.isFollowUp}
          getToneById={getToneById}
          getTemplateById={getTemplateById}
        />
      );
    },
    [canShowPrompt, maxLength, getToneById, getTemplateById]
  );

  return {
    createShowPromptHandler,
    canShowPrompt,
  };
}
