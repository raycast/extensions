import { useCallback, useEffect, useState } from "react";
import { getPreferenceValues, List } from "@raycast/api";
import { ExtensionPreferences, FormattingVariant, FormValues } from "@/types";
import { usePromptActions } from "@/hooks/usePromptActions";
import { useAgentProcessing } from "@/hooks/useAgentProcessing";
import { createVariantId } from "@/utils/entity-operations";
import EmptyState from "./EmptyState";
import VariantListItems from "./VariantListItems";
import { useFollowUpProcessor } from "./useFollowUpProcessor";
import { messages } from "@/locale/en/messages";

interface ResultsListProps {
  formValues: FormValues;
  inputText: string;
  templateName: string;
}

/**
 * ResultsList Component
 *
 * A comprehensive list view component that displays formatted text variants from Claude AI processing.
 * This component handles the complete lifecycle of text formatting including initial processing,
 * follow-up question handling, additional variant generation, and result display.
 *
 * Key Features:
 * - Automatic processing initialization on mount
 * - Follow-up question processing with search bar integration
 * - Additional variant generation capabilities
 * - Real-time loading states and error handling
 * - Dynamic navigation titles based on results count
 * - Detailed markdown rendering for each variant
 * - Action panels with copy, regenerate, and prompt viewing capabilities
 */
export default function ResultsList({ formValues, inputText, templateName }: ResultsListProps) {
  const preferences = getPreferenceValues<ExtensionPreferences>();

  // Internal state management - variants displayed with newest at top
  const [variants, setVariants] = useState<FormattingVariant[]>(() => [
    {
      id: createVariantId("placeholder"),
      content: "", // Empty content = loading state
      index: 0,
      originalInput: inputText,
    },
  ]);
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();

  // Handle successful processing results - supports both initial processing and variant addition
  const handleProcessingSuccess = useCallback((processedVariants: FormattingVariant[]) => {
    setVariants(processedVariants);
  }, []);

  // Handle variant addition/update and selection for follow-up processing
  const handleVariantAdded = useCallback((variant: FormattingVariant, shouldUpdate = false) => {
    setVariants((prev) => {
      if (shouldUpdate) {
        // Update existing variant with same ID
        return prev.map((v) => (v.id === variant.id ? variant : v));
      }
      // Add new variant to top (newest first)
      return [variant, ...prev];
    });
    setSelectedItemId(variant.id);
  }, []);

  // Initialize Claude processing hook
  const { isProcessing, processText, processFollowUp } = useAgentProcessing(
    formValues.selectedAgent,
    preferences,
    handleProcessingSuccess
  );

  // Initialize follow-up processing hook
  const { isProcessingFollowUp, processFollowUp: processFollowUpQuestion } = useFollowUpProcessor({
    formValues,
    processFollowUpWithAgent: processFollowUp,
    onVariantAdded: handleVariantAdded,
  });

  // Auto-start processing on mount - only run once to prevent infinite loop
  useEffect(() => {
    const params = {
      values: formValues,
      inputText,
    };
    processText(params);
  }, []); // Intentionally empty - we only want to run this once on mount

  // Create action handlers using the prompt actions hook
  const { createShowPromptHandler } = usePromptActions();

  // Handle follow-up question text change (simplified - no Enter detection)
  const handleFollowUpQuestionChange = useCallback((text: string) => {
    setFollowUpQuestion(text);
  }, []);

  // Handle follow-up question submission
  const handleFollowUpSubmission = useCallback(async () => {
    const question = followUpQuestion.trim();
    if (question) {
      // Create placeholder variant immediately for loading state
      const placeholderVariant: FormattingVariant = {
        id: createVariantId(),
        content: "", // Empty content = loading state
        index: 0,
        originalInput: question,
      };

      // Add placeholder variant to show loading immediately
      handleVariantAdded(placeholderVariant);

      // Process the follow-up (which will update the placeholder with actual content)
      await processFollowUpQuestion(question, placeholderVariant.id);
      setFollowUpQuestion("");
    }
  }, [followUpQuestion, processFollowUpQuestion, handleVariantAdded]);

  const showPromptHandler =
    formValues && inputText
      ? createShowPromptHandler({
          formValues,
          inputText,
          templateName,
        })
      : undefined;

  const showFollowUpHandler = followUpQuestion.trim() ? handleFollowUpSubmission : undefined;

  const hasVariants = variants.length > 0;
  const isGenerating = isProcessing || isProcessingFollowUp;

  return (
    <List
      isLoading={isGenerating}
      isShowingDetail={hasVariants}
      filtering={false}
      searchText={followUpQuestion}
      onSearchTextChange={handleFollowUpQuestionChange}
      searchBarPlaceholder={!isGenerating ? messages.followUp.searchPlaceholder : ""}
      selectedItemId={selectedItemId}
    >
      {variants.length === 0 ? (
        <EmptyState isLoading={isProcessing || isProcessingFollowUp} />
      ) : (
        <VariantListItems variants={variants} onGenerate={showFollowUpHandler} onShowPrompt={showPromptHandler} />
      )}
    </List>
  );
}
