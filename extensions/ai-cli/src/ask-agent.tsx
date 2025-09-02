import { useCallback } from "react";
import { getPreferenceValues, useNavigation } from "@raycast/api";
import { ExtensionPreferences, FormValues } from "./types";
import TemplateForm from "./components/TemplateForm/TemplateForm";
import ResultsList from "./components/ResultsList/ResultsList";
import { useCustomTones } from "./hooks/useCustomTones";
import { useCustomTemplates } from "./hooks/useCustomTemplates";
import { INPUT_LIMITS } from "@/constants";
import { PromptActionProvider } from "./contexts/PromptActionContext";
import { validateFormValues } from "./utils/validation";
import { showFailureToast } from "./utils/toast";
import { messages } from "./locale/en/messages";
import { useAgentConfig } from "@/hooks/useAgentConfig";

export default function Command() {
  const { push } = useNavigation();
  const { getToneById } = useCustomTones();
  const { getTemplateById, allTemplates, refreshTemplates } = useCustomTemplates();
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const { config: agentConfig } = useAgentConfig(preferences);

  const maxLength = INPUT_LIMITS.MAX_TEXT_LENGTH;

  // Single navigation handler with validation
  const handleNavigate = useCallback(
    (formValues: FormValues, inputText: string, templateName: string) => {
      // Check system configuration (paths, shell, etc.)
      if (!agentConfig.isValid) {
        const errorMsg = agentConfig.errors[0] || messages.validation.systemConfigurationError;
        showFailureToast("Configuration Error", errorMsg);
        return;
      }

      // Check form values
      const formError = validateFormValues(formValues);
      if (formError) {
        showFailureToast("Invalid Input", formError);
        return;
      }

      // All validation passed, navigate to results
      push(
        <PromptActionProvider
          getToneById={getToneById}
          getTemplateById={getTemplateById}
          maxLength={INPUT_LIMITS.MAX_TEXT_LENGTH}
        >
          <ResultsList formValues={formValues} inputText={inputText} templateName={templateName} />
        </PromptActionProvider>
      );
    },
    [push, getToneById, getTemplateById, maxLength, agentConfig.isValid, agentConfig.errors, allTemplates]
  );

  return (
    <PromptActionProvider getToneById={getToneById} getTemplateById={getTemplateById} maxLength={maxLength}>
      <TemplateForm onSubmit={handleNavigate} injectedTemplates={allTemplates} onTemplatesPop={refreshTemplates} />
    </PromptActionProvider>
  );
}
