import { JSX, useCallback } from "react";
import { FormValues } from "@/types";
import { usePromptActions } from "@/hooks/usePromptActions";
import { createFormActionContext, createFormActionGroups } from "@/components/shared/utils/action-builders";
import StandardActionPanel from "@/components/ActionPanel/StandardActionPanel";
import { usePromptActionContext } from "@/contexts/PromptActionContext";

interface FormActionsProps {
  isProcessing: boolean;
  onSubmit: () => void;
  formValues?: FormValues;
  inputText?: string;
  templateName?: string;
}

interface HandlePromptDisplayParams {
  formValues?: FormValues;
  inputText?: string;
  templateName?: string;
  createShowPromptHandler: (params: {
    formValues?: FormValues;
    inputText?: string;
    templateName?: string;
  }) => (() => JSX.Element) | undefined;
}

export default function FormActions({ isProcessing, onSubmit, formValues, inputText, templateName }: FormActionsProps) {
  // Get required context - will throw if not available (tests should mock this)
  usePromptActionContext();
  const { createShowPromptHandler } = usePromptActions();

  // Handles the prompt display logic and creates the show prompt handler
  const handlePromptDisplay = useCallback(
    ({ formValues, inputText, templateName, createShowPromptHandler }: HandlePromptDisplayParams) => {
      // Always create show prompt handler, let the action builder decide when to show it
      return createShowPromptHandler({
        formValues,
        inputText,
        templateName,
      });
    },
    []
  );

  const showPromptHandler = handlePromptDisplay({
    formValues,
    inputText,
    templateName,
    createShowPromptHandler,
  });

  const hasFormValues = Boolean(formValues && inputText);
  // Always show the prompt action - let the action system handle the conditions
  const showPromptAction = true;

  // Build action groups using the standardized system
  const actionGroups = createFormActionGroups(onSubmit, showPromptHandler || undefined, showPromptAction);

  const actionContext = createFormActionContext(
    hasFormValues,
    isProcessing,
    false // showAdvanced
  );

  const handleActionExecuted = useCallback((actionId: string) => {
    // Log action execution for analytics/debugging purposes
    console.debug(`Action executed in FormActions: ${actionId}`);
  }, []);

  return <StandardActionPanel context={actionContext} actions={actionGroups} onActionExecuted={handleActionExecuted} />;
}
