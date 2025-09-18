import { useCallback, useEffect } from "react";
import { Form, getPreferenceValues } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { ExtensionPreferences, FormValues, ModelType, TemplateType, ToneType } from "@/types";
import { MANAGEMENT_CONFIG } from "@/constants";
import { useClipboard } from "@/hooks/useClipboard";
import { useCustomTones } from "@/hooks/useCustomTones";
import { CustomTemplate, useCustomTemplates } from "@/hooks/useCustomTemplates";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { validateTargetFolder } from "@/utils/validation";
import { messages } from "@/locale/en/messages";
import { getAgent } from "@/agents";
import FormActions from "./components/FormActions";
import TemplateDropdown from "./components/TemplateDropdown";
import ModelDropdown from "./components/ModelDropdown";
import AgentDropdown from "./components/AgentDropdown";
import ToneDropdown from "@/components/TemplateForm/components/ToneDropdown";

interface TemplateFormProps {
  onSubmit: (formValues: FormValues, inputText: string, templateName: string) => void;
  // Optional injection to share the same templates state as parent (prevents stale reads)
  injectedTemplates?: CustomTemplate[];
  onTemplatesPop?: () => void;
}

/**
 * TemplateForm is the main form component for text formatting configuration.
 * It provides a comprehensive interface for users to input text and configure
 * formatting options including templates, writing tones, AI models,
 * and output settings.
 *
 * Key features:
 * - Automatic clipboard text integration
 * - Persistent form state across sessions
 * - Validation for required fields and folder paths
 * - Dynamic dropdown management for custom templates and tones
 */
export default function TemplateForm({ onSubmit, injectedTemplates, onTemplatesPop }: TemplateFormProps) {
  const preferences = getPreferenceValues<ExtensionPreferences>();

  // Hooks for data and state
  const { clipboardText } = useClipboard();
  const { allTones, refreshTones } = useCustomTones();
  // Prefer injected templates from parent to ensure a single source of truth across navigation
  const templatesHook = useCustomTemplates();
  const allTemplates = injectedTemplates ?? templatesHook.allTemplates;
  const refreshTemplates = onTemplatesPop ?? templatesHook.refreshTemplates;
  const {
    initialAgent,
    initialTemplate,
    initialTone,
    initialModel,
    initialTargetFolder,
    setLastAgent,
    setLastTemplate,
    setLastTone,
    setLastModel,
    setLastTargetFolder,
  } = useFormPersistence({ preferences });

  // Get template name for navigation (inlined from helper)
  const getTemplateNameWithContext = useCallback(
    (templateId: string) => {
      const template = allTemplates.find((f) => f.id === templateId);
      return template?.name || messages.templateForm.unknownTemplate;
    },
    [allTemplates]
  );

  // Form submission handler for useForm
  const handleFormSubmit = useCallback(
    (values: FormValues) => {
      if (!values.textInput?.trim()) return;

      const templateName = getTemplateNameWithContext(values.template);
      onSubmit(values, values.textInput, templateName);
    },
    [onSubmit, getTemplateNameWithContext]
  );

  // Form state
  const {
    handleSubmit: formHandleSubmit,
    itemProps,
    setValue,
    values,
    setValidationError,
  } = useForm<FormValues>({
    onSubmit: handleFormSubmit,
    initialValues: {
      selectedAgent: initialAgent,
      template: initialTemplate,
      tone: initialTone,
      model: initialModel,
      targetFolder: initialTargetFolder,
      textInput: "",
      additionalContext: "",
    },
    validation: {
      selectedAgent: (value) => {
        if (!value) return "Please select an AI agent";
        return undefined;
      },
      template: (value) => {
        if (!value || value.startsWith(MANAGEMENT_CONFIG.MANAGE_PREFIX)) return undefined;
        return undefined;
      },
      tone: (value) => {
        if (!value || value.startsWith(MANAGEMENT_CONFIG.MANAGE_PREFIX)) return undefined;
        return undefined;
      },
      model: (value) => {
        if (!value || value.startsWith(MANAGEMENT_CONFIG.MANAGE_PREFIX)) return undefined;
        return undefined;
      },
      targetFolder: validateTargetFolder,
      textInput: (value) => {
        if (!value || value.trim().length === 0) {
          return messages.validation.emptyText;
        }
        return undefined;
      },
    },
  });

  // Synchronize clipboard text with form input
  useEffect(() => {
    if (clipboardText && setValue) {
      setValue("textInput", clipboardText);
    }
  }, [clipboardText, setValue]);

  // Persist form state for non-management values
  useEffect(() => {
    if (values.selectedAgent && setLastAgent) {
      setLastAgent(values.selectedAgent);
    }
    if (!values.template?.startsWith(MANAGEMENT_CONFIG.MANAGE_PREFIX) && setLastTemplate) {
      setLastTemplate(values.template as TemplateType);
    }
    if (!values.tone?.startsWith(MANAGEMENT_CONFIG.MANAGE_PREFIX) && setLastTone) {
      setLastTone(values.tone);
    }
    if (!values.model?.startsWith(MANAGEMENT_CONFIG.MANAGE_PREFIX) && setLastModel) {
      setLastModel(values.model as ModelType);
    }
    if (setLastTargetFolder) {
      setLastTargetFolder(values.targetFolder || "");
    }
  }, [
    values.selectedAgent,
    values.template,
    values.tone,
    values.model,
    values.targetFolder,
    setLastAgent,
    setLastTemplate,
    setLastTone,
    setLastModel,
    setLastTargetFolder,
  ]);

  // Refresh data when component mounts
  useEffect(() => {
    if (refreshTemplates) refreshTemplates();
    if (refreshTones) refreshTones();
  }, []);

  const getTemplateName = () => {
    if (!values.template) return undefined;
    const template = allTemplates.find((f) => f.id === values.template);
    return template?.name || messages.templateForm.unknownTemplate;
  };

  return (
    <Form
      actions={
        <FormActions
          isProcessing={false}
          onSubmit={() => formHandleSubmit(values)}
          formValues={values}
          inputText={values.textInput}
          templateName={getTemplateName()}
        />
      }
    >
      <Form.FilePicker
        id={itemProps.targetFolder.id}
        title={messages.ui.form.targetFolderTitle}
        info={messages.ui.form.targetFolderHint}
        canChooseDirectories={true}
        canChooseFiles={false}
        allowMultipleSelection={false}
        value={values.targetFolder ? [values.targetFolder] : []}
        onChange={(paths) => setValue("targetFolder", paths[0] || "")}
        error={itemProps.targetFolder.error}
      />

      <TemplateDropdown
        allTemplates={allTemplates}
        value={itemProps.template.value || ""}
        error={itemProps.template.error}
        onChange={(value) => setValue("template", value as TemplateType)}
        onValidationError={setValidationError}
        onManagePop={refreshTemplates}
      />

      <Form.TextArea
        title={messages.ui.textInput.title}
        info={messages.ui.textInput.hint}
        placeholder={
          clipboardText ? messages.ui.textInput.placeholderWithClipboard : messages.ui.textInput.placeholderEmpty
        }
        {...itemProps.textInput}
      />

      <Form.TextArea
        title={messages.ui.additionalContext.title}
        info={messages.ui.additionalContext.hint}
        placeholder={messages.ui.additionalContext.placeholder}
        {...itemProps.additionalContext}
      />

      <AgentDropdown
        value={values.selectedAgent || ""}
        error={itemProps.selectedAgent.error}
        onChange={(agentId) => {
          setValue("selectedAgent", agentId);
          // Reset model when agent changes
          const agent = getAgent(agentId);
          const defaultModel = Object.values(agent.models)[0]?.displayName || "";
          setValue("model", defaultModel);
        }}
      />

      <ModelDropdown
        agentId={values.selectedAgent}
        value={values.model || ""}
        error={itemProps.model.error}
        onChange={(value) => setValue("model", value as ModelType)}
      />

      <ToneDropdown
        allTones={allTones}
        value={itemProps.tone.value || ""}
        error={itemProps.tone.error}
        onChange={(value) => setValue("tone", value as ToneType)}
        onValidationError={setValidationError}
        onManagePop={refreshTones}
      />
    </Form>
  );
}
