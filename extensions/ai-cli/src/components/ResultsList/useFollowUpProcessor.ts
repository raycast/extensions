import { useCallback, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import type { AgentProcessingParams } from "@/types";
import { FormattingVariant, FormValues } from "@/types";
import { TEMPLATE_TYPES, TONE_TYPES } from "@/constants";
import { createVariantId } from "@/utils/entity-operations";
import { messages } from "@/locale/en/messages";

import { useAgentErrorHandling } from "@/hooks/useAgentErrorHandling";

interface UseFollowUpProcessorProps {
  formValues: FormValues;
  processFollowUpWithAgent: (params: AgentProcessingParams, onVariant: (variant: FormattingVariant) => void) => void;
  onVariantAdded: (variant: FormattingVariant, shouldUpdate?: boolean) => void;
}

interface UseFollowUpProcessorReturn {
  isProcessingFollowUp: boolean;
  processFollowUp: (question: string, placeholderVariantId?: string) => Promise<void>;
}

/**
 * Custom hook for handling follow-up question processing
 *
 * Manages the state and logic for processing follow-up questions using Claude AI.
 * Handles the conversion of questions to processing parameters, manages loading states,
 * and provides success/error feedback to users.
 *
 * @param props - Hook configuration including form values and callback functions
 * @returns Object containing processing state and the processFollowUp function
 */
export function useFollowUpProcessor({
  formValues,
  processFollowUpWithAgent,
  onVariantAdded,
}: UseFollowUpProcessorProps): UseFollowUpProcessorReturn {
  const [isProcessingFollowUp, setIsProcessingFollowUp] = useState(false);
  const { categorizeError } = useAgentErrorHandling();

  const processFollowUp = useCallback(
    async (question: string, placeholderVariantId?: string) => {
      if (!question.trim()) {
        return;
      }

      setIsProcessingFollowUp(true);

      try {
        // Create simple follow-up params using direct question.
        // Session resume via -r is handled inside useAgentProcessing; no local history needed.
        const followUpParams: AgentProcessingParams = {
          values: {
            template: TEMPLATE_TYPES.CUSTOM,
            tone: TONE_TYPES.DEFAULT, // Use DEFAULT tone for follow-up
            selectedAgent: formValues.selectedAgent,
            model: formValues.model, // Use same model as original message
            textInput: question, // Direct question - no manual context building needed
            additionalContext: "",
            // Preserve the original working directory to keep the same session context
            targetFolder: formValues.targetFolder,
          },
          inputText: question,
        };

        // Handle follow-up success - update placeholder or add new variant
        const handleFollowUpSuccess = (newVariant: FormattingVariant) => {
          const variantWithOriginalInput = {
            ...newVariant,
            id: placeholderVariantId || createVariantId(),
            originalInput: question,
          };

          if (placeholderVariantId) {
            // Update existing placeholder variant
            onVariantAdded(variantWithOriginalInput, true);
          } else {
            // Add new variant to top of list (newest first) - fallback behavior
            onVariantAdded(variantWithOriginalInput);
          }

          setIsProcessingFollowUp(false);

          // Show success toast only if the variant doesn't have an error
          if (!newVariant.error) {
            showToast({
              style: Toast.Style.Success,
              title: messages.followUp.processedTitle,
              message: messages.followUp.processedMessage,
            });
          }
        };

        // Process follow-up with agent
        processFollowUpWithAgent(followUpParams, handleFollowUpSuccess);
      } catch (error) {
        // Create error variant using centralized error handling
        const categorizedError = categorizeError(error as Error, {
          operation: "processing",
        });

        const errorVariant: FormattingVariant = {
          id: placeholderVariantId || createVariantId(),
          content: "",
          index: 0,
          originalInput: question,
          error: categorizedError,
        };

        if (placeholderVariantId) {
          // Update existing placeholder with error information
          onVariantAdded(errorVariant, true);
        } else {
          // Add new error variant to list
          onVariantAdded(errorVariant);
        }

        setIsProcessingFollowUp(false);
      }
    },
    [processFollowUpWithAgent, formValues.model, formValues.selectedAgent, onVariantAdded, categorizeError]
  );

  return {
    isProcessingFollowUp,
    processFollowUp,
  };
}
