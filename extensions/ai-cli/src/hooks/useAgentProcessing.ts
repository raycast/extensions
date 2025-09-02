import { useCallback, useEffect, useRef, useState } from "react";
import { showSuccessToast } from "@/utils/toast";
import { ExtensionPreferences, FormattingVariant, FormValues } from "../types";
import { createVariantId } from "../utils/entity-operations";
import type { RunnerState } from "@/types/agent-runner";
import type { AgentProcessingParams } from "@/types";
import { cleanAgentResponse, createVariantObject, splitVariants } from "@/utils/text-processing";
import { messages } from "@/locale/en/messages";
import { useAgentErrorHandling } from "./useAgentErrorHandling";
import { useAgentRunner } from "./useAgentRunner";
import { useAgentConfig } from "./useAgentConfig";
import { usePromptActionContext } from "@/contexts/PromptActionContext";

/**
 * Manages Claude execution lifecycle events with consolidated state handling.
 */
function useExecutionLifecycle(
  currentExecution: RunnerState | null,
  isExecuting: boolean,
  executionError: Error | null,
  executionData: string | null,
  processingParams: AgentProcessingParams | null,
  additionalVariantCallback: ((variant: FormattingVariant) => void) | null,
  handlers: {
    handleExecutionStart: (execution: RunnerState) => void;
    handleExecutionError: (execution: RunnerState, error: Error) => void;
    handleRegularProcessingSuccess: (
      execution: RunnerState,
      responseData: string,
      params: AgentProcessingParams
    ) => void;
    handleAdditionalVariantSuccess: (
      execution: RunnerState,
      responseData: string,
      callback: (variant: FormattingVariant) => void
    ) => void;
    resetProcessingState: () => void;
  },
  utils: {
    handleError: (error: Error, context?: Record<string, unknown>) => void;
  }
) {
  // Handle execution start
  useEffect(() => {
    if (currentExecution && isExecuting) {
      handlers.handleExecutionStart(currentExecution);
    }
  }, [currentExecution, isExecuting, handlers.handleExecutionStart]);

  // Handle execution errors
  useEffect(() => {
    if (currentExecution && executionError) {
      handlers.handleExecutionError(currentExecution, executionError);
    }
  }, [currentExecution, executionError, handlers.handleExecutionError]);

  // Handle execution success
  useEffect(() => {
    if (!currentExecution || !executionData) return;

    try {
      const cleanedResponse = cleanAgentResponse(executionData);

      if (currentExecution.isAdditionalVariant && additionalVariantCallback) {
        handlers.handleAdditionalVariantSuccess(currentExecution, cleanedResponse, additionalVariantCallback);
      } else if (processingParams) {
        handlers.handleRegularProcessingSuccess(currentExecution, cleanedResponse, processingParams);
      }
    } catch (parseError) {
      utils.handleError(parseError as Error, {
        executionId: currentExecution.executionId,
        operation: "parsing",
        responsePreview: executionData.substring(0, 200),
      });
    }

    handlers.resetProcessingState();
  }, [
    currentExecution,
    executionData,
    additionalVariantCallback,
    processingParams,
    handlers.handleAdditionalVariantSuccess,
    handlers.handleRegularProcessingSuccess,
    handlers.resetProcessingState,
    utils.handleError,
  ]);
}

interface UseAgentProcessingReturn {
  isProcessing: boolean;
  processText: (params: AgentProcessingParams) => void;
  processFollowUp: (params: AgentProcessingParams, onVariant: (variant: FormattingVariant) => void) => void;
  processingParams: {
    expandedAgentPath: string;
    workingDir: string;
  };
}

/**
 * Manages agent processing lifecycle with error recovery and variant generation.
 * Handles execution state, progress tracking, and result processing.
 */
export function useAgentProcessing(
  agentId: string,
  preferences: ExtensionPreferences,
  onSuccess: (variants: FormattingVariant[], formatName: string, formValues: FormValues, inputText: string) => void
): UseAgentProcessingReturn {
  const { getTemplateById } = usePromptActionContext();
  const { handleError, categorizeError } = useAgentErrorHandling();
  const { config: agentConfig } = useAgentConfig(preferences, agentId);

  // Simple state instead of complex reducer
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentExecution, setCurrentExecution] = useState<RunnerState | null>(null);
  const [processingParams, setProcessingParams] = useState<AgentProcessingParams | null>(null);
  const additionalVariantCallbackRef = useRef<((variant: FormattingVariant) => void) | null>(null);
  // Persist the conversation/session id across follow-ups
  const sessionIdRef = useRef<string | null>(null);
  // Persist working directory across follow-ups
  const workingDirRef = useRef<string | undefined>(undefined);
  // Guard to prevent duplicate initial executions (e.g., StrictMode double-invoke)
  const hasActivePrimaryRef = useRef(false);

  const targetFolder = processingParams?.values.targetFolder || workingDirRef.current;

  const { createExecutionState, executeCommand, executionData, executionError, isExecuting } = useAgentRunner(
    agentConfig.agentId,
    preferences,
    currentExecution,
    targetFolder
  );

  // Helper to reset all processing state
  const resetProcessingState = useCallback(() => {
    // Stop processing and clear all execution-related state to avoid unintended re-runs
    setIsProcessing(false);
    setProcessingParams(null);
    setCurrentExecution(null);
    additionalVariantCallbackRef.current = null;
    hasActivePrimaryRef.current = false;
  }, []);

  // Execution event handlers
  const handleExecutionStart = useCallback((execution: RunnerState) => {
    setIsProcessing(true);

    // For a top-level turn, always capture the session id actually used
    if (!execution.isAdditionalVariant) {
      sessionIdRef.current = execution.executionId;
    }
  }, []);

  // Helper function to create error variants
  const createErrorVariant = useCallback(
    (originalInput: string, error: Error, index = 0): FormattingVariant => ({
      id: createVariantId(),
      content: "",
      index,
      originalInput,
      error: categorizeError(error, { operation: "execution" }),
    }),
    [categorizeError]
  );

  // Handle errors for additional variants (follow-up processing)
  const handleAdditionalVariantError = useCallback(
    (execution: RunnerState, error: Error) => {
      if (!additionalVariantCallbackRef.current) return false;

      const errorVariant = createErrorVariant(execution.originalPrompt || "", error);
      additionalVariantCallbackRef.current(errorVariant);
      additionalVariantCallbackRef.current = null;
      return true;
    },
    [createErrorVariant]
  );

  // Handle errors for regular processing
  const handleRegularProcessingError = useCallback(
    (error: Error) => {
      if (!processingParams) return false;

      const errorVariant = createErrorVariant(processingParams.inputText, error);
      const formatName = getTemplateById(processingParams.values.template)?.name || "Unknown Format";
      onSuccess([errorVariant], formatName, processingParams.values, processingParams.inputText);
      setProcessingParams(null);
      return true;
    },
    [processingParams, createErrorVariant, getTemplateById, onSuccess]
  );

  const handleExecutionError = useCallback(
    (execution: RunnerState, error: Error) => {
      // Try handling as additional variant error first
      if (execution.isAdditionalVariant && handleAdditionalVariantError(execution, error)) {
        resetProcessingState();
        return;
      }

      // Try handling as regular processing error
      if (handleRegularProcessingError(error)) {
        resetProcessingState();
        return;
      }

      // Fallback: show toast error if no callback available
      handleError(error, {
        executionId: execution.executionId,
        isAdditionalVariant: execution.isAdditionalVariant,
        operation: "execution",
      });

      resetProcessingState();
    },
    [handleAdditionalVariantError, handleRegularProcessingError, handleError, resetProcessingState]
  );

  const handleAdditionalVariantSuccess = useCallback(
    (execution: RunnerState, responseData: string, callback: (variant: FormattingVariant) => void) => {
      const newVariant = createVariantObject(responseData, 0, undefined, execution.originalPrompt);
      showSuccessToast(messages.toast.processingComplete);
      callback(newVariant);
      additionalVariantCallbackRef.current = null;
    },
    []
  );

  const handleRegularProcessingSuccess = useCallback(
    (execution: RunnerState, responseData: string, params: AgentProcessingParams) => {
      const variants = splitVariants(responseData, params.inputText, execution.originalPrompt);

      const formatName = getTemplateById(params.values.template)?.name || "";

      showSuccessToast(messages.toast.processingComplete);

      onSuccess(variants, formatName, params.values, params.inputText);
      setProcessingParams(null);
    },
    [getTemplateById, onSuccess]
  );

  // Consolidated execution lifecycle management
  useExecutionLifecycle(
    currentExecution,
    isExecuting,
    executionError,
    executionData,
    processingParams,
    additionalVariantCallbackRef.current,
    {
      handleExecutionStart,
      handleExecutionError,
      handleRegularProcessingSuccess,
      handleAdditionalVariantSuccess,
      resetProcessingState,
    },
    {
      handleError,
    }
  );

  const processFollowUp = useCallback(
    (params: AgentProcessingParams, onVariant: (variant: FormattingVariant) => void) => {
      additionalVariantCallbackRef.current = onVariant;
      // Reuse the original session id so the agent can continue the conversation
      const baseSessionId = sessionIdRef.current || currentExecution?.executionId;
      const executionState = createExecutionState(params, true, true, baseSessionId);
      setCurrentExecution(executionState);
      executeCommand(executionState);
    },
    [createExecutionState, executeCommand, currentExecution]
  );

  const processText = useCallback(
    (params: AgentProcessingParams) => {
      // Prevent duplicate auto-starts from StrictMode or quick double invokes
      if (hasActivePrimaryRef.current) {
        return;
      }
      hasActivePrimaryRef.current = true;

      // New top-level prompt starts a fresh session
      sessionIdRef.current = null;
      // Persist chosen working directory for follow-ups
      workingDirRef.current = params.values.targetFolder || agentConfig.workingDir;
      setProcessingParams(params);
      const executionState = createExecutionState(params, false, false);
      setCurrentExecution(executionState);
      executeCommand(executionState);
    },
    [createExecutionState, executeCommand, agentConfig.workingDir]
  );

  return {
    isProcessing,
    processText,
    processFollowUp,
    processingParams: {
      expandedAgentPath: agentConfig.expandedAgentPath,
      workingDir: agentConfig.workingDir,
    },
  };
}
